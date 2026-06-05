"use server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export const onBoardUser = async () => {
    try {
        const user = await currentUser();

        if (!user) {
            return {
                success: false,
                error: "No Authenticated user found"
            }
        }

        const { id, firstName, lastName, imageUrl, emailAddresses } = user;

        const newUser = await prisma.user.upsert({
            where: {
                clerkId: id
            },
            update: {
                firstName: firstName || "",
                lastName: lastName || "",
                email: emailAddresses[0].emailAddress || "",
                imageUrl: imageUrl || "",
            },
            create: {
                clerkId: id,
                firstName: firstName || "",
                lastName: lastName || "",
                email: emailAddresses[0].emailAddress || "",
                imageUrl: imageUrl || "",
            }
        })

    } catch (error) {
        console.log(error);
        return {
            success: false,
            error: "Failed to onboard user"
        }
    }
}

export const currentUserRole = async () => {
    try {
        const user = await currentUser();

        if (!user) {
            return {
                success: false,
                error: "No Authenticated user found"
            }
        }

        const { id } = user;

        const userData = await prisma.user.findUnique({
            where: {
                clerkId: id
            },
            select: {
                role: true,
            }
        })

        if (!userData) {
            return {
                success: false,
                error: "User not found"
            }
        }

        return userData.role;

    } catch (error) {
        console.log(error);

        return {
            success: false,
            error: "Failed to fetch user role"
        }
    }
}

export const getCurrentUserDetails = async () => {
    try {
        const user = await currentUser();

        if (!user) {
            return {
                success: false,
                error: "No Authenticated user found"
            }
        }

        const { id } = user;

        const userDetails = await prisma.user.findUnique({
            where: {
                clerkId: id
            }
        });

        if (!userDetails) {
            return {
                success: false,
                error: "User not found"
            }
        }

        return userDetails;

    } catch (error) {
        console.log(error);

        return {
            success: false,
            error: "Failed to fetch user details"
        }
    }
}



