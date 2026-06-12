import { prisma } from "@/lib/db";
import { getCurrentUserDetails } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUserDetails();

        if (!user || 'success' in user) {
            return NextResponse.json({
                success: false,
                error: "Unauthorized."
            }, {
                status: 401
            });
        }

        const { problemId, playlistId } = await request.json();

        if (!problemId || !playlistId) {
            return NextResponse.json({
                success: false,
                error: "Problem Id and Playlist Id are required."
            }, {
                status: 400
            });
        }

        const playlist = await prisma.playlist.findFirst({
            where: {
                id: playlistId,
                userId: user.id
            }
        });

        if (!playlist) {
            return NextResponse.json({
                success: false,
                error: "Playlist not found."
            }, {
                status: 404
            });
        }

        const problemInPlaylist = await prisma.problemInPlaylist.create({
            data: {
                problemId,
                playlistId
            }
        });

        return NextResponse.json({
            success: true,
            message: "Problem added to playlist successfully."
        }, {
            status: 200
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Internal Server Error."
        }, {
            status: 500
        });
    }
}