import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import ChainForm from '@/components/chain-form'

export default async function NewChainPage({
                                               searchParams,
                                           }: {
    searchParams: Promise<{ error?: string }>
}) {
    const { profile } = await requireAdmin()
    const { error } = await searchParams

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href="/chains" className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to chains
            </Link>
            <h1 className="mb-6 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">New chain</h1>

            {error && (
                <div className="max-w-xl">
                    <Banner color="red">{error}</Banner>
                </div>
            )}

            <ChainForm mode="create" />
        </AppShell>
    )
}