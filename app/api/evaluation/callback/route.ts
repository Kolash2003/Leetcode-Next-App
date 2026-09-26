import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

const STATUS_MAP: Record<string, string> = {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
};

interface ResultPayload {
    testCase: number;
    passed: boolean;
    stdout: string;
    expected: string;
    status: string;
    time: string;
    memory: string;
    stderr: string;
}

function isValidSecret(provided: string | null): boolean {
    const secret = process.env.EVALUATION_CALLBACK_SECRET;
    if (!secret || !provided) return false;

    const a = Buffer.from(secret);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
    if (!isValidSecret(request.headers.get("x-evaluation-secret"))) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { submissionId?: string; status?: string; results?: ResultPayload[] };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { submissionId, status } = body;
    const results: ResultPayload[] = Array.isArray(body.results) ? body.results : [];

    if (!submissionId) {
        return NextResponse.json({ success: false, error: "submissionId is required" }, { status: 400 });
    }

    const finalStatus = STATUS_MAP[status ?? ""] ?? "Wrong Answer";

    try {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
        });

        if (!submission) {
            return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
        }

        const stdout = JSON.stringify(results.map((r) => r.stdout ?? null));
        const stderr = results.some((r) => r.stderr)
            ? JSON.stringify(results.map((r) => r.stderr ?? null))
            : null;
        const time = JSON.stringify(results.map((r) => r.time ?? null));
        const memory = JSON.stringify(results.map((r) => r.memory ?? null));

        const testCaseRows = results.map((r) => ({
            submissionId,
            testCase: r.testCase,
            passed: Boolean(r.passed),
            stout: r.stdout ?? null,
            expected: r.expected ?? "",
            stderr: r.stderr ?? null,
            compileOutput: null,
            status: r.status ?? null,
            time: r.time ?? null,
            memory: r.memory ?? null,
        }));

        await prisma.$transaction(async (tx) => {
            // Replace any previously stored rows so retries stay idempotent.
            await tx.testCaseResult.deleteMany({ where: { submissionId } });

            if (testCaseRows.length > 0) {
                await tx.testCaseResult.createMany({ data: testCaseRows });
            }

            await tx.submission.update({
                where: { id: submissionId },
                data: {
                    status: finalStatus,
                    stdout,
                    stderr,
                    time,
                    memory,
                },
            });

            if (finalStatus === "Accepted") {
                await tx.problemSolved.upsert({
                    where: {
                        userId_problemId: {
                            userId: submission.userId,
                            problemId: submission.probelemId,
                        },
                    },
                    update: {},
                    create: {
                        userId: submission.userId,
                        problemId: submission.probelemId,
                    },
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Evaluation callback failed:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
