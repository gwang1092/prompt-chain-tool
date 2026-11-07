import Link from 'next/link'
import { createChain, updateChain } from '@/app/chains/actions'

const inputClass =
    'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-800'

export default function ChainForm({
                                      mode,
                                      chain,
                                  }: {
    mode: 'create' | 'update'
    chain?: { id: string; name: string; description: string | null }
}) {
    return (
        <form
            action={mode === 'create' ? createChain : updateChain}
            className="flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
            {chain && <input type="hidden" name="id" value={chain.id} />}

            <label className="text-sm font-semibold">
                Name <span className="text-red-600">*</span>
                <input name="name" defaultValue={chain?.name ?? ''} required className={inputClass} />
            </label>

            <label className="text-sm font-semibold">
                Description
                <textarea
                    name="description"
                    defaultValue={chain?.description ?? ''}
                    rows={3}
                    className={inputClass}
                />
            </label>

            <div className="flex gap-3">
                <button className="rounded-lg bg-[#0B2545] px-4 py-2 font-semibold text-white hover:bg-[#143a6b] dark:bg-[#B9D9EB] dark:text-[#0B2545] dark:hover:bg-white">
                    {mode === 'create' ? 'Create chain' : 'Save changes'}
                </button>
                <Link
                    href="/chains"
                    className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                    Cancel
                </Link>
            </div>
        </form>
    )
}