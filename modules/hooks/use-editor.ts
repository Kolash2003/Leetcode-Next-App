"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { submitCode, getSubmissionById } from "../problems/actions";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 3000;

export function useEditor(problem: any, initialLanguage = "PYTHON", onSubmitted?: () => void) {
    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionResponse, setExecutionResponse] = useState<any>(null);
    const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);

    const onSubmittedRef = useRef(onSubmitted);
    onSubmittedRef.current = onSubmitted;

    useEffect(() => {
        if (problem?.codeSnippets?.[selectedLanguage]) {
            setCode(problem?.codeSnippets?.[selectedLanguage]);
        }
    }, [problem, selectedLanguage]);

    // Poll the submission until the evaluation service posts a final verdict.
    useEffect(() => {
        if (!pendingSubmissionId) return;

        let cancelled = false;

        const checkSubmission = async () => {
            try {
                const res = await getSubmissionById(pendingSubmissionId);
                if (cancelled || !res.success || !res.data) return;

                if (res.data.status !== "Pending") {
                    setExecutionResponse({ submission: res.data });
                    setPendingSubmissionId(null);
                }
            } catch (error) {
                console.error("Error polling submission:", error);
            }
        };

        checkSubmission();
        const interval = setInterval(checkSubmission, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pendingSubmissionId]);

    const handleSubmit = useCallback(async () => {
        if (!problem) return;

        try {
            setIsSubmitting(true);
            setExecutionResponse(null);

            const res = await submitCode(problem.id, code, selectedLanguage);

            if (!res.success) {
                toast.error(res.error || "Failed to submit code");
                return;
            }

            toast.success("Submission queued");
            setPendingSubmissionId(res.submissionId ?? null);
            onSubmittedRef.current?.();

        } catch (error) {
            console.error('Error submitting code', error);
            toast.error('Error submitting code');
        }
        finally {
            setIsSubmitting(false);
        }
    }, [problem, selectedLanguage, code])

    return {
        selectedLanguage,
        setSelectedLanguage,
        code,
        setCode,
        handleSubmit,
        isSubmitting,
        executionResponse,
    }

}
