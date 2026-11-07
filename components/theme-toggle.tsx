'use client'

import { useEffect, useState } from 'react'

type Mode = 'light' | 'dark' | 'system'

const options: { value: Mode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
]

function apply(mode: Mode) {
    const dark =
        mode === 'dark' ||
        (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeToggle() {
    const [mode, setMode] = useState<Mode>('system')

    useEffect(() => {
        try {
            const saved = localStorage.getItem('theme') as Mode | null
            if (saved === 'light' || saved === 'dark' || saved === 'system') setMode(saved)
        } catch {
            // storage unavailable, stay on system
        }
    }, [])

    // In System mode, follow the operating system if it changes
    useEffect(() => {
        if (mode !== 'system') return
        const query = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => apply('system')
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [mode])

    const choose = (next: Mode) => {
        setMode(next)
        try {
            localStorage.setItem('theme', next)
        } catch {
            // ignore
        }
        apply(next)
    }

    return (
        <div className="flex items-center gap-1" role="group" aria-label="Color theme">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => choose(o.value)}
                    aria-pressed={mode === o.value}
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                        mode === o.value ? 'bg-[#B9D9EB] text-[#0B2545]' : 'text-white hover:bg-white/10'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}