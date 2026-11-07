export default function Banner({
                                   color,
                                   children,
                               }: {
    color: 'green' | 'red'
    children: React.ReactNode
}) {
    const styles =
        color === 'green'
            ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
            : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
    return <div className={`mb-4 rounded-lg border p-3 text-sm ${styles}`}>{children}</div>
}