import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import ChainForm from '@/components/chain-form'

export default async function ChainPage({
                                            params,
                                            searchParams,
                                        }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ created?: string; saved?: string; error?: string }>
}) {
    const { supabase, profile } = await requireAdmin()
    const { id } = await params
    const sp = await searchParams

    const { data: chain } = await supabase
        .from('prompt_chains')
        .select('id, name, description')
        .eq('id', id)
        .single()

    if (!chain) notFound()

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href="/chains" className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to chains
            </Link>
            <h1 className="mb-6 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">
                {chain.name}
            </h1>

            {sp.created && <Banner color="green">Chain created. Steps come next.</Banner>}
            {sp.saved && <Banner color="green">Changes saved.</Banner>}
            {sp.error && <Banner color="red">{sp.error}</Banner>}

            <ChainForm mode="update" chain={chain} />
        </AppShell>
    )
}