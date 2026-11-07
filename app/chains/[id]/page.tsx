import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import ChainForm from '@/components/chain-form'
import DeleteButton from '@/components/delete-button'
import { deleteStep, moveStep } from '@/app/chains/step-actions'

const smallButton =
    'rounded border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800'

export default async function ChainPage({
                                            params,
                                            searchParams,
                                        }: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | undefined>>
}) {
    const { supabase, profile } = await requireAdmin()
    const { id } = await params
    const sp = await searchParams

    const [chainRes, stepsRes, modelsRes] = await Promise.all([
        supabase.from('prompt_chains').select('id, name, description').eq('id', id).single(),
        supabase
            .from('prompt_chain_steps')
            .select('id, step_order, name, instruction, model_id')
            .eq('chain_id', id)
            .order('step_order', { ascending: true }),
        supabase.from('llm_models').select('id, name'),
    ])

    const chain = chainRes.data
    if (!chain) notFound()

    const steps = stepsRes.data ?? []
    const modelNames = new Map(
        (modelsRes.data ?? []).map(m => [m.id as string, m.name as string])
    )

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href="/chains" className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to chains
            </Link>
            <h1 className="mb-6 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">
                {chain.name}
            </h1>

            {sp.created && <Banner color="green">Chain created. Add its first step below.</Banner>}
            {sp.saved && <Banner color="green">Changes saved.</Banner>}
            {sp.stepAdded && <Banner color="green">Step added.</Banner>}
            {sp.stepSaved && <Banner color="green">Step saved.</Banner>}
            {sp.stepDeleted && <Banner color="green">Step deleted.</Banner>}
            {sp.error && <Banner color="red">{sp.error}</Banner>}
            {stepsRes.error && <Banner color="red">Could not load steps: {stepsRes.error.message}</Banner>}

            <ChainForm mode="update" chain={chain} />

            <section className="mt-10">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">Steps</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
                        <Link href={`/chains/${id}/run`} className="underline">
                            Run this chain
                        </Link>
                        <Link href={`/chains/${id}/media`} className="underline">
                            View media
                        </Link>
                        <Link
                            href={`/chains/${id}/steps/new`}
                            className="rounded-lg bg-[#0B2545] px-4 py-2 text-white hover:bg-[#143a6b] dark:bg-[#B9D9EB] dark:text-[#0B2545] dark:hover:bg-white"
                        >
                            + Add step
                        </Link>
                    </div>
                </div>

                {steps.length === 0 && (
                    <p className="text-sm text-zinc-500">
                        No steps yet. A chain with no steps can&apos;t be run.
                    </p>
                )}

                <ol className="flex max-w-3xl flex-col">
                    {steps.map((s, i) => (
                        <li key={s.id}>
                            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                            Step {i + 1}
                                            {i === 0 ? ' · receives the photo' : ''}
                                        </p>
                                        <p className="text-lg font-bold text-[#0B2545] dark:text-[#B9D9EB]">{s.name}</p>
                                        <p className="text-xs text-zinc-500">
                                            Model: {s.model_id ? (modelNames.get(s.model_id) ?? 'Unknown') : 'Default'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <form action={moveStep}>
                                            <input type="hidden" name="chain_id" value={id} />
                                            <input type="hidden" name="step_id" value={s.id} />
                                            <input type="hidden" name="direction" value="up" />
                                            <button className={smallButton} disabled={i === 0} aria-label="Move up">
                                                ↑
                                            </button>
                                        </form>
                                        <form action={moveStep}>
                                            <input type="hidden" name="chain_id" value={id} />
                                            <input type="hidden" name="step_id" value={s.id} />
                                            <input type="hidden" name="direction" value="down" />
                                            <button
                                                className={smallButton}
                                                disabled={i === steps.length - 1}
                                                aria-label="Move down"
                                            >
                                                ↓
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                                    {s.instruction.length > 220 ? s.instruction.slice(0, 220) + '…' : s.instruction}
                                </p>

                                <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                                    <Link href={`/chains/${id}/steps/${s.id}`} className="underline">
                                        Edit
                                    </Link>
                                    <form action={deleteStep}>
                                        <input type="hidden" name="chain_id" value={id} />
                                        <input type="hidden" name="step_id" value={s.id} />
                                        <DeleteButton message="Delete this step? The remaining steps will be renumbered." />
                                    </form>
                                </div>
                            </div>

                            {i < steps.length - 1 && (
                                <p className="py-1 text-center text-xs text-zinc-400">↓ output feeds the next step</p>
                            )}
                        </li>
                    ))}
                </ol>
            </section>
        </AppShell>
    )
}