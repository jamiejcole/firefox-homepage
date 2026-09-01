import { useRef, useState } from 'react'
import type { Bookmark, HomepageData } from '../types'
import { liveBookmarksFor, liveGroups, touch, uid } from '../lib/storage'
import Favicon from './Favicon'
import SizeSlider from './SizeSlider'

interface SidebarProps {
  data: HomepageData
  editing: boolean
  onChange: (updater: (data: HomepageData) => HomepageData) => void
  onExport: () => void
  onImportFile: (file: File) => void
  scale: number
  onScaleChange: (scale: number) => void
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, order: i }))
}

export default function Sidebar({
  data,
  editing,
  onChange,
  onExport,
  onImportFile,
  scale,
  onScaleChange,
}: SidebarProps) {
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragBookmark = useRef<string | null>(null)
  const dragGroup = useRef<string | null>(null)

  const groups = liveGroups(data)

  function addGroup() {
    const name = newGroupName.trim()
    if (!name) return
    onChange((d) => ({
      ...d,
      groups: [
        ...d.groups,
        { id: uid(), name, order: groups.length, updatedAt: Date.now() },
      ],
    }))
    setNewGroupName('')
    setAddingGroup(false)
  }

  function renameGroup(id: string, name: string) {
    onChange((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === id ? touch({ ...g, name }) : g)),
    }))
  }

  function deleteGroup(id: string) {
    const t = Date.now()
    onChange((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === id ? { ...g, deletedAt: t, updatedAt: t } : g)),
      bookmarks: d.bookmarks.map((b) =>
        b.groupId === id ? { ...b, deletedAt: t, updatedAt: t } : b,
      ),
    }))
  }

  function reorderGroups(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const order = groups.map((g) => g.id)
    const from = order.indexOf(draggedId)
    const to = order.indexOf(targetId)
    order.splice(to, 0, ...order.splice(from, 1))
    const stamped = reindex(order.map((id) => groups.find((g) => g.id === id)!))
    onChange((d) => ({
      ...d,
      groups: d.groups.map((g) => {
        const updated = stamped.find((s) => s.id === g.id)
        return updated ? touch({ ...g, order: updated.order }) : g
      }),
    }))
  }

  function addBookmark(groupId: string, name: string, url: string) {
    const bookmarks = liveBookmarksFor(data, groupId)
    onChange((d) => ({
      ...d,
      bookmarks: [
        ...d.bookmarks,
        {
          id: uid(),
          groupId,
          name,
          url: normalizeUrl(url),
          order: bookmarks.length,
          updatedAt: Date.now(),
        },
      ],
    }))
  }

  function addDivider(groupId: string) {
    const bookmarks = liveBookmarksFor(data, groupId)
    onChange((d) => ({
      ...d,
      bookmarks: [
        ...d.bookmarks,
        {
          id: uid(),
          groupId,
          name: '',
          url: '',
          isDivider: true,
          order: bookmarks.length,
          updatedAt: Date.now(),
        },
      ],
    }))
  }

  function updateBookmark(id: string, fields: Partial<Pick<Bookmark, 'name' | 'url'>>) {
    onChange((d) => ({
      ...d,
      bookmarks: d.bookmarks.map((b) => (b.id === id ? touch({ ...b, ...fields }) : b)),
    }))
  }

  function deleteBookmark(id: string) {
    const t = Date.now()
    onChange((d) => ({
      ...d,
      bookmarks: d.bookmarks.map((b) => (b.id === id ? { ...b, deletedAt: t, updatedAt: t } : b)),
    }))
  }

  function moveBookmark(bookmarkId: string, targetGroupId: string, beforeId: string | null) {
    onChange((d) => {
      const moved = d.bookmarks.find((b) => b.id === bookmarkId)
      if (!moved) return d
      const destination = liveBookmarksFor(d, targetGroupId).filter((b) => b.id !== bookmarkId)
      const insertAt = beforeId ? destination.findIndex((b) => b.id === beforeId) : destination.length
      const at = insertAt < 0 ? destination.length : insertAt
      destination.splice(at, 0, moved)
      const stamped = reindex(destination)
      return {
        ...d,
        bookmarks: d.bookmarks.map((b) => {
          const updated = stamped.find((s) => s.id === b.id)
          if (!updated) return b
          return touch({ ...b, order: updated.order, groupId: targetGroupId })
        }),
      }
    })
  }

  return (
    <aside className="w-72 shrink-0 px-4 pt-6 pb-20">
      {editing && <SizeSlider value={scale} onChange={onScaleChange} />}
      <div style={{ zoom: scale }}>
      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const bookmarks = liveBookmarksFor(data, group.id)
          return (
            <div
              key={group.id}
              className="rounded-lg border border-(--border) p-3"
              draggable={editing}
              onDragStart={() => {
                dragGroup.current = group.id
              }}
              onDragOver={(e) => {
                if (dragGroup.current) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragGroup.current) {
                  reorderGroups(dragGroup.current, group.id)
                  dragGroup.current = null
                }
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                {editing ? (
                  <input
                    value={group.name}
                    onChange={(e) => renameGroup(group.id, e.target.value)}
                    className="w-full rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-(--text-h) hover:border-(--border) focus:border-(--accent-border) focus:outline-none"
                  />
                ) : (
                  <h3 className="px-1 text-sm font-semibold text-(--text-h)">{group.name}</h3>
                )}
                {editing && (
                  <button
                    type="button"
                    onClick={() => deleteGroup(group.id)}
                    title="Delete group"
                    className="shrink-0 rounded px-1.5 text-xs text-(--text) hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>

              <ul
                className="flex flex-col gap-0.5"
                onDragOver={(e) => {
                  if (dragBookmark.current) e.preventDefault()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragBookmark.current) {
                    moveBookmark(dragBookmark.current, group.id, null)
                    dragBookmark.current = null
                  }
                }}
              >
                {bookmarks.map((bookmark) => (
                  <li
                    key={bookmark.id}
                    draggable={editing}
                    onDragStart={(e) => {
                      e.stopPropagation()
                      dragBookmark.current = bookmark.id
                    }}
                    onDragOver={(e) => {
                      if (dragBookmark.current) {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (dragBookmark.current) {
                        moveBookmark(dragBookmark.current, group.id, bookmark.id)
                        dragBookmark.current = null
                      }
                    }}
                  >
                    {bookmark.isDivider ? (
                      editing ? (
                        <div className="flex items-center gap-1.5 px-1 py-1.5">
                          <div className="h-px flex-1 bg-(--border)" />
                          <button
                            type="button"
                            onClick={() => deleteBookmark(bookmark.id)}
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
                        <Favicon url={bookmark.url} className="size-4 shrink-0" editable />
                        <input
                          value={bookmark.name}
                          onChange={(e) => updateBookmark(bookmark.id, { name: e.target.value })}
                          className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-sm text-(--text-h) hover:border-(--border) focus:border-(--accent-border) focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => deleteBookmark(bookmark.id)}
                          title="Delete bookmark"
                          className="shrink-0 rounded px-1 text-xs text-(--text) hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <a
                        href={bookmark.url}
                        className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-(--text-h) hover:bg-(--code-bg)"
                      >
                        <Favicon url={bookmark.url} className="size-4 shrink-0" />
                        <span className="truncate">{bookmark.name}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>

              {editing && (
                <div className="mt-1.5 flex items-center gap-2">
                  <AddBookmarkForm onAdd={(name, url) => addBookmark(group.id, name, url)} />
                  <button
                    type="button"
                    onClick={() => addDivider(group.id)}
                    title="Add divider"
                    className="shrink-0 rounded px-1 py-1 text-xs font-medium text-(--text) hover:text-(--accent)"
                  >
                    + Divider
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing && (
        <div className="mt-4">
          {addingGroup ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGroup()}
                placeholder="Group name"
                className="min-w-0 flex-1 rounded border border-(--border) bg-(--bg) px-2 py-1 text-sm text-(--text-h) focus:border-(--accent-border) focus:outline-none"
              />
              <button
                type="button"
                onClick={addGroup}
                className="rounded bg-(--accent) px-2 py-1 text-xs font-medium text-white"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              className="w-full rounded-lg border border-dashed border-(--border) py-2 text-xs font-medium text-(--text) hover:border-(--accent-border) hover:text-(--accent)"
            >
              + Add group
            </button>
          )}

          <div className="mt-4 flex gap-2 border-t border-(--border) pt-4">
            <button
              type="button"
              onClick={onExport}
              className="flex-1 rounded-md border border-(--border) py-1.5 text-xs font-medium text-(--text-h) hover:border-(--accent-border)"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md border border-(--border) py-1.5 text-xs font-medium text-(--text-h) hover:border-(--accent-border)"
            >
              Import / Merge
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportFile(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      )}
      </div>
    </aside>
  )
}

function AddBookmarkForm({ onAdd }: { onAdd: (name: string, url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  function submit() {
    if (!name.trim() || !url.trim()) return
    onAdd(name.trim(), url.trim())
    setName('')
    setUrl('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 rounded px-1 py-1 text-left text-xs font-medium text-(--text) hover:text-(--accent)"
      >
        + Add bookmark
      </button>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="rounded border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--text-h) focus:border-(--accent-border) focus:outline-none"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="URL"
        className="rounded border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--text-h) focus:border-(--accent-border) focus:outline-none"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          className="flex-1 rounded bg-(--accent) py-1 text-xs font-medium text-white"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded border border-(--border) py-1 text-xs text-(--text)"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
