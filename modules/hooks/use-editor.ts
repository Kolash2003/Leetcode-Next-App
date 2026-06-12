"use client"

import { getJudge0language } from "@/lib/judge0";
import { useEffect, useState } from "react";
import { executeCode } from "../problems/actions";
import { toast } from "sonner";

export function useEditor(problem: any, initialLanguage = "JAVASCRIPT") {
    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
    const [code, setCode] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionResponse, setExecutionResponse] = useState(null);

    useEffect(() => {
        if (problem?.codeSnippets?.[selectedLanguage]) {
            setCode(problem?.codeSnippets?.[selectedLanguage]);
        }
    }, [problem, selectedLanguage]);

    const handleRun = () => {
        toast.success("This is our assignments")
    }

    const handleSubmit = async () => {
        if (!problem) return;

        try {
            setIsRunning(true);
            const language_id = getJudge0language(selectedLanguage);
            const stdin = problem.testCases.map((tc: any) => tc.input);

            const expected_output = problem.testCases.map((tc: any) => tc.output);

            const res = await executeCode(
                code,
                language_id,
                stdin,
                expected_output,
                problem.id,
            );

            if (res.success) {
                toast.success("Code executed successfully")
            }

        } catch (error) {
            console.error('Error executing code', error);
            toast.error('Error executing code');
        }
        finally {
            setIsRunning(false);
        }
    }

    return {
        selectedLanguage,
        setSelectedLanguage,
        code,
        setCode,
        handleRun,
        handleSubmit,
        isRunning,
        isSubmitting,
        executionResponse,
    }

}