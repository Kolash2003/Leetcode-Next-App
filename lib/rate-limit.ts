import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = Ratelimit | null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
    console.warn(
        "UPSTASH_REDIS_REST_URL/TOKEN are not set; rate limiting is disabled.",
    );
}

function createLimiter(
    limit: number,
    window: `${number} ${"s" | "m" | "h"}`,
    prefix: string,
): Limiter {
    if (!redis) return null;

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        analytics: true,
        prefix: `ratelimit:${prefix}`,
    });
}

export const apiLimiter = createLimiter(60, "1 m", "api");

export const codeExecutionLimiter = createLimiter(10, "1 m", "code-exec");

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Applies the given limiter to an identifier (user id or trusted client IP).
 * Fails open when Redis is not configured so local development keeps working.
 */
export async function checkRateLimit(
    limiter: Limiter,
    identifier: string,
): Promise<RateLimitResult> {
    if (!limiter) {
        return { success: true, limit: 0, remaining: 0, reset: 0 };
    }

    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return { success, limit, remaining, reset };
}

/**
 * Best-effort client IP derived from proxy headers. Used only as a rate-limit
 * key, never as an authorization signal.
 */
export function getClientIp(headers: Headers): string {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    return headers.get("x-real-ip") ?? "unknown";
}
