import { useRef, useState } from 'react'
import { liveRepos, touch, uid } from '../lib/storage'
import type { HomepageData } from '../types'
import GithubIcon from './GithubIcon'
import SizeSlider from './SizeSlider'

interface GithubReposProps {
  data: HomepageData
  editing: boolean
  onChange: (updater: (data: HomepageData) => HomepageData) => void
  scale: number
  onScaleChange: (scale: number) => void
}

function parseRepo(input: string): string | null {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2].replace(/\.git$/, '')}`
  const plainMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (plainMatch) return `${plainMatch[1]}/${plainMatch[2]}`
  return null
}

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, order: i }))
}

export default function GithubRepos({
  data,
  editing,
  onChange,
  scale,
  onScaleChange,
}: GithubReposProps) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const dragRepo = useRef<string | null>(null)

  const repos = liveRepos(data)

  function addRepo() {
    const fullName = parseRepo(input)
    if (!fullName) {
      setError(true)
      return
    }
    onChange((d) => ({
      ...d,
      repos: [...d.repos, { id: uid(), fullName, order: repos.length, updatedAt: Date.now() }],
    }))
    setInput('')
    setError(false)
    setAdding(false)
  }

  function addDivider() {
    onChange((d) => ({
      ...d,
      repos: [
        ...d.repos,
        { id: uid(), fullName: '', isDivider: true, order: repos.length, updatedAt: Date.now() },
      ],
    }))
  }

  function deleteRepo(id: string) {
    const t = Date.now()
    onChange((d) => ({
      ...d,
      repos: d.repos.map((r) => (r.id === id ? { ...r, deletedAt: t, updatedAt: t } : r)),
    }))
  }

  function reorderRepos(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const order = repos.map((r) => r.id)
    const from = order.indexOf(draggedId)
    const to = order.indexOf(targetId)
    order.splice(to, 0, ...order.splice(from, 1))
    const stamped = reindex(order.map((id) => repos.find((r) => r.id === id)!))
    onChange((d) => ({
      ...d,
      repos: d.repos.map((r) => {
        const updated = stamped.find((s) => s.id === r.id)
        return updated ? touch({ ...r, order: updated.order }) : r
      }),
    }))
  }

  return (
    <aside className="w-72 shrink-0 px-4 pt-6 pb-20">
      {editing && <SizeSlider value={scale} onChange={onScaleChange} />}
      <div style={{ zoom: scale }}>
      <ul className="flex flex-col gap-0.5">
        {repos.map((repo) => (
          <li
            key={repo.id}
            draggable={editing}
            onDragStart={() => {
              dragRepo.current = repo.id
            }}
            onDragOver={(e) => {
              if (dragRepo.current) e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragRepo.current) {
                reorderRepos(dragRepo.current, repo.id)
                dragRepo.current = null
              }
            }}
          >
            {repo.isDivider ? (
              editing ? (
                <div className="flex items-center gap-1.5 px-1 py-1.5">
                  <div className="h-px flex-1 bg-(--border)" />
                  <button
                    type="button"
                    onClick={() => deleteRepo(repo.id)}
                    title="Delete divider"
                    className="shrink-0 rounded px-1 text-xs text-(--text) hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="my-1 h-px bg-(--border)" />
              )
            ) : editing ? (
              <div className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-(--code-bg)">
                <GithubIcon className="size-4 shrink-0 text-(--text-h)" />
                <span className="min-w-0 flex-1 truncate text-sm text-(--text-h)">
                  {repo.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => deleteRepo(repo.id)}
                  title="Unpin repo"
                  className="shrink-0 rounded px-1 text-xs text-(--text) hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ) : (
              <a
                href={`https://github.com/${repo.fullName}`}
                className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-(--text-h) hover:bg-(--code-bg)"
              >
                <GithubIcon className="size-4 shrink-0" />
                <span className="truncate">{repo.fullName}</span>
              </a>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <div className="mt-2">
          {adding ? (
            <div className="flex flex-col gap-1">
              <input
                autoFocus
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && addRepo()}
                placeholder="owner/repo or GitHub URL"
                className={`rounded border bg-(--bg) px-2 py-1 text-xs text-(--text-h) focus:outline-none ${
                  error
                    ? 'border-red-500'
                    : 'border-(--border) focus:border-(--accent-border)'
                }`}
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={addRepo}
                  className="flex-1 rounded bg-(--accent) py-1 text-xs font-medium text-white"
                >
                  Pin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setError(false)
                  }}
                  className="flex-1 rounded border border-(--border) py-1 text-xs text-(--text)"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex-1 rounded-lg border border-dashed border-(--border) py-2 text-xs font-medium text-(--text) hover:border-(--accent-border) hover:text-(--accent)"
              >
                + Pin repo
              </button>
              <button
                type="button"
                onClick={addDivider}
                title="Add divider"
                className="shrink-0 rounded px-1 py-1 text-xs font-medium text-(--text) hover:text-(--accent)"
              >
                + Divider
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </aside>
  )
}
