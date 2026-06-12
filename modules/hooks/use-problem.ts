import { useState, useEffect } from "react";
import { getProblemById } from "../problems/actions";

export function useProblem(id: string) {

    const [problem, setProblem] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        const fetchProblem = async () => {
            try {
                setIsLoading(true);
                const problemData = await getProblemById(id);

                if (problemData.success) {
                    setProblem(problemData.data);
                }
            } catch (error) {
                console.error("Error fetching problem", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProblem();

    }, [id]);

    return {
        problem,
        isLoading
    }
}