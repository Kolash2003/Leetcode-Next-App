import { useState, useMemo } from "react";

interface Problem {
    title: string;
    difficulty: string;
    tags?: string[];
    [key: string]: any;
}

export function useProblemFilters({ problems }: { problems: Problem[] }) {
    const [search, setSearch] = useState("");
    const [difficulty, setDifficulty] = useState("ALL");
    const [selectedTag, setSelectedTag] = useState("ALL");

    //    Extract all unique tags from the problems
    const allTags = useMemo(() => {
        const tagsSet = new Set<string>();
        problems.forEach((p: Problem) => p.tags?.forEach((t: string) => tagsSet.add(t)));

        return Array.from(tagsSet);
    }, [problems])

    const filteredProblems = useMemo(() => {
        return problems
            .filter((problem: Problem) => problem.title.toLowerCase().includes(search.toLocaleLowerCase()))
            .filter((problem: Problem) => difficulty === "ALL" ? true : problem.difficulty === difficulty)
            .filter((problem: Problem) => selectedTag === "ALL" ? true : problem.tags?.includes(selectedTag));
    }, [problems, search, difficulty, selectedTag])

    return {
        search,
        difficulty,
        selectedTag,
        allTags,
        filteredProblems,

        setSearch,
        setDifficulty,
        setSelectedTag,
    }
}  