export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
export const ITEMS_PER_PAGE = 5;

export const DEFAULT_FILTER_VALUES = {
    search: "",
    difficulty: "ALL",
    tag: "ALL",
}

export const DIFFICULTY_COLORS = {
    EASY: "bg-green-100 text-green-800 hover:bg-green-100",
    MEDIUM: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    HARD: "bg-red-100 text-red-800 hover:bg-red-100",
};


export const getDifficultyColor = (difficulty: keyof typeof DIFFICULTY_COLORS) => {
    return DIFFICULTY_COLORS[difficulty] || "";
};