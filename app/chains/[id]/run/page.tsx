import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import ChainRunner from '@/components/chain-runner'

export default async function RunChainPage({
                                               params,
                                           }: {
    params: Promise<{ id: string }>
}) {
    const { supabase, user, profile } = await requireAdmin()
    const { id } = await params

    const [chainRes, stepsRes] = await Promise.all([
        supabase.from('prompt_chains').select('id, name').eq('id', id).single(),
        supabase.from('prompt_chain_steps').select('id', { count: 'exact', head: true }).eq('chain_id', id),
    ])

    const chain = chainRes.data
    if (!chain) notFound()
    const stepCount = stepsRes.count ?? 0

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href={`/chains/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to {chain.name}
            </Link>
            <h1 className="mb-1 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">
                Run: {chain.name}
            </h1>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}. Every run is logged and appears in the
                admin app&apos;s generation requests.
            </p>

            {stepCount === 0 ? (
                <p className="text-sm">
                    This chain has no steps yet.{' '}
                    <Link href={`/chains/${id}/steps/new`} className="font-semibold underline">
                        Add one first.
                    </Link>
                </p>
            ) : (
                <ChainRunner chainId={id} chainName={chain.name} userId={user.id} />
            )}
        </AppShell>
    )
}