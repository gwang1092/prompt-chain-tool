import Link from 'next/link'
import LogoutButton from '@/components/logout-button'
import ThemeToggle from '@/components/theme-toggle'

export default function AppShell({
                                     name,
                                     children,
                                 }: {
    name: string
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            <header className="bg-[#0B2545] text-white">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <Link href="/chains" className="text-lg font-bold">
                        🔗 Prompt Chain Tool
                    </Link>
                    <div className="flex items-center gap-3 text-xs">
                        <ThemeToggle />
                        <span>{name}</span>
                        <LogoutButton className="rounded border border-white/40 px-3 py-1.5 hover:bg-white/10" />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
    )
}