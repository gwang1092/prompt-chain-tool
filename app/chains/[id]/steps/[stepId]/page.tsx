import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import DeleteButton from '@/components/delete-button'
import StepForm from '@/components/step-form'
import { deleteStep } from '@/app/chains/step-actions'

export default async function EditStepPage({
                                               params,
                                               searchParams,
                                           }: {
    params: Promise<{ id: string; stepId: string }>
    searchParams: Promise<{ error?: string }>
}) {
    const { supabase, profile } = await requireAdmin()
    const { id, stepId } = await params
    const { error } = await searchParams

    const [stepRes, modelsRes] = await Promise.all([
        supabase
            .from('prompt_chain_steps')
            .select('id, name, instruction, model_id')
            .eq('id', stepId)
            .eq('chain_id', id)
            .single(),
        supabase.from('llm_models').select('id, name, model_key, is_active').order('name'),
    ])

    if (!stepRes.data) notFound()

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href={`/chains/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to chain
            </Link>
            <h1 className="mb-6 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">Edit step</h1>

            {error && (
                <div className="max-w-2xl">
                    <Banner color="red">{error}</Banner>
                </div>
            )}

            <StepForm mode="update" chainId={id} step={stepRes.data} models={modelsRes.data ?? []} />

            <form action={deleteStep} className="mt-6">
                <input type="hidden" name="chain_id" value={id} />
                <input type="hidden" name="step_id" value={stepId} />
                <DeleteButton message="Delete this step? The remaining steps will be renumbered." />
            </form>
        </AppShell>
    )
}