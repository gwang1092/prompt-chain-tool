'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginButton() {
    const supabase = createClient()

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            alert('Login error: ' + error.message)
        }
    }

    return (
        <button
            onClick={handleLogin}
            className="rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-zinc-800"
        >
            Sign in with Google
        </button>
    )
}