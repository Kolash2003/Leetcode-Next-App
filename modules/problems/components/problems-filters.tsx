"use client";

import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DIFFICULTIES } from "../constant";


interface ProblemsFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    difficulty: string;
    onDifficultyChange: (value: string) => void;
    selectedTag: string;
    onTagChange: (value: string) => void;
    allTags?: string[];
}

/**
 * Filters section with search, difficulty, and tag dropdowns
 */
export function ProblemsFilters({
    search,
    onSearchChange,
    difficulty,
    onDifficultyChange,
    selectedTag,
    onTagChange,
    allTags = [],
}: ProblemsFiltersProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Filters</h3>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1">
                        <SearchInput value={search} onChange={onSearchChange} />
                    </div>

                    {/* Difficulty & Tag Selects */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <DifficultySelect
                            value={difficulty}
                            onChange={onDifficultyChange}
                        />
                        <TagSelect
                            value={selectedTag}
                            onChange={onTagChange}
                            tags={allTags}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Search input with icon
 */
function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by title..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );
}

/**
 * Difficulty filter dropdown
 */
function DifficultySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Difficulties</SelectItem>
                {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase()}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/**
 * Tag filter dropdown
 */
function TagSelect({ value, onChange, tags }: { value: string; onChange: (value: string) => void; tags: string[] }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Tags</SelectItem>
                {tags.map((tag: string) => (
                    <SelectItem key={tag} value={tag}>
                        {tag}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}