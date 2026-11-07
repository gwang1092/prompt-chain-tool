import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'
import Banner from '@/components/banner'
import StepForm from '@/components/step-form'

export default async function NewStepPage({
                                              params,
                                              searchParams,
                                          }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ error?: string }>
}) {
    const { supabase, profile } = await requireAdmin()
    const { id } = await params
    const { error } = await searchParams

    const [chainRes, modelsRes] = await Promise.all([
        supabase.from('prompt_chains').select('id, name').eq('id', id).single(),
        supabase.from('llm_models').select('id, name, model_key, is_active').order('name'),
    ])

    if (!chainRes.data) notFound()

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href={`/chains/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to {chainRes.data.name}
            </Link>
            <h1 className="mb-6 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">New step</h1>

            {error && (
                <div className="max-w-2xl">
                    <Banner color="red">{error}</Banner>
                </div>
            )}

            <StepForm mode="create" chainId={id} models={modelsRes.data ?? []} />
        </AppShell>
    )
}