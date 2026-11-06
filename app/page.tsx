import { requireAdmin } from '@/lib/admin'
import LogoutButton from '@/components/logout-button'

export default async function Home() {
  const { profile } = await requireAdmin()

  return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Prompt chain tool</h1>
        <p className="mt-2">Welcome, {profile.display_name ?? 'admin'}.</p>
        <LogoutButton className="mt-4 underline" />
      </div>
  )
}