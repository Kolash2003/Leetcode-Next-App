"use server"
import { getCurrentUserDetails } from "@/modules/auth/actions"
import { prisma } from "@/lib/db"
import { pollBatchResults, submitBatch, getLanguageName } from "@/lib/judge0";
import { enqueueSubmission } from "@/lib/queue";

export const getAllProblems = async () => {
    try {
        const user = await getCurrentUserDetails();

        const problems = await prisma.problem.findMany({
            include: {
                solvedBy: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

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

        const probelm = await prisma.problem.findUnique({
            where: {
                id
            }
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

export const executeCode = async (
    source_code: string,
    langauge_id: number,
    stdin: string[],
    expected_output: string[],
    id: string
) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return {
                success: false,
                error: "User not authenticated"
            }
        }

        if (!Array.isArray(stdin) || stdin.length === 0 || !Array.isArray(expected_output) || expected_output.length !== stdin.length) {
            return {
                success: false,
                error: "Invalid test cases"
            }
        }

        const submissions = stdin.map((input: string) => ({
            source_code,
            langauge_id,
            stdin: input,
            base64_encoded: false,
            wait: false
        }))

        const submitResponse = await submitBatch(submissions);

        const tokens = submitResponse.map((res: { token: string }) => res.token)

        const results = await pollBatchResults(tokens);

        let allPassed = true;

        const detailedResults = results.map((result: any, i: number) => {
            const stdout = result.stdout || null;
            const expectedOut = expected_output[i]?.trim();
            const passed = stdout === expectedOut;

            if (!passed) {
                allPassed = false;
            }

            return {
                testCase: i + 1,
                passed,
                stdout,
                expected: expectedOut,
                stderr: result.stderr || null,
                compile_output: result.compile_output || null,
                status: result.status.description,
                memory: result.memory ? `${result.memory} KB` : undefined,
                time: result.time ? `${result.time} s` : undefined,
            }
        })

        const submission = await prisma.submission.create({
            data: {
                userId: user.id,
                probelemId: id,
                sourceCode: source_code,
                language: getLanguageName(langauge_id),
                stdin: stdin.join("\n"),
                stdout: JSON.stringify(detailedResults.map((r: any) => r.stdout)),
                stderr: detailedResults.some((r: any) => r.stderr)
                    ? JSON.stringify(detailedResults.map((r: any) => r.stderr))
                    : null,
                compileOutput: detailedResults.some((r: any) => r.compile_output)
                    ? JSON.stringify(detailedResults.map((r: any) => r.compile_output))
                    : null,
                status: allPassed ? "Accepted" : "Wrong Answer",
                memory: detailedResults.some((r: any) => r.memory)
                    ? JSON.stringify(detailedResults.map((r: any) => r.memory))
                    : null,
                time: detailedResults.some((r: any) => r.time)
                    ? JSON.stringify(detailedResults.map((r: any) => r.time))
                    : null,
            },
        });

        if (allPassed) {
            await prisma.problemSolved.upsert({
                where: {
                    userId_problemId: {
                        userId: user.id,
                        problemId: id
                    }
                },
                update: {},
                create: {
                    userId: user.id,
                    problemId: id,
                }
            })
        }


        const testCaseResults = detailedResults.map((result: any) => ({
            submissionId: submission.id,
            testCase: result.testCase,
            passed: result.passed,
            stdout: result.stdout,
            expected: result.expected,
            stderr: result.stderr,
            compileOutput: result.compile_output,
            status: result.status,
            memory: result.memory,
            time: result.time,
        }));

        await prisma.testCaseResult.createMany({ data: testCaseResults });

        const submissionWithTestCases = await prisma.submission.findUnique({
            where: { id: submission.id },
            include: {
                testCases: true,
            },
        });

        return {
            success: true,
            submission: submissionWithTestCases,
        };

    } catch (error) {
        return {
            success: false,
            error: "Failed to execute code"
        }
    }
}

/**
 * Validates a submission, persists it as Pending and enqueues it for the
 * evaluation service. Returns immediately — results are delivered later via
 * the evaluation callback endpoint and surfaced through polling.
 */
export const submitCode = async (problemId: string, code: string) => {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'error' in user) {
            return { success: false, error: "User not authenticated" }
        }

        if (!code || !code.trim()) {
            return { success: false, error: "Code cannot be empty" }
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
                language: "Python",
                stdin: testCases.map((tc) => tc.input).join("\n"),
                status: "Pending",
            },
        })

        try {
            await enqueueSubmission({
                submissionId: submission.id,
                code,
                language: "python",
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
