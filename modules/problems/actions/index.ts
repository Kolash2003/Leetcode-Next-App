"use server"
import { getCurrentUserDetails } from "@/modules/auth/actions"
import { prisma } from "@/lib/db"
import { runCodeOnEvaluator, normalizeLanguage, getLanguageDisplayName } from "@/lib/evaluation";
import { enqueueSubmission } from "@/lib/queue";
import { checkRateLimit, codeExecutionLimiter } from "@/lib/rate-limit";

export const getAllProblems = async () => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated"
            }
        }

        const problems = await prisma.problem.findMany({
            include: {
                solvedBy: {
                    where: { userId: user.id },
                },
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return {
            success: true,
            data: problems
        }
    } catch (error) {
        console.error("Error fetching problems: ", error);
        return {
            success: false,
            error: "Failed to fetch problems"
        }
    }
}

export const getProblemById = async (id: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated"
            }
        }

        const probelm = await prisma.problem.findUnique({
            where: {
                id
            },
            // Never send reference solutions or the grading test cases to the client.
            omit: {
                referenceSolutions: true,
                testCases: true,
            },
        })

        if (!probelm) {
            return {
                success: false,
                error: "Problem not found"
            }
        }

        return {
            success: true,
            data: probelm
        }

    } catch (error) {
        console.error("Error fetching problem:", error)
        return {
            success: false,
            error: "Failed to fetch problem"
        }
    }
}

const STATUS_DISPLAY: Record<string, string> = {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
};

/**
 * Runs code against the problem's test cases inside the evaluation service's
 * Docker containers and returns the results. Nothing is persisted, so this is
 * safe for the "Run" button.
 */
export const executeCode = async (
    problemId: string,
    code: string,
    language: string
) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated"
            }
        }

        if (!code || !code.trim()) {
            return {
                success: false,
                error: "Code cannot be empty"
            }
        }

        const { success: withinLimit } = await checkRateLimit(codeExecutionLimiter, user.id);
        if (!withinLimit) {
            return {
                success: false,
                error: "Too many requests. Please slow down."
            }
        }

        const normalizedLanguage = normalizeLanguage(language);
        if (!normalizedLanguage) {
            return {
                success: false,
                error: "Unsupported language"
            }
        }

        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
        });

        if (!problem) {
            return {
                success: false,
                error: "Problem not found"
            }
        }

        const testcases = (problem.testCases as { input: string; output: string }[]) || [];

        if (!Array.isArray(testcases) || testcases.length === 0) {
            return {
                success: false,
                error: "Problem has no test cases"
            }
        }

        const res = await runCodeOnEvaluator({
            code,
            language: normalizedLanguage,
            testcases,
        });

        if (!res.success || !res.results) {
            return {
                success: false,
                error: res.error || "Failed to run code"
            }
        }

        return {
            success: true,
            submission: {
                id: `run-${Date.now()}`,
                status: STATUS_DISPLAY[res.status ?? ""] ?? "Wrong Answer",
                createdAt: new Date().toISOString(),
                language: getLanguageDisplayName(normalizedLanguage),
                memory: JSON.stringify(res.results.map((r) => r.memory ?? null)),
                time: JSON.stringify(res.results.map((r) => r.time ?? null)),
                testCases: res.results.map((r) => ({
                    id: `run-${r.testCase}`,
                    testCase: r.testCase,
                    passed: r.passed,
                    stdout: r.stdout,
                    expected: r.expected,
                    stderr: r.stderr,
                    status: r.status,
                    memory: r.memory,
                    time: r.time,
                })),
            },
        };

    } catch (error) {
        console.error("Error running code:", error);
        return {
            success: false,
            error: "Failed to run code"
        }
    }
}

/**
 * Validates a submission, persists it as Pending and enqueues it for the
 * evaluation service. Returns immediately — results are delivered later via
 * the evaluation callback endpoint and surfaced through polling.
 */
export const submitCode = async (problemId: string, code: string, language: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return { success: false, error: "User not authenticated" }
        }

        if (!code || !code.trim()) {
            return { success: false, error: "Code cannot be empty" }
        }

        const normalizedLanguage = normalizeLanguage(language);
        if (!normalizedLanguage) {
            return { success: false, error: "Unsupported language" }
        }

        const { success: withinLimit } = await checkRateLimit(codeExecutionLimiter, user.id);
        if (!withinLimit) {
            return { success: false, error: "Too many requests. Please slow down." }
        }

        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
        })

        if (!problem) {
            return { success: false, error: "Problem not found" }
        }

        const testCases = (problem.testCases as { input: string; output: string }[]) || []

        if (!Array.isArray(testCases) || testCases.length === 0) {
            return { success: false, error: "Problem has no test cases" }
        }

        const submission = await prisma.submission.create({
            data: {
                userId: user.id,
                probelemId: problemId,
                sourceCode: code,
                language: getLanguageDisplayName(normalizedLanguage),
                stdin: testCases.map((tc) => tc.input).join("\n"),
                status: "Pending",
            },
        })

        try {
            await enqueueSubmission({
                submissionId: submission.id,
                code,
                language: normalizedLanguage,
                problem: {
                    id: problem.id,
                    testcases: testCases,
                },
            })
        } catch (enqueueError) {
            console.error("Failed to enqueue submission:", enqueueError);
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: "Wrong Answer" },
            })
            return { success: false, error: "Failed to queue submission" }
        }

        return { success: true, submissionId: submission.id }

    } catch (error) {
        console.error("Error submitting code:", error)
        return { success: false, error: "Failed to submit code" }
    }
}

export const getSubmissionById = async (submissionId: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return { success: false, error: "User not authenticated", data: null }
        }

        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                userId: user.id,
            },
            include: {
                testCases: true,
            },
        })

        if (!submission) {
            return { success: false, error: "Submission not found", data: null }
        }

        return { success: true, data: submission }

    } catch (error) {
        console.error("Error fetching submission:", error)
        return { success: false, error: "Failed to fetch submission", data: null }
    }
}

export const getAllSubmissionByCurrentUserForProblem = async (problemId: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated",
                data: [],
            }
        }

        const submissions = await prisma.submission.findMany({
            where: {
                userId: user.id,
                probelemId: problemId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return {
            success: true,
            data: submissions,
        }
    } catch (error) {
        console.error("Error fetching submission history:", error);
        return {
            success: false,
            error: "Failed to fetch submission history",
            data: [],
        }
    }
}

export const deleteProblem = async (id: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated",
            }
        }

        if (user.role !== "ADMIN") {
            return {
                success: false,
                error: "Unauthorized: Only admins can delete problems",
            }
        }

        // Delete related records first, then the problem
        await prisma.$transaction([
            prisma.testCaseResult.deleteMany({
                where: {
                    submission: {
                        probelemId: id,
                    },
                },
            }),
            prisma.submission.deleteMany({
                where: { probelemId: id },
            }),
            prisma.problemSolved.deleteMany({
                where: { problemId: id },
            }),
            prisma.problem.delete({
                where: { id },
            }),
        ]);

        return {
            success: true,
        }
    } catch (error) {
        console.error("Error deleting problem:", error);
        return {
            success: false,
            error: "Failed to delete problem",
        }
    }
}
