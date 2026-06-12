import { getCurrentUserDetails } from '@/modules/auth/actions'
import SubmissionHistory from '@/modules/problems/components/submit-history'
import PlaylistsSection from '@/modules/profile/components/playlist-section'
import ProfileStats from '@/modules/profile/components/profile-stats'
import SolvedProblems from '@/modules/profile/components/solved-problems'
import UserInfoCard from '@/modules/profile/components/user-info-card'
import React from 'react'

const ProfilePage = async () => {
    const profileData = await getCurrentUserDetails()

    if (!profileData || 'error' in profileData) {
        return (
            <div className='min-h-screen py-32 flex items-center justify-center'>
                <p className='text-red-500 font-semibold'>
                    {!profileData ? "Unauthorized" : profileData.error || "User details not found."}
                </p>
            </div>
        )
    }

    return (
        <div className='min-h-screen py-32'>
            <div className='container mx-auto px-4 max-w-7xl'>
                <UserInfoCard userData={profileData} />

                <ProfileStats
                    submissions={profileData.submissions}
                    solvedCount={profileData.solvedProblems.length}
                    playlistCount={profileData.playlists.length}
                />

                <SubmissionHistory submissions={profileData.submissions} />

                <div className='grid gap-8'>
                    <SolvedProblems solvedProblems={profileData.solvedProblems} />
                    <PlaylistsSection playlists={profileData.playlists} />
                </div>
            </div>
        </div>
    )
}

export default ProfilePage