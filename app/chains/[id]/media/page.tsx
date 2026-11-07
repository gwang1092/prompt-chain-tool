import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import AppShell from '@/components/app-shell'

type Row = Record<string, any>

// Supabase limits how long a list of ids can be, so ask in batches of 100
async function inChunks(ids: string[], run: (chunk: string[]) => PromiseLike<unknown>) {
    const out: Row[] = []
    for (let i = 0; i < ids.length; i += 100) {
        const res = (await run(ids.slice(i, i + 100))) as { data: Row[] | null }
        if (res.data) out.push(...res.data)
    }
    return out
}

const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">{value}</p>
        </div>
    )
}

export default async function ChainMediaPage({
                                                 params,
                                             }: {
    params: Promise<{ id: string }>
}) {
    const { supabase, profile } = await requireAdmin()
    const { id } = await params

    const { data: chain } = await supabase
        .from('prompt_chains')
        .select('id, name')
        .eq('id', id)
        .single()
    if (!chain) notFound()

    // Every run of this chain
    const { data: requests } = await supabase
        .from('generation_requests')
        .select('id, status')
        .eq('chain_id', id)

    const runs = requests ?? []
    const requestIds = runs.map(r => r.id as string)
    const failedRuns = runs.filter(r => r.status === 'failed').length

    // Every post saved from those runs, newest first
    const mediaRows = await inChunks(requestIds, chunk =>
        supabase
            .from('media')
            .select('id, user_id, image_url, caption, prompt, created_at')
            .in('generation_request_id', chunk)
    )
    const media = mediaRows
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 200)

    // Votes and author names for those posts
    const mediaIds = media.map(m => m.id as string)
    const authorIds = Array.from(new Set(media.map(m => m.user_id as string)))

    const [voteRows, authorRows] = await Promise.all([
        inChunks(mediaIds, chunk =>
            supabase.from('votes').select('media_id, value').in('media_id', chunk)
        ),
        inChunks(authorIds, chunk =>
            supabase.from('profiles').select('id, display_name').in('id', chunk)
        ),
    ])

    const names = new Map(
        authorRows.map(a => [a.id as string, a.display_name as string | null] as [string, string | null])
    )
    const scores = new Map<string, { up: number; down: number }>()
    voteRows.forEach(v => {
        const s = scores.get(v.media_id as string) ?? { up: 0, down: 0 }
        if (v.value === 1) s.up++
        else s.down++
        scores.set(v.media_id as string, s)
    })

    const totalUp = voteRows.filter(v => v.value === 1).length
    const totalDown = voteRows.filter(v => v.value === -1).length

    return (
        <AppShell name={profile.display_name ?? 'Admin'}>
            <Link href={`/chains/${id}`} className="text-sm text-zinc-600 underline dark:text-zinc-400">
                ← Back to {chain.name}
            </Link>
            <h1 className="mb-1 mt-2 text-3xl font-bold text-[#0B2545] dark:text-[#B9D9EB]">
                Media from {chain.name}
            </h1>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Posts that came from this chain, whether made by public users or saved from this tool.
            </p>

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
                <Stat label="Runs" value={runs.length} />
                <Stat label="Failed runs" value={failedRuns} />
                <Stat label="Posts" value={media.length} />
                <Stat label="Upvotes" value={totalUp} />
                <Stat label="Downvotes" value={totalDown} />
            </div>

            {media.length === 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        This chain hasn&apos;t produced any posts yet.
                    </p>
                    <Link href={`/chains/${id}/run`} className="mt-2 inline-block font-semibold underline">
                        Run it and save a result →
                    </Link>
                </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {media.map(m => {
                    const s = scores.get(m.id as string) ?? { up: 0, down: 0 }
                    return (
                        <article
                            key={m.id}
                            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <img src={m.image_url} alt="" className="h-48 w-full object-cover" />
                            <div className="p-4">
                                <p className="font-semibold leading-snug">{m.caption}</p>
                                <p className="mt-2 text-xs text-zinc-500">
                                    By {names.get(m.user_id as string) ?? 'Unknown'} · {fmt(m.created_at)}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">Hint: {m.prompt}</p>
                                <p className="mt-2 text-xs font-semibold">
                                    👍 {s.up} · 👎 {s.down}
                                </p>
                            </div>
                        </article>
                    )
                })}
            </div>
        </AppShell>
    )
}