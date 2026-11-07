'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'

function problem(error: { code?: string; message: string } | null, fallback: string) {
    if (!error) return fallback
    if (error.code === '23505') return 'A chain with that name already exists.'
    return error.message
}

export async function createChain(formData: FormData) {
    const { supabase } = await requireAdmin()

    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!name) redirect(`/chains/new?error=${encodeURIComponent('Name is required')}`)

    const { data, error } = await supabase
        .from('prompt_chains')
        .insert({ name, description: description || null })
        .select('id')
        .single()

    if (error || !data) {
        redirect(`/chains/new?error=${encodeURIComponent(problem(error, 'Could not create the chain'))}`)
    }

    // New chains start as drafts: weight 0 and inactive, so the public app ignores them
    await supabase.from('prompt_chain_mix').insert({ chain_id: data.id, weight: 0, is_active: false })

    revalidatePath('/chains')
    redirect(`/chains/${data.id}?created=1`)
}

export async function updateChain(formData: FormData) {
    const { supabase } = await requireAdmin()

    const id = String(formData.get('id') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()

    if (!id) redirect('/chains')
    if (!name) redirect(`/chains/${id}?error=${encodeURIComponent('Name is required')}`)

    const { data, error } = await supabase
        .from('prompt_chains')
        .update({ name, description: description || null })
        .eq('id', id)
        .select('id')

    if (error || !data?.length) {
        redirect(`/chains/${id}?error=${encodeURIComponent(problem(error, 'Update was blocked or the chain no longer exists'))}`)
    }

    revalidatePath('/chains')
    revalidatePath(`/chains/${id}`)
    redirect(`/chains/${id}?saved=1`)
}

export async function deleteChain(formData: FormData) {
    const { supabase } = await requireAdmin()

    const id = String(formData.get('id') ?? '')
    if (!id) redirect('/chains')

    // Steps and the mix row are deleted automatically (cascade)
    const { data, error } = await supabase.from('prompt_chains').delete().eq('id', id).select('id')

    if (error || !data?.length) {
        redirect(`/chains?error=${encodeURIComponent(problem(error, 'Delete was blocked or the chain no longer exists'))}`)
    }

    revalidatePath('/chains')
    redirect('/chains?deleted=1')
}