export type Ref = { table: string; label: string }

export type Field = {
    name: string
    label: string
    type?: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'image' | 'display'
    required?: boolean
    ref?: Ref
    lowercase?: boolean
    pathColumn?: string
    bucket?: string
    help?: string
}

export type Column = {
    key: string
    label: string
    kind?: 'text' | 'bool' | 'date' | 'long' | 'shortid' | 'image'
    ref?: Ref
}

export type TableConfig = {
    slug: string
    table: string
    title: string
    group: string
    description: string
    orderBy: string
    ascending?: boolean
    search?: string
    filters?: string[]
    columns: Column[]
    fields: Field[]
    can: { create: boolean; update: boolean; delete: boolean }
    touchUpdatedAt?: boolean
    createdByColumn?: string
}

export const TABLES: TableConfig[] = [
    {
        slug: 'prompt-chains',
        table: 'prompt_chains',
        title: 'Prompt chains',
        group: 'AI pipeline',
        description: 'Named caption pipelines.',
        orderBy: 'created_at',
        ascending: true,
        columns: [
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description', kind: 'long' },
            { key: 'created_at', label: 'Created', kind: 'date' },
        ],
        fields: [],
        can: { create: false, update: false, delete: false },
    },
    {
        slug: 'prompt-chain-steps',
        table: 'prompt_chain_steps',
        title: 'Chain steps',
        group: 'AI pipeline',
        description: 'The ordered steps inside each chain.',
        orderBy: 'step_order',
        ascending: true,
        filters: ['chain_id'],
        columns: [
            { key: 'chain_id', label: 'Chain', ref: { table: 'prompt_chains', label: 'name' } },
            { key: 'step_order', label: 'Step' },
            { key: 'name', label: 'Name' },
            { key: 'instruction', label: 'Instruction', kind: 'long' },
            { key: 'model_id', label: 'Model', ref: { table: 'llm_models', label: 'name' } },
        ],
        fields: [],
        can: { create: false, update: false, delete: false },
    },
    {
        slug: 'prompt-chain-mix',
        table: 'prompt_chain_mix',
        title: 'Chain mix',
        group: 'AI pipeline',
        description: 'How much traffic each chain gets. A higher weight means the chain is picked more often.',
        orderBy: 'weight',
        ascending: false,
        columns: [
            { key: 'chain_id', label: 'Chain', ref: { table: 'prompt_chains', label: 'name' } },
            { key: 'weight', label: 'Weight' },
            { key: 'is_active', label: 'Active', kind: 'bool' },
            { key: 'updated_at', label: 'Updated', kind: 'date' },
        ],
        fields: [
            { name: 'chain_id', label: 'Chain', type: 'display', ref: { table: 'prompt_chains', label: 'name' } },
            { name: 'weight', label: 'Weight', type: 'number', required: true, help: 'Whole number, 0 or higher.' },
            { name: 'is_active', label: 'Active', type: 'boolean' },
        ],
        can: { create: false, update: true, delete: false },
        touchUpdatedAt: true,
    },
    {
        slug: 'generation-requests',
        table: 'generation_requests',
        title: 'Generation requests',
        group: 'AI pipeline',
        description: 'One row each time someone asks for a caption.',
        orderBy: 'created_at',
        ascending: false,
        filters: ['user_id', 'chain_id', 'status'],
        columns: [
            { key: 'user_id', label: 'User', ref: { table: 'profiles', label: 'display_name' } },
            { key: 'media_id', label: 'Post', ref: { table: 'media', label: 'caption' } },
            { key: 'chain_id', label: 'Chain', ref: { table: 'prompt_chains', label: 'name' } },
            { key: 'hint', label: 'Hint', kind: 'long' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'When', kind: 'date' },
        ],
        fields: [],
        can: { create: false, update: false, delete: false },
    },
    {
        slug: 'llm-responses',
        table: 'llm_responses',
        title: 'LLM responses',
        group: 'AI pipeline',
        description: 'What the model returned for each step of each request.',
        orderBy: 'created_at',
        ascending: false,
        filters: ['request_id', 'model_id'],
        columns: [
            { key: 'request_id', label: 'Request', kind: 'shortid' },
            { key: 'model_id', label: 'Model', ref: { table: 'llm_models', label: 'name' } },
            { key: 'response_text', label: 'Response', kind: 'long' },
            { key: 'latency_ms', label: 'ms' },
            { key: 'input_tokens', label: 'In' },
            { key: 'output_tokens', label: 'Out' },
            { key: 'created_at', label: 'When', kind: 'date' },
        ],
        fields: [],
        can: { create: false, update: false, delete: false },
    },
    {
        slug: 'generation-examples',
        table: 'generation_examples',
        title: 'Examples',
        group: 'AI pipeline',
        description: 'Example captions that are shown to the AI as tone references.',
        orderBy: 'created_at',
        ascending: false,
        search: 'caption',
        columns: [
            { key: 'image_url', label: 'Image', kind: 'image' },
            { key: 'caption', label: 'Caption', kind: 'long' },
            { key: 'notes', label: 'Notes', kind: 'long' },
            { key: 'created_at', label: 'Created', kind: 'date' },
        ],
        fields: [
            { name: 'image_url', label: 'Image', type: 'image', required: true, bucket: 'images' },
            { name: 'caption', label: 'Caption', type: 'textarea', required: true },
            { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
        can: { create: true, update: true, delete: true },
    },
    {
        slug: 'llm-providers',
        table: 'llm_providers',
        title: 'LLM providers',
        group: 'Models',
        description: 'Companies that supply models.',
        orderBy: 'name',
        ascending: true,
        search: 'name',
        columns: [
            { key: 'name', label: 'Name' },
            { key: 'website', label: 'Website' },
            { key: 'created_at', label: 'Created', kind: 'date' },
        ],
        fields: [
            { name: 'name', label: 'Name', required: true },
            { name: 'website', label: 'Website' },
        ],
        can: { create: true, update: true, delete: true },
    },
    {
        slug: 'llm-models',
        table: 'llm_models',
        title: 'LLM models',
        group: 'Models',
        description: 'Models a chain step can use.',
        orderBy: 'name',
        ascending: true,
        search: 'name',
        filters: ['provider_id'],
        columns: [
            { key: 'provider_id', label: 'Provider', ref: { table: 'llm_providers', label: 'name' } },
            { key: 'name', label: 'Name' },
            { key: 'model_key', label: 'API model name' },
            { key: 'is_active', label: 'Active', kind: 'bool' },
            { key: 'created_at', label: 'Created', kind: 'date' },
        ],
        fields: [
            { name: 'provider_id', label: 'Provider', type: 'select', required: true, ref: { table: 'llm_providers', label: 'name' } },
            { name: 'name', label: 'Name', required: true },
            { name: 'model_key', label: 'API model name', required: true, help: 'The exact string the provider API expects.' },
            { name: 'is_active', label: 'Active', type: 'boolean' },
        ],
        can: { create: true, update: true, delete: true },
    },
    {
        slug: 'terms',
        table: 'terms',
        title: 'Terms',
        group: 'Content',
        description: 'Columbia glossary entries that feed the caption prompt.',
        orderBy: 'term',
        ascending: true,
        search: 'term',
        columns: [
            { key: 'term', label: 'Term' },
            { key: 'definition', label: 'Definition', kind: 'long' },
            { key: 'example', label: 'Example', kind: 'long' },
            { key: 'created_at', label: 'Created', kind: 'date' },
        ],
        fields: [
            { name: 'term', label: 'Term', required: true },
            { name: 'definition', label: 'Definition', type: 'textarea', required: true },
            { name: 'example', label: 'Example', type: 'textarea' },
        ],
        can: { create: true, update: true, delete: true },
    },
    {
        slug: 'images',
        table: 'images',
        title: 'Images',
        group: 'Content',
        description: 'An image library. Upload a file or paste a URL.',
        orderBy: 'created_at',
        ascending: false,
        search: 'description',
        columns: [
            { key: 'url', label: 'Image', kind: 'image' },
            { key: 'description', label: 'Description', kind: 'long' },
            { key: 'created_at', label: 'Uploaded', kind: 'date' },
        ],
        fields: [
            { name: 'url', label: 'Image', type: 'image', required: true, pathColumn: 'storage_path', bucket: 'images' },
            { name: 'description', label: 'Description', type: 'textarea' },
        ],
        can: { create: true, update: true, delete: true },
        createdByColumn: 'uploaded_by',
    },
    {
        slug: 'allowed-signup-domains',
        table: 'allowed_signup_domains',
        title: 'Signup domains',
        group: 'Access',
        description: 'Email domains that are allowed to sign up.',
        orderBy: 'domain',
        ascending: true,
        search: 'domain',
        columns: [
            { key: 'domain', label: 'Domain' },
            { key: 'created_at', label: 'Added', kind: 'date' },
        ],
        fields: [
            { name: 'domain', label: 'Domain', required: true, lowercase: true, help: 'For example columbia.edu (no @).' },
        ],
        can: { create: true, update: true, delete: true },
    },
    {
        slug: 'whitelisted-emails',
        table: 'whitelisted_emails',
        title: 'Whitelisted emails',
        group: 'Access',
        description: 'Individual email addresses that are always allowed.',
        orderBy: 'email',
        ascending: true,
        search: 'email',
        columns: [
            { key: 'email', label: 'Email' },
            { key: 'note', label: 'Note', kind: 'long' },
            { key: 'created_at', label: 'Added', kind: 'date' },
        ],
        fields: [
            { name: 'email', label: 'Email', required: true, lowercase: true },
            { name: 'note', label: 'Note', type: 'textarea' },
        ],
        can: { create: true, update: true, delete: true },
    },
]

export function getTable(slug: string) {
    return TABLES.find(t => t.slug === slug)
}

export function accessLabel(can: TableConfig['can']) {
    if (!can.create && !can.update && !can.delete) return 'Read only'
    if (can.update && !can.create && !can.delete) return 'Read · Update'
    return [can.create && 'Create', 'Read', can.update && 'Update', can.delete && 'Delete']
        .filter(Boolean)
        .join(' · ')
}

// Looks up display names for a set of ids, e.g. a provider id -> "Google"
export async function fetchLabels(supabase: any, ref: Ref, ids: string[]) {
    const map = new Map<string, string>()
    if (!ids.length) return map
    const { data } = await supabase.from(ref.table).select(`id, ${ref.label}`).in('id', ids)
    const rows = (data ?? []) as Record<string, any>[]
    rows.forEach(row => map.set(row.id, String(row[ref.label] ?? row.id)))
    return map
}

// Options for a dropdown
export async function fetchOptions(supabase: any, ref: Ref) {
    const { data } = await supabase
        .from(ref.table)
        .select(`id, ${ref.label}`)
        .order(ref.label)
        .limit(500)
    const rows = (data ?? []) as Record<string, any>[]
    return rows.map(row => ({ id: row.id as string, label: String(row[ref.label] ?? row.id) }))
}