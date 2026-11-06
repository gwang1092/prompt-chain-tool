import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginButton from '@/components/login-button'
import LogoutButton from '@/components/logout-button'

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
        redirect('/')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6">
            <div className="w-full max-w-sm rounded-xl border border-zinc-300 bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-bold">Admin Area</h1>

                {user ? (
                    <>
                        <p className="mt-3 text-sm text-zinc-600">
                            You are signed in, but this account is not authorized to use the admin area.
                        </p>
                        <div className="mt-6">
                            <LogoutButton className="rounded-lg border border-zinc-400 px-5 py-3 font-semibold hover:bg-zinc-100" />
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mt-3 text-sm text-zinc-600">Authorized administrators only.</p>
                        <div className="mt-6">
                            <LoginButton />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}