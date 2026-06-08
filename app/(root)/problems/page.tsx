import { getCurrentUserDetails } from '@/modules/auth/actions'
import { getAllProblems } from '@/modules/problems/actions';
import ProblemsTable from '@/modules/problems/components/problems-table';
import React from 'react'

const ProblemsPage = async () => {
    const user = await getCurrentUserDetails();

    const { data: problems, error } = await getAllProblems();

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-destructive">Error loading problems: {error}</p>
            </div>
        )
    }

    return (
        <div className='container mx-auto py-32'>
            <ProblemsTable problems={problems} user={user} />
        </div>
    )
}

export default ProblemsPage