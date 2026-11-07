import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import DeleteButton from '@/components/delete-button'
import { deleteChain } from '@/app/chains/actions'

function countBy(rows: { chain_id: string | null }[]) {
    const m = new Map<string, number>()
    rows.forEach(r => {
        if (r.chain_id) m.set(r.chain_id, (m.get(r.chain_id) ?? 0) + 1)
    })
    return m
}

export default async function ChainsPage({
                                             searchParams,
                                         }: {
    searchParams: Promise<{ created?: string; deleted?: string; error?: string }>
}) {
    const { supabase, profile } = await requireAdmin()
    const sp = await searchParams

    const [chainsRes, stepsRes, mixRes, requestsRes] = await Promise.all([
        supabase
            .from('prompt_chains')
            .select('id, name, description, created_at')
            .order('created_at', { ascending: true }),
        supabase.from('prompt_chain_steps').select('chain_id'),
        supabase.from('prompt_chain_mix').select('chain_id, weight, is_active'),
        supabase.from('generation_requests').select('chain_id'),
    ])

    const chains = chainsRes.data ?? []
    const steps = countBy(stepsRes.data ?? [])
    const runs = countBy(requestsRes.data ?? [])
    const mixRows = mixRes.data ?? []
    const mix = new Map(mixRows.map(m => [m.chain_id as string, m]))
    const totalWeight = mixRows
        .filter(m => m.is_active && m.weight > 0)
        .reduce((sum, m) => sum + m.weight, 0)

    const errors = [chainsRes, stepsRes, mixRes, requestsRes]
        .map(r => r.error?.message)
        .filter(Boolean) as string[]

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">Prompt chains</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Each chain is a series of steps. Every step&apos;s output feeds the next one.
                    </p>
                </div>
                <Link
                    href="/chains/new"
                    className="rounded-lg bg-[#0B2545] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143a6b] dark:bg-[#B9D9EB] dark:text-[#0B2545] dark:hover:bg-white"
                >
                    + New chain
                </Link>
            </div>

            {sp.created && <Banner color="green">Chain created.</Banner>}
            {sp.deleted && <Banner color="green">Chain deleted.</Banner>}
            {sp.error && <Banner color="red">{sp.error}</Banner>}
            {errors.length > 0 && <Banner color="red">Could not load: {errors.join(' | ')}</Banner>}

            <div className="grid gap-4 md:grid-cols-2">
                {chains.map(c => {
                    const m = mix.get(c.id)
                    const live = !!m && m.is_active && m.weight > 0
                    const share = live && totalWeight ? Math.round((m.weight / totalWeight) * 100) : 0
                    const stepCount = steps.get(c.id) ?? 0
                    const runCount = runs.get(c.id) ?? 0

                    return (
                        <div
                            key={c.id}
                            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <Link
                                    href={`/chains/${c.id}`}
                                    className="text-lg font-bold text-[#0B2545] hover:underline dark:text-[#B9D9EB]"
                                >
                                    {c.name}
                                </Link>
                                <span
                                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        live
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                    }`}
                                >
                  {live ? `Live · ${share}%` : 'Draft'}
                </span>
                            </div>

                            <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {c.description || 'No description.'}
                            </p>

                            <p className="mt-3 text-xs text-zinc-500">
                                {stepCount} {stepCount === 1 ? 'step' : 'steps'} · {runCount}{' '}
                                {runCount === 1 ? 'run' : 'runs'}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold">
                                <Link href={`/chains/${c.id}`} className="underline">
                                    Open
                                </Link>
                                <Link href={`/chains/${c.id}/run`} className="underline">
                                    Run
                                </Link>
                                <Link href={`/chains/${c.id}/media`} className="underline">
                                    Media
                                </Link>
                                <form action={deleteChain} className="ml-auto">
                                    <input type="hidden" name="id" value={c.id} />
                                    <DeleteButton message="Delete this chain? Its steps are deleted too, and past generations lose their link to it. This cannot be undone." />
                                </form>
                            </div>
                        </div>
                    )
                })}

                {chains.length === 0 && (
                    <p className="text-sm text-zinc-500">No chains yet. Create your first one.</p>
                )}
            </div>
        </AppShell>
    )
}