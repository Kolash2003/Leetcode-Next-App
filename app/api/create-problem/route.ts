import { NextRequest, NextResponse } from "next/server";
import { currentUserRole, getCurrentUserDetails } from "@/modules/auth/actions";
import { UserRole } from "@/lib/generated/prisma/enums";
import { getJudge0language, submitBatch, pollBatchResults } from "@/lib/judge0";
import { prisma } from "@/lib/db"


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

        if (!user) {
            return NextResponse.json({
                error: "User Not found",
                success: false
            }, { status: 401 })
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
        } = await request.json();

        if (!title || !description || !difficulty || !tags || !examples || !constraints || !testCases || !codeSnippets || !referenceSolutions) {
            return NextResponse.json({
                error: "Missing required fields",
                success: false
            }, { status: 400 })
        }

        if (!Array.isArray(testCases) || testCases.length === 0) {
            return NextResponse.json({
                error: "At least one test case is required",
                success: false
            }, { status: 400 })
        }

        for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
            // 1. get judge0 language id for the current language
            const languageId = getJudge0language(language);

            // 2. prepare judge0 submission for all the test cases
            const submissions = testCases.map(({ input, output }) => ({
                source_code: solutionCode,
                language_id: languageId,
                stdin: input,
                expected_output: output
            }))
            // 3. submit all test cases in one batch
            const submissionResults = await submitBatch(submissions);

            // 4. extract tokens from response 
            const tokens = submissionResults.map((res: any) => res.token);

            // 5. poll judge0 unitl all submissions are done
            const results = await pollBatchResults(tokens);
            // 6. validate that for each test case
            for (let i = 0; i < results.length; i++) {
                const result = results[i];

                if (result.status.id !== 3) {
                    return NextResponse.json(
                        {
                            error: `Validation failed for ${language}`,
                            testCase: {
                                input: submissions[i].stdin,
                                expectedOutput: submissions[i].expected_output,
                                actualOutput: result.stdout,
                                error: result.stderr || result.compile_output,
                            },
                            details: result,
                        },
                        { status: 400 },
                    );
                }
            }
        }



        // Transform tags from [{value: "tag"}] to ["tag"]
        const flatTags = Array.isArray(tags)
            ? tags.map((t: any) => (typeof t === "string" ? t : t.value))
            : tags;

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
                userId: (user as any).id
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