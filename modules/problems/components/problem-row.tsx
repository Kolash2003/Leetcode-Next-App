"use client";

import Link from "next/link";
import { Bookmark, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { getDifficultyColor } from "../constant";

interface ProblemRowProps {
    problem: any;
    user: any;
    onDelete: (id: string) => void;
    onSave: (id: string) => void;
}

/**
 * Single row in the problems table
 */
export function ProblemRow({ problem, user, onDelete, onSave }: ProblemRowProps) {
    const isSolved = problem.solvedBy?.length > 0;

    return (
        <TableRow>
            {/* Solved checkbox */}
            <TableCell>
                <SolvedCheckbox checked={isSolved} />
            </TableCell>

            {/* Title with link */}
            <TableCell className="font-medium">
                <ProblemTitle id={problem.id} title={problem.title} />
            </TableCell>

            {/* Tags */}
            <TableCell>
                <TagsList tags={problem.tags} />
            </TableCell>

            {/* Difficulty badge */}
            <TableCell>
                <DifficultyBadge difficulty={problem.difficulty} />
            </TableCell>

            {/* Action buttons */}
            <TableCell>
                <ActionButtons
                    problemId={problem.id}
                    isAdmin={user?.role === "ADMIN"}
                    onDelete={onDelete}
                    onSave={onSave}
                />
            </TableCell>
        </TableRow>
    );
}

/**
 * Checkbox showing if problem is solved
 */
function SolvedCheckbox({ checked }: { checked: boolean }) {
    return (
        <Checkbox
            checked={checked}
            disabled
            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
    );
}

/**
 * Problem title with link to problem page
 */
function ProblemTitle({ id, title }: { id: string; title: string }) {
    return (
        <Link
            href={`/problem/${id}`}
            className="text-primary hover:underline transition-colors"
        >
            {title}
        </Link>
    );
}

/**
 * List of tag badges
 */
function TagsList({ tags = [] }: { tags?: string[] }) {
    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag: string, idx: number) => (
                <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50"
                >
                    {tag}
                </Badge>
            ))}
        </div>
    );
}

/**
 * Difficulty badge with color
 */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
    return (
        <Badge className={`${getDifficultyColor(difficulty as any)} border-0 font-medium`}>
            {difficulty}
        </Badge>
    );
}

/**
 * Action buttons (delete, edit, save to playlist)
 */
function ActionButtons({ problemId, isAdmin, onDelete, onSave }: {
    problemId: string;
    isAdmin: boolean;
    onDelete: (id: string) => void;
    onSave: (id: string) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            {isAdmin && (
                <>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(problemId)}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                </>
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onSave(problemId)}
                className="gap-2"
            >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
            </Button>
        </div>
    );
}