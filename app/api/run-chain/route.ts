import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const DEFAULT_MODEL = 'gemini-3.8-flash'

type ModelRow = { id: string; model_key: string; is_active: boolean }

function render(template: string, vars: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '')
}

async function callGemini(modelKey: string, parts: Record<string, unknown>[]) {
    const started = Date.now()

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelKey}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts }] }),
                // Give up with a readable error instead of letting Vercel return a 504
                signal: AbortSignal.timeout(50000),
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
    } catch (err) {
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
        return {
            ok: false,
            text: '',
            error: timedOut
                ? 'The model took too long to respond (over 50 seconds). Try again.'
                : err instanceof Error
                    ? err.message
                    : 'The request failed',
            latency: Date.now() - started,
            inputTokens: null,
            outputTokens: null,
        }
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

    let body: {
        chainId?: unknown
        stepIndex?: unknown
        previous?: unknown
        imageBase64?: unknown
        hint?: unknown
    }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
    }

    const chainId = typeof body.chainId === 'string' ? body.chainId : ''
    const stepIndex = typeof body.stepIndex === 'number' ? body.stepIndex : -1
    const previous = typeof body.previous === 'string' ? body.previous : ''
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : ''
    const hint = typeof body.hint === 'string' ? body.hint.trim() : ''

    if (!chainId || stepIndex < 0) {
        return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
    }
    if (stepIndex === 0 && !imageBase64) {
        return NextResponse.json({ error: 'Choose a photo first.' }, { status: 400 })
    }

    const [stepsRes, modelsRes, termsRes, examplesRes] = await Promise.all([
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

    const step = (stepsRes.data ?? [])[stepIndex]
    if (!step) {
        return NextResponse.json({ error: 'That step no longer exists.' }, { status: 404 })
    }

    // Work out which model this step uses
    const models = new Map(((modelsRes.data ?? []) as ModelRow[]).map(m => [m.id, m]))
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

    const termsText =
        (termsRes.data ?? []).map(t => `- ${t.term}: ${t.definition}`).join('\n') || '(none)'
    const examplesText =
        (examplesRes.data ?? []).map(e => `- ${e.caption}`).join('\n') || '(none yet)'

    const promptText = render(step.instruction, {
        previous,
        hint: hint || 'none',
        terms: termsText,
        examples: examplesText,
    })

    // Only the first step sees the photo
    const parts: Record<string, unknown>[] = [{ text: promptText }]
    if (stepIndex === 0) {
        parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
    }

    const out = await callGemini(modelKey, parts)

    return NextResponse.json({
        ok: out.ok,
        error: out.ok ? null : out.error,
        name: step.name,
        model: modelKey,
        note,
        output: out.ok ? out.text : null,
        latencyMs: out.latency,
        promptText,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
    })
}