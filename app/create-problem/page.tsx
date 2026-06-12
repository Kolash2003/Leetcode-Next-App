import { UserRole } from '@/lib/generated/prisma/enums';
import { getCurrentUserDetails } from '@/modules/auth/actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { CreateProblemForm } from '@/modules/problems/components/create-problem-form';

const CreateProblemPage = async () => {
    const user = await getCurrentUserDetails();

    if (!user || 'error' in user || user.role !== UserRole.ADMIN) {
        redirect('/');
    }

    return (
        <section className='flex flex-col items-center justify-center mx-4 my-4'>
            <div className='flex flex-col justify-between items-center w-full h-fit max-w-lg'>
                <Link href={"/"}>
                    <Button variant={"outline"} size={"icon"}>
                        <ArrowLeft className='size-4' />
                    </Button>
                </Link>
                <h1 className='text-3xl font-bold text-amber-400'>
                    Welcome {user.firstName}! Create a Problem
                </h1>
                <ModeToggle />
            </div>

            <CreateProblemForm />

        </section>
    )
}

export default CreateProblemPage