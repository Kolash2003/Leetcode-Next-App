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
