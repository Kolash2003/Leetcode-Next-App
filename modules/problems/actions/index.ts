"use server"
import { getCurrentUserDetails } from "@/modules/auth/actions"
import { prisma } from "@/lib/db"
import { pollBatchResults, submitBatch, getLanguageName } from "@/lib/judge0";

export const getAllProblems = async () => {
    try {
        const user = await getCurrentUserDetails();

        const problems = await prisma.problem.findMany({
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
