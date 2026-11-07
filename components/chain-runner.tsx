'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { blobToBase64, shrinkImage } from '@/lib/image-client'

type StepResult = {
    name: string
    model: string
    note: string | null
    output: string | null
    error: string | null
    latencyMs: number
}

type RunResult = {
    ok: boolean
    error: string | null
    requestId: string | null
    chainName: string
    steps: StepResult[]
    finalOutput: string
}

// Turns "1. First caption" style output into separate captions
function candidatesFrom(text: string) {
    return text
        .split('\n')
        .map(line =>
            line
                .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '')
                .replace(/^["“*_]+|["”*_]+$/g, '')
                .trim()
        )
        .filter(line => line.length > 0)
        .slice(0, 10)
}

const inputClass =
    'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-800'

export default function ChainRunner({
                                        chainId,
                                        chainName,
                                        userId,
                                    }: {
    chainId: string
    chainName: string
    userId: string
}) {
    const [file, setFile] = useState<File | null>(null)
    const [hint, setHint] = useState('')
    const [running, setRunning] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<RunResult | null>(null)
    const [blob, setBlob] = useState<Blob | null>(null)
    const [imageUrl, setImageUrl] = useState('')
    const [saved, setSaved] = useState<number[]>([])
    const [savingIndex, setSavingIndex] = useState<number | null>(null)
    const supabase = createClient()

    const handleRun = async () => {
        if (!file) return

        setRunning(true)
        setError('')
        setResult(null)
        setImageUrl('')
        setSaved([])

        try {
            const shrunk = await shrinkImage(file)
            setBlob(shrunk)
            const imageBase64 = await blobToBase64(shrunk)

            const res = await fetch('/api/run-chain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chainId, imageBase64, hint }),
            })

            let data: Partial<RunResult> & { error?: string | null } = {}
            try {
                data = await res.json()
            } catch {
                data = { error: `The server sent back something unexpected (status ${res.status}).` }
            }

            if (!res.ok) {
                setError(data.error ?? 'The run failed.')
                return
            }
            setResult(data as RunResult)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.')
        } finally {
            setRunning(false)
        }
    }

    const handleSave = async (index: number, caption: string) => {
        if (!blob || !result) return
        setSavingIndex(index)

        try {
            // Upload the photo the first time anything is saved
            let url = imageUrl
            if (!url) {
                const path = `${userId}-${Date.now()}.jpg`
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(path, blob, { contentType: 'image/jpeg' })
                if (uploadError) {
                    alert('Upload failed: ' + uploadError.message)
                    return
                }
                url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl
                setImageUrl(url)
            }

            const { error: insertError } = await supabase.from('media').insert({
                user_id: userId,
                image_url: url,
                prompt: hint.trim() || `Chain: ${result.chainName}`,
                caption,
                generation_request_id: result.requestId ?? null,
            })
            if (insertError) {
                alert('Save failed: ' + insertError.message)
                return
            }

            setSaved(prev => [...prev, index])
        } finally {
            setSavingIndex(null)
        }
    }

    const candidates = result?.ok ? candidatesFrom(result.finalOutput) : []

    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <label className="text-sm font-semibold">
                    Photo
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                        className="mt-1 block w-full text-sm font-normal"
                    />
                </label>

                <label className="text-sm font-semibold">
                    Hint (optional)
                    <input
                        value={hint}
                        onChange={e => setHint(e.target.value)}
                        placeholder="make it about finals week"
                        className={inputClass}
                    />
                </label>

                <button
                    onClick={handleRun}
                    disabled={running || !file}
                    className="self-start rounded-lg bg-[#0B2545] px-4 py-2 font-semibold text-white hover:bg-[#143a6b] disabled:opacity-50 dark:bg-[#B9D9EB] dark:text-[#0B2545] dark:hover:bg-white"
                >
                    {running ? 'Running the chain...' : `Run "${chainName}"`}
                </button>

                {running && (
                    <p className="text-xs text-zinc-500">
                        Each step runs in turn, so a long chain can take up to a minute.
                    </p>
                )}
            </div>

            {error && (
                <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    {error}
                </p>
            )}

            {result && (
                <>
                    <ol className="flex flex-col gap-3">
                        {result.steps.map((s, i) => (
                            <li
                                key={i}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                    Step {i + 1} · {s.name}
                                </p>
                                <p className="mb-2 text-xs text-zinc-500">
                                    {s.model} · {(s.latencyMs / 1000).toFixed(1)}s
                                </p>
                                {s.note && (
                                    <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">{s.note}</p>
                                )}
                                {s.output && <p className="whitespace-pre-wrap text-sm">{s.output}</p>}
                                {s.error && (
                                    <p className="text-sm text-red-700 dark:text-red-400">Error: {s.error}</p>
                                )}
                            </li>
                        ))}
                    </ol>

                    {result.error && (
                        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                            {result.error}
                        </p>
                    )}

                    {candidates.length > 0 && (
                        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-1 text-lg font-bold text-[#0B2545] dark:text-[#B9D9EB]">
                                Save as media
                            </h2>
                            <p className="mb-4 text-xs text-zinc-500">
                                Each saved caption becomes a post with your photo and shows up in the public feed.
                            </p>

                            <ul className="flex flex-col gap-3">
                                {candidates.map((c, i) => (
                                    <li key={i} className="flex items-start justify-between gap-4">
                                        <p className="text-sm">{c}</p>
                                        {saved.includes(i) ? (
                                            <span className="shrink-0 text-xs font-bold text-green-700 dark:text-green-400">
                        Saved ✓
                      </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSave(i, c)}
                                                disabled={savingIndex !== null}
                                                className="shrink-0 rounded border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                                            >
                                                {savingIndex === i ? 'Saving...' : 'Save'}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {saved.length > 0 && (
                                <Link
                                    href={`/chains/${chainId}/media`}
                                    className="mt-4 inline-block text-sm font-semibold underline"
                                >
                                    View media from this chain →
                                </Link>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    )
}