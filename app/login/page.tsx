import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginButton from '@/components/login-button'
import LogoutButton from '@/components/logout-button'
import ThemeToggle from '@/components/theme-toggle'

export default async function LoginPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let isAdmin = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', user.id)
            .single()
        isAdmin = !!profile?.is_superadmin
    }

    if (user && isAdmin) {
        redirect('/chains')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="absolute right-4 top-4 rounded bg-[#0B2545] p-1">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-sm rounded-xl border border-zinc-300 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h1 className="text-2xl font-bold">Prompt Chain Tool</h1>

                {user ? (
                    <>
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            You are signed in, but this account is not authorized to use this tool.
                        </p>
                        <div className="mt-6">
                            <LogoutButton className="rounded-lg border border-zinc-400 px-5 py-3 font-semibold hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800" />
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            Authorized administrators only.
                        </p>
                        <div className="mt-6">
                            <LoginButton />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}