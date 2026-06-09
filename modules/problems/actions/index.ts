"use server"
import { getCurrentUserDetails } from "@/modules/auth/actions"
import { prisma } from "@/lib/db"

export const getAllProblems = async () => {
    try {
        const user = await getCurrentUserDetails();

        const problems = await prisma.problem.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            success: true,
            data: problems
        }
    } catch (error) {
        console.error("Error fetching problems: ", error);
        return {
            success: false,
            error: "Failed to fetch problems"
        }
    }
}

export const getProblemById = async (id: string) => {
    try {
        const user = await getCurrentUserDetails();

        const probelm = await prisma.problem.findUnique({
            where: {
                id
            }
        })

        if (!probelm) {
            return {
                success: false,
                error: "Problem not found"
            }
        }

        return {
            success: true,
            data: probelm
        }

    } catch (error) {
        console.error("Error fetching problem:", error)
        return {
            success: false,
            error: "Failed to fetch problem"
        }
    }
}
