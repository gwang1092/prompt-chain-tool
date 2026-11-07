import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const DEFAULT_MODEL = 'gemini-3.8-flash'

type ModelRow = { id: string; model_key: string; is_active: boolean }

type StepResult = {
    name: string
    model: string
    note: string | null
    output: string | null
    error: string | null
    latencyMs: number
}

function render(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '')
}

async function callGemini(modelKey: string, parts: Record<string, unknown>[]) {
    const started = Date.now()

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelKey}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] }),
        }
    )

    const data = await response.json().catch(() => ({}))

    const text = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[])
        .filter(p => typeof p.text === 'string' && !p.thought)
        .map(p => p.text as string)
        .join('')
        .trim()

    return {
        ok: response.ok && text.length > 0,
        text,
        error:
            (data?.error?.message as string | undefined) ??
            (response.ok ? 'The model returned no text' : `Request failed (${response.status})`),
        latency: Date.now() - started,
        inputTokens: (data?.usageMetadata?.promptTokenCount as number | undefined) ?? null,
        outputTokens: (data?.usageMetadata?.candidatesTokenCount as number | undefined) ?? null,
    }
}

export async function POST(request: Request) {
    const supabase = await createClient()

    // Only signed-in superadmins may run chains
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
    }
    const { data: me } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', user.id)
        .single()
    if (!me?.is_superadmin) {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
    }

    let body: { chainId?: unknown; imageBase64?: unknown; hint?: unknown }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
    }

    if (typeof body.chainId !== 'string' || typeof body.imageBase64 !== 'string' || !body.imageBase64) {
        return NextResponse.json({ error: 'Choose a photo first.' }, { status: 400 })
    }
    const chainId = body.chainId
    const imageBase64 = body.imageBase64
    const hint = typeof body.hint === 'string' ? body.hint.trim() : ''

    const [chainRes, stepsRes, modelsRes, termsRes, examplesRes] = await Promise.all([
        supabase.from('prompt_chains').select('id, name').eq('id', chainId).single(),
        supabase
            .from('prompt_chain_steps')
            .select('step_order, name, instruction, model_id')
            .eq('chain_id', chainId)
            .order('step_order', { ascending: true }),
        supabase.from('llm_models').select('id, model_key, is_active'),
        supabase.from('terms').select('term, definition').order('term'),
        supabase
            .from('generation_examples')
            .select('caption')
            .order('created_at', { ascending: false })
            .limit(5),
    ])

    const chain = chainRes.data
    if (!chain) {
        return NextResponse.json({ error: 'Chain not found.' }, { status: 404 })
    }
    const steps = stepsRes.data ?? []
    if (!steps.length) {
        return NextResponse.json({ error: 'This chain has no steps yet.' }, { status: 400 })
    }

    const models = new Map(((modelsRes.data ?? []) as ModelRow[]).map(m => [m.id, m]))
    const termsText =
        (termsRes.data ?? []).map(t => `- ${t.term}: ${t.definition}`).join('\n') || '(none)'
    const examplesText =
        (examplesRes.data ?? []).map(e => `- ${e.caption}`).join('\n') || '(none yet)'

    const results: StepResult[] = []
    const logs: Record<string, unknown>[] = []
    let previous = ''
    let failure = ''

    for (const [index, step] of steps.entries()) {
        // Work out which model this step uses
        const m = step.model_id ? models.get(step.model_id) : undefined
        let modelKey = DEFAULT_MODEL
        let note: string | null = null
        if (step.model_id && !m) {
            note = `That model no longer exists, so ${DEFAULT_MODEL} was used.`
        } else if (m && !m.is_active) {
            note = `${m.model_key} is inactive, so ${DEFAULT_MODEL} was used.`
        } else if (m && !m.model_key.startsWith('gemini')) {
            note = `${m.model_key} is not a Gemini model, so ${DEFAULT_MODEL} was used.`
        } else if (m) {
            modelKey = m.model_key
        }

        const promptText = render(step.instruction, {
            previous,
            hint: hint || 'none',
            terms: termsText,
            examples: examplesText,
        })

        // Only the first step sees the photo
        const parts: Record<string, unknown>[] = [{ text: promptText }]
        if (index === 0) {
            parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
        }

        const out = await callGemini(modelKey, parts)

        results.push({
            name: step.name,
            model: modelKey,
            note,
            output: out.ok ? out.text : null,
            error: out.ok ? null : out.error,
            latencyMs: out.latency,
        })
        logs.push({
            model_key: modelKey,
            prompt_text: promptText,
            response_text: out.ok ? out.text : null,
            error_message: out.ok ? null : out.error,
            latency_ms: out.latency,
            input_tokens: out.inputTokens,
            output_tokens: out.outputTokens,
        })

        if (!out.ok) {
            failure = `Step ${index + 1} (${step.name}) failed: ${out.error}`
            break
        }
        previous = out.text
    }

    // Log the run. A logging problem must not hide the results.
    let requestId: string | null = null
    const { data: logged, error: logError } = await supabase.rpc('log_generation', {
        p_chain_id: chain.id,
        p_hint: hint,
        p_status: failure ? 'failed' : 'succeeded',
        p_steps: logs,
    })
    if (logError) {
        console.error('Could not log generation:', logError.message)
    } else {
        requestId = logged as string
    }

    return NextResponse.json({
        ok: !failure,
        error: failure || null,
        requestId,
        chainName: chain.name,
        steps: results,
        finalOutput: failure ? '' : previous,
    })
}