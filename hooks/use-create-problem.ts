"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"
import { problemSchema, defaultFormValues } from "@/modules/problems/schema";
import { SAMPLE_PROBLEMS } from "@/modules/problems/constant/sample-problem";
import { z } from "zod";

type ProblemFormValues = z.infer<typeof problemSchema>;

export function useCreateproblem() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [sampleType, setSampleType] = useState("DP");

    const form = useForm<ProblemFormValues>({
        resolver: zodResolver(problemSchema),
        defaultValues: defaultFormValues as any
    })

    const testCasesArray = useFieldArray({
        control: form.control,
        name: "testCases",
    })

    const tagsArray = useFieldArray({
        control: form.control,
        name: "tags",
    })

    const onSubmit = async (values: ProblemFormValues) => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/create-problem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            console.log("Response from creating problem", data);

            if (data.success) {
                toast.success("Problem Created successfully!")
                router.push("/problems")
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log("Error while creating problem", error);
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false);
        }
    }

    const loadSampleData = () => {
        const sampleData = SAMPLE_PROBLEMS[sampleType as keyof typeof SAMPLE_PROBLEMS];
        tagsArray.replace(sampleData.tags.map((tag: any) => tag));
        testCasesArray.replace(sampleData.testCases.map((testCases: any) => testCases))

        form.reset(sampleData as any)
    }

    return {
        form,
        testCasesArray,
        tagsArray,
        isLoading,
        sampleType,
        setSampleType,
        onSubmit: form.handleSubmit(onSubmit),
        loadSampleData,
    }
}