'use client'

export default function DeleteButton({
                                         message = 'Delete this? This cannot be undone.',
                                     }: {
    message?: string
}) {
    return (
        <button
            type="submit"
            onClick={e => {
                if (!confirm(message)) {
                    e.preventDefault()
                }
            }}
            className="text-xs font-semibold text-red-700 underline dark:text-red-400"
        >
            Delete
        </button>
    )
}