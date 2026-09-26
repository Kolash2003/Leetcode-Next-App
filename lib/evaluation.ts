import axios from "axios";

export type SupportedLanguage = "python" | "javascript" | "java";

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["python", "javascript", "java"];

const DISPLAY_NAMES: Record<SupportedLanguage, string> = {
    python: "Python",
    javascript: "JavaScript",
    java: "Java",
};

export interface EvaluatorTestCaseResult {
    testCase: number;
    passed: boolean;
    stdout: string;
    expected: string;
    status: "accepted" | "wrong_answer" | "time_limit_exceeded";
    time: string;
    memory: string;
    stderr: string;
}

export interface RunOnEvaluatorParams {
    code: string;
    language: SupportedLanguage;
    testcases: { input: string; output: string }[];
}

export interface RunOnEvaluatorResult {
    success: boolean;
    status?: "accepted" | "wrong_answer" | "time_limit_exceeded";
    results?: EvaluatorTestCaseResult[];
    error?: string;
}

/**
 * Normalizes a language key (e.g. "PYTHON" from the DB / form) into the
 * lowercase identifier understood by the evaluation service.
 */
export function normalizeLanguage(language: string): SupportedLanguage | null {
    const normalized = language?.toLowerCase();
    return SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage)
        ? (normalized as SupportedLanguage)
        : null;
}

export function getLanguageDisplayName(language: SupportedLanguage): string {
    return DISPLAY_NAMES[language];
}

/**
 * Calls the evaluation service's synchronous run endpoint. Runs code inside
 * Docker containers and returns per-test-case results without persisting
 * anything. Used by the "Run" button and reference-solution validation.
 */
export async function runCodeOnEvaluator(
    params: RunOnEvaluatorParams
): Promise<RunOnEvaluatorResult> {
    const baseUrl = process.env.EVALUATION_SERVICE_URL;

    if (!baseUrl) {
        return { success: false, error: "EVALUATION_SERVICE_URL is not configured" };
    }

    try {
        const { data } = await axios.post(
            `${baseUrl.replace(/\/$/, "")}/api/v1/run`,
            params,
            {
                headers: {
                    "x-evaluation-secret": process.env.EVALUATION_CALLBACK_SECRET,
                    "content-type": "application/json",
                },
                timeout: 30_000,
            }
        );

        if (!data?.success || !Array.isArray(data.results)) {
            return { success: false, error: "Invalid response from evaluation service" };
        }

        return { success: true, status: data.status, results: data.results };
    } catch (error) {
        console.error("Evaluation service run failed:", error);
        return { success: false, error: "Failed to reach evaluation service" };
    }
}
