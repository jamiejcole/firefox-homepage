import { useState } from 'react'

export default function SearchBar() {
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Google or type a URL"
        autoFocus
        className="w-full rounded-full border border-(--border) bg-(--bg) px-6 py-3.5 text-base text-(--text-h) shadow-(--shadow) outline-none transition-colors focus:border-(--accent-border)"
      />
    </form>
  )
}
