import { Plus, SeparatorVertical } from 'lucide-react'
import { useRef, useState } from 'react'
import { brandIconFor } from '../lib/brandIcons'
import { liveQuickPins, touch, uid } from '../lib/storage'
import type { HomepageData } from '../types'
import SizeSlider from './SizeSlider'

interface QuickPinsProps {
  data: HomepageData
  editing: boolean
  onChange: (updater: (data: HomepageData) => HomepageData) => void
  scale: number
  onScaleChange: (scale: number) => void
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

function labelFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, order: i }))
}

export default function QuickPins({ data, editing, onChange, scale, onScaleChange }: QuickPinsProps) {
  const [adding, setAdding] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const dragPin = useRef<string | null>(null)

  const pins = liveQuickPins(data)

  function addPin() {
    const url = urlInput.trim()
    if (!url) return
    const normalized = normalizeUrl(url)
    onChange((d) => ({
      ...d,
      quickPins: [
        ...d.quickPins,
        {
          id: uid(),
          label: labelInput.trim() || labelFor(normalized),
          url: normalized,
          order: pins.length,
          updatedAt: Date.now(),
        },
      ],
    }))
    setUrlInput('')
    setLabelInput('')
    setAdding(false)
  }

  function addDivider() {
    onChange((d) => ({
      ...d,
      quickPins: [
        ...d.quickPins,
        { id: uid(), label: '', url: '', isDivider: true, order: pins.length, updatedAt: Date.now() },
      ],
    }))
  }

  function deletePin(id: string) {
    const t = Date.now()
    onChange((d) => ({
      ...d,
      quickPins: d.quickPins.map((p) => (p.id === id ? { ...p, deletedAt: t, updatedAt: t } : p)),
    }))
  }

  function reorderPins(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const order = pins.map((p) => p.id)
    const from = order.indexOf(draggedId)
    const to = order.indexOf(targetId)
    order.splice(to, 0, ...order.splice(from, 1))
    const stamped = reindex(order.map((id) => pins.find((p) => p.id === id)!))
    onChange((d) => ({
      ...d,
      quickPins: d.quickPins.map((p) => {
        const updated = stamped.find((s) => s.id === p.id)
        return updated ? touch({ ...p, order: updated.order }) : p
      }),
    }))
  }

  return (
    <footer className="fixed inset-x-0 bottom-6 flex flex-col items-center gap-2">
      {editing && (
        <div className="w-56">
          <SizeSlider value={scale} onChange={onScaleChange} />
        </div>
      )}
      <div className="flex items-center gap-4" style={{ zoom: scale }}>
        {pins.map((pin) => {
          const Icon = brandIconFor(pin.url)
          return (
            <div
              key={pin.id}
              className="relative"
              draggable={editing}
              onDragStart={() => {
                dragPin.current = pin.id
              }}
              onDragOver={(e) => {
                if (dragPin.current) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragPin.current) {
                  reorderPins(dragPin.current, pin.id)
                  dragPin.current = null
                }
              }}
            >
              {pin.isDivider ? (
                <div className={`h-6 w-px bg-(--border) ${editing ? 'cursor-grab' : ''}`} />
              ) : (
                <a
                  href={editing ? undefined : pin.url}
                  title={pin.label}
                  aria-label={pin.label}
                  className={`flex items-center justify-center text-(--text-h) opacity-80 transition-opacity hover:opacity-100 ${
                    editing ? 'cursor-grab' : ''
                  }`}
                  onClick={(e) => {
                    if (editing) e.preventDefault()
                  }}
                >
                  {Icon ? (
                    <Icon className="size-6" />
                  ) : (
                    <span className="flex size-6 items-center justify-center text-sm font-semibold">
                      {pin.label.charAt(0).toUpperCase()}
                    </span>
                  )}
                </a>
              )}
              {editing && (
                <button
                  type="button"
                  onClick={() => deletePin(pin.id)}
                  title={pin.isDivider ? 'Delete divider' : 'Unpin'}
                  className="absolute -top-2 -right-2 flex size-3.5 items-center justify-center rounded-full text-[9px] text-(--text) opacity-70 hover:text-red-500 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}

        {editing &&
          (adding ? (
            <div className="flex items-center gap-1 pl-1">
              <input
                autoFocus
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPin()}
                placeholder="URL"
                className="w-32 rounded border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--text-h) focus:border-(--accent-border) focus:outline-none"
              />
              <input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPin()}
                placeholder="Label (optional)"
                className="w-28 rounded border border-(--border) bg-(--bg) px-2 py-1 text-xs text-(--text-h) focus:border-(--accent-border) focus:outline-none"
              />
              <button
                type="button"
                onClick={addPin}
                className="rounded bg-(--accent) px-2 py-1 text-xs font-medium text-white"
              >
                Pin
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded border border-(--border) px-2 py-1 text-xs text-(--text)"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAdding(true)}
                title="Add pin"
                aria-label="Add pin"
                className="flex items-center justify-center text-(--text) opacity-80 hover:opacity-100 hover:text-(--accent)"
              >
                <Plus className="size-6" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={addDivider}
                title="Add divider"
                aria-label="Add divider"
                className="flex items-center justify-center text-(--text) opacity-80 hover:opacity-100 hover:text-(--accent)"
              >
                <SeparatorVertical className="size-6" strokeWidth={1.5} />
              </button>
            </>
          ))}
      </div>
    </footer>
  )
}
