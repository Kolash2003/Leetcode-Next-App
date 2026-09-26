import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUserRole, getCurrentUserDetails } from "@/modules/auth/actions";
import { UserRole } from "@/lib/generated/prisma/enums";
import { runCodeOnEvaluator, normalizeLanguage } from "@/lib/evaluation";
import { codeExecutionLimiter, checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db"

const tagSchema = z.union([z.string(), z.object({ value: z.string() })]);

const createProblemSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(20_000),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    tags: z.array(tagSchema).min(1).max(50),
    examples: z.record(
        z.string(),
        z.object({
            input: z.string(),
            output: z.string(),
            explanation: z.string().optional(),
        }),
    ),
    constraints: z.string().min(1),
    hints: z.string().optional(),
    editorial: z.string().optional(),
    testCases: z
        .array(z.object({ input: z.string().min(1), output: z.string().min(1) }))
        .min(1)
        .max(100),
    codeSnippets: z.record(z.string(), z.string()),
    referenceSolutions: z.record(z.string(), z.string().min(1)),
});


export async function POST(request: NextRequest) {
    try {
        const userRole = await currentUserRole();


        if (userRole !== UserRole.ADMIN) {
            return NextResponse.json({
                error: "Unauthorized",
                success: false
            }, { status: 401 })
        }

        const user = await getCurrentUserDetails();

        if (!user || 'success' in user) {
            return NextResponse.json({
                error: "User Not found",
                success: false
            }, { status: 401 })
        }

        const { success: withinLimit } = await checkRateLimit(codeExecutionLimiter, user.id);
        if (!withinLimit) {
            return NextResponse.json({
                error: "Too many requests",
                success: false
            }, { status: 429 })
        }

        let parsedBody: z.infer<typeof createProblemSchema>;
        try {
            parsedBody = createProblemSchema.parse(await request.json());
        } catch {
            return NextResponse.json({
                error: "Invalid request body",
                success: false
            }, { status: 400 })
        }

        const {
            title,
            description,
            difficulty,
            tags,
            examples,
            constraints,
            testCases,
            codeSnippets,
            referenceSolutions
        } = parsedBody

        for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
            // 1. normalize the language into the evaluation service's identifier
            const normalizedLanguage = normalizeLanguage(language);

            if (!normalizedLanguage) {
                return NextResponse.json({
                    error: `Unsupported language: ${language}`,
                    success: false
                }, { status: 400 })
            }

            // 2. run the reference solution against every test case in Docker
            const res = await runCodeOnEvaluator({
                code: solutionCode as string,
                language: normalizedLanguage,
                testcases: testCases.map(({ input, output }: { input: string; output: string }) => ({ input, output })),
            });

            if (!res.success || !res.results) {
                return NextResponse.json({
                    error: res.error || `Validation failed for ${language}`,
                    success: false
                }, { status: 502 })
            }

            // 3. validate that every test case passed
            const failedResult = res.results.find((r) => !r.passed);
            if (failedResult) {
                const failedTestCase = testCases[failedResult.testCase - 1];
                return NextResponse.json(
                    {
                        error: `Validation failed for ${language}`,
                        testCase: {
                            input: failedTestCase?.input,
                            expectedOutput: failedResult.expected,
                            actualOutput: failedResult.stdout,
                            error: failedResult.stderr,
                        },
                        details: failedResult,
                    },
                    { status: 400 },
                );
            }
        }



        // Transform tags from [{value: "tag"}] to ["tag"]
        const flatTags = tags.map((t) => (typeof t === "string" ? t : t.value));

        const newProblem = await prisma.problem.create({
            data: {
                title,
                description,
                difficulty,
                tags: flatTags,
                examples,
                constraints,
                testCases,
                codeSnippets,
                referenceSolutions,
                userId: user.id
            }
        })

        return NextResponse.json({
            success: true,
            message: "Problem created successfully",
            data: newProblem
        }, { status: 201 })

    } catch (error) {
        console.error("Failed to create problem:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : "An unknown error occurred",
            },
            { status: 500 },
        );
    }
}