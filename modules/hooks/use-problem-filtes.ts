import { useState, useMemo } from "react";

export function useProblemFilters({ problems }: any) {
    const [search, setSearch] = useState("");
    const [difficulty, setDifficulty] = useState("ALL");
    const [selectedTag, setSelectedTag] = useState("ALL");

    //    Extract all unique tags from the problems
    const allTags = useMemo(() => {
        const tagsSet = new Set();
        problems.forEach((p) => p.tags?.forEach((t) => tagsSet.add(t)));

        return Array.from(tagsSet);
    }, [problems])

    const filteredProblems = useMemo(() => {
        return problems
            .filter((problem) => problem.title.toLowerCase().includes(search.toLocaleLowerCase()))
            .filter((problem) => difficulty === "ALL" ? true : problem.difficulty === difficulty)
            .filter((problem) => selectedTag === "ALL" ? true : problem.tags?.includes(selectedTag));
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