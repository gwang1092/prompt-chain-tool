import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, display_name')
        .eq('id', user.id)
        .single()

    if (!profile?.is_superadmin) {
        redirect('/login')
    }

    return { supabase, user, profile }
}