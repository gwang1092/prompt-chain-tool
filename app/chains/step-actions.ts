'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'

function clean(value: FormDataEntryValue | null) {
    return String(value ?? '').trim()
}

export async function createStep(formData: FormData) {
    const { supabase } = await requireAdmin()

    const chainId = clean(formData.get('chain_id'))
    const name = clean(formData.get('name'))
    const instruction = clean(formData.get('instruction'))
    const modelId = clean(formData.get('model_id'))

    if (!chainId) redirect('/chains')
    const back = `/chains/${chainId}/steps/new`

    if (!name || !instruction) {
        redirect(`${back}?error=${encodeURIComponent('Name and instruction are required')}`)
    }

    // New steps go to the end of the chain
    const { data: last } = await supabase
        .from('prompt_chain_steps')
        .select('step_order')
        .eq('chain_id', chainId)
        .order('step_order', { ascending: false })
        .limit(1)

    const nextOrder = (last?.[0]?.step_order ?? 0) + 1

    const { error } = await supabase.from('prompt_chain_steps').insert({
        chain_id: chainId,
        step_order: nextOrder,
        name,
        instruction,
        model_id: modelId || null,
    })

    if (error) {
        redirect(`${back}?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath(`/chains/${chainId}`)
    redirect(`/chains/${chainId}?stepAdded=1`)
}

export async function updateStep(formData: FormData) {
    const { supabase } = await requireAdmin()

    const chainId = clean(formData.get('chain_id'))
    const stepId = clean(formData.get('step_id'))
    const name = clean(formData.get('name'))
    const instruction = clean(formData.get('instruction'))
    const modelId = clean(formData.get('model_id'))

    if (!chainId || !stepId) redirect('/chains')
    const back = `/chains/${chainId}/steps/${stepId}`

    if (!name || !instruction) {
        redirect(`${back}?error=${encodeURIComponent('Name and instruction are required')}`)
    }

    const { data, error } = await supabase
        .from('prompt_chain_steps')
        .update({ name, instruction, model_id: modelId || null })
        .eq('id', stepId)
        .eq('chain_id', chainId)
        .select('id')

    if (error || !data?.length) {
        redirect(
            `${back}?error=${encodeURIComponent(
                error?.message ?? 'Update was blocked or the step no longer exists'
            )}`
        )
    }

    revalidatePath(`/chains/${chainId}`)
    redirect(`/chains/${chainId}?stepSaved=1`)
}

export async function deleteStep(formData: FormData) {
    const { supabase } = await requireAdmin()

    const chainId = clean(formData.get('chain_id'))
    const stepId = clean(formData.get('step_id'))
    if (!chainId || !stepId) redirect('/chains')

    const { data, error } = await supabase
        .from('prompt_chain_steps')
        .delete()
        .eq('id', stepId)
        .eq('chain_id', chainId)
        .select('id')

    if (error || !data?.length) {
        redirect(
            `/chains/${chainId}?error=${encodeURIComponent(
                error?.message ?? 'Delete was blocked or the step no longer exists'
            )}`
        )
    }

    // Close the gap so the remaining steps are numbered 1, 2, 3...
    const { data: rest } = await supabase
        .from('prompt_chain_steps')
        .select('id')
        .eq('chain_id', chainId)
        .order('step_order', { ascending: true })

    if (rest?.length) {
        await supabase.rpc('reorder_prompt_chain_steps', {
            p_chain_id: chainId,
            p_step_ids: rest.map(s => s.id),
        })
    }

    revalidatePath(`/chains/${chainId}`)
    redirect(`/chains/${chainId}?stepDeleted=1`)
}

export async function moveStep(formData: FormData) {
    const { supabase } = await requireAdmin()

    const chainId = clean(formData.get('chain_id'))
    const stepId = clean(formData.get('step_id'))
    const direction = clean(formData.get('direction'))
    if (!chainId || !stepId) redirect('/chains')

    const { data: steps } = await supabase
        .from('prompt_chain_steps')
        .select('id')
        .eq('chain_id', chainId)
        .order('step_order', { ascending: true })

    const ids = (steps ?? []).map(s => s.id as string)
    const i = ids.indexOf(stepId)
    const j = direction === 'up' ? i - 1 : i + 1

    if (i === -1 || j < 0 || j >= ids.length) redirect(`/chains/${chainId}`)

    // Swap the two steps, then save the new order in one operation
    ;[ids[i], ids[j]] = [ids[j], ids[i]]

    const { error } = await supabase.rpc('reorder_prompt_chain_steps', {
        p_chain_id: chainId,
        p_step_ids: ids,
    })

    if (error) {
        redirect(`/chains/${chainId}?error=${encodeURIComponent('Could not reorder: ' + error.message)}`)
    }

    revalidatePath(`/chains/${chainId}`)
    redirect(`/chains/${chainId}`)
}