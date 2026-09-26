import { useCallback, useEffect, useState } from "react";
import { getAllSubmissionByCurrentUserForProblem } from "../problems/actions";

const POLL_INTERVAL_MS = 3000;

export function useSubmissionHistory(id: string) {
    const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);

    const refresh = useCallback(async () => {
        try {
            const response = await getAllSubmissionByCurrentUserForProblem(id);
            if (response.success) {
                setSubmissionHistory(response.data);
            }
        } catch (error) {
            console.error('Error fetching submission history:', error);
        }
    }, [id]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Poll only while there is a submission still being evaluated, so we never
    // hit the server once every submission has a final verdict.
    useEffect(() => {
        const hasPending = submissionHistory.some((submission) => submission.status === "Pending");
        if (!hasPending) return;

        const interval = setInterval(refresh, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [submissionHistory, refresh]);

    return {
        submissionHistory,
        refresh,
    }
}
