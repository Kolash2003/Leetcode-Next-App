import { Queue } from "bullmq";

export const SUBMISSION_QUEUE = "submissionQueue";

export interface SubmissionJob {
    submissionId: string;
    code: string;
    language: "python" | "javascript" | "java";
    problem: {
        id: string;
        testcases: { input: string; output: string }[];
    };
}

type RedisConnection = {
    host: string;
    port: number;
    password?: string;
    tls?: Record<string, never>;
    maxRetriesPerRequest: null;
};

function getRedisConnection(): RedisConnection {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (restUrl) {
        const host = restUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return {
            host,
            port: 6379,
            password: token,
            tls: {},
            maxRetriesPerRequest: null,
        };
    }

    return {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    };
}

let submissionQueue: Queue | null = null;

export function getSubmissionQueue(): Queue {
    if (!submissionQueue) {
        submissionQueue = new Queue(SUBMISSION_QUEUE, {
            connection: getRedisConnection(),
        });
    }
    return submissionQueue;
}

/**
 * Enqueues a submission for the evaluation service. The submission id is used
 * as the BullMQ job id so a submission can never be enqueued twice.
 */
export async function enqueueSubmission(job: SubmissionJob): Promise<string> {
    await getSubmissionQueue().add("evaluate", job, {
        jobId: job.submissionId,
        removeOnComplete: 100,
        removeOnFail: 500,
    });
    return job.submissionId;
}
