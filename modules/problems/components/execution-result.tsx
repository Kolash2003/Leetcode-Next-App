"use client"
import { SubmissionDetails } from "./submission-details";
import { TestCaseTable } from "./testcases-table";

export function ExecutionResult({ executionResponse }: any) {
    if (!executionResponse) return null;

    return (
        <div className="space-y-4 mt-4">
            <SubmissionDetails submission={executionResponse.submission} />
            <TestCaseTable testCases={executionResponse.submission.testCases} />
        </div>
    )
}

export default ExecutionResult