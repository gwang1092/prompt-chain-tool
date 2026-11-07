import Link from 'next/link'
import { createStep, updateStep } from '@/app/chains/step-actions'

type Model = { id: string; name: string; model_key: string; is_active: boolean }

const inputClass =
    'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-800'

export default function StepForm({
                                     mode,
                                     chainId,
                                     models,
                                     step,
                                 }: {
    mode: 'create' | 'update'
    chainId: string
    models: Model[]
    step?: { id: string; name: string; instruction: string; model_id: string | null }
}) {
    return (
        <form
            action={mode === 'create' ? createStep : updateStep}
            className="flex max-w-2xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
            <input type="hidden" name="chain_id" value={chainId} />
            {step && <input type="hidden" name="step_id" value={step.id} />}

            <label className="text-sm font-semibold">
                Step name <span className="text-red-600">*</span>
                <input
                    name="name"
                    defaultValue={step?.name ?? ''}
                    required
                    placeholder="Describe the photo"
                    className={inputClass}
                />
            </label>

            <label className="text-sm font-semibold">
                Instruction <span className="text-red-600">*</span>
                <textarea
                    name="instruction"
                    defaultValue={step?.instruction ?? ''}
                    required
                    rows={10}
                    className={`${inputClass} font-mono`}
                />
            </label>

            <div className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <p className="mb-1 font-semibold">Placeholders you can use in the instruction:</p>
                <ul className="list-disc space-y-0.5 pl-5">
                    <li>
                        <code>{'{{previous}}'}</code> is the output of the step before this one
                    </li>
                    <li>
                        <code>{'{{hint}}'}</code> is the optional hint typed by whoever runs the chain
                    </li>
                    <li>
                        <code>{'{{terms}}'}</code> is the Columbia glossary from the Terms table
                    </li>
                    <li>
                        <code>{'{{examples}}'}</code> is a few example captions for tone
                    </li>
                </ul>
                <p className="mt-2">Only the first step receives the photo.</p>
            </div>

            <label className="text-sm font-semibold">
                Model
                <select name="model_id" defaultValue={step?.model_id ?? ''} className={inputClass}>
                    <option value="">Use the default model</option>
                    {models.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.name} ({m.model_key}){m.is_active ? '' : ' (inactive)'}
                        </option>
                    ))}
                </select>
            </label>

            <div className="flex gap-3">
                <button className="rounded-lg bg-[#0B2545] px-4 py-2 font-semibold text-white hover:bg-[#143a6b] dark:bg-[#B9D9EB] dark:text-[#0B2545] dark:hover:bg-white">
                    {mode === 'create' ? 'Add step' : 'Save changes'}
                </button>
                <Link
                    href={`/chains/${chainId}`}
                    className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                    Cancel
                </Link>
            </div>
        </form>
    )
}