import type { Bookmark, ExportedData, Group, HomepageData, QuickPin, Repo } from '../types'

const STORAGE_KEY = 'homepage.data.v1'

function now() {
  return Date.now()
}

export function uid(): string {
  return crypto.randomUUID()
}

function defaultData(): HomepageData {
  const generalId = uid()
  const devId = uid()
  const t = now()
  return {
    groups: [
      { id: generalId, name: 'General', order: 0, updatedAt: t },
      { id: devId, name: 'Dev', order: 1, updatedAt: t },
    ],
    bookmarks: [
      {
        id: uid(),
        groupId: generalId,
        name: 'Gmail',
        url: 'https://mail.google.com',
        order: 0,
        updatedAt: t,
      },
      {
        id: uid(),
        groupId: generalId,
        name: 'YouTube',
        url: 'https://youtube.com',
        order: 1,
        updatedAt: t,
      },
      {
        id: uid(),
        groupId: devId,
        name: 'GitHub',
        url: 'https://github.com',
        order: 0,
        updatedAt: t,
      },
      {
        id: uid(),
        groupId: devId,
        name: 'MDN',
        url: 'https://developer.mozilla.org',
        order: 1,
        updatedAt: t,
      },
    ],
    repos: [
      { id: uid(), fullName: 'facebook/react', order: 0, updatedAt: t },
      { id: uid(), fullName: 'vitejs/vite', order: 1, updatedAt: t },
    ],
    quickPins: [
      { id: uid(), label: 'GitHub', url: 'https://github.com', order: 0, updatedAt: t },
      { id: uid(), label: 'Reddit', url: 'https://reddit.com', order: 1, updatedAt: t },
      {
        id: uid(),
        label: 'Google Drive',
        url: 'https://drive.google.com',
        order: 2,
        updatedAt: t,
      },
    ],
  }
}

export function loadData(): HomepageData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const data = defaultData()
    saveData(data)
    return data
  }
  try {
    const parsed = JSON.parse(raw) as HomepageData
    if (!parsed.groups || !parsed.bookmarks) throw new Error('invalid shape')
    if (!parsed.repos) parsed.repos = []
    if (!parsed.quickPins) parsed.quickPins = []
    return parsed
  } catch {
    const data = defaultData()
    saveData(data)
    return data
  }
}

export function saveData(data: HomepageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function touch<T extends { updatedAt: number }>(item: T): T {
  return { ...item, updatedAt: now() }
}

export function exportData(data: HomepageData): ExportedData {
  return { ...data, exportedAt: now(), version: 1 }
}

/**
 * Merges two entity lists (groups or bookmarks) by id, last-write-wins.
 * A deletion (deletedAt set) is treated as an update at that timestamp,
 * so a delete on one device correctly beats an older edit on the other,
 * but an edit made after the delete on the other device still wins.
 */
function mergeEntities<T extends { id: string; updatedAt: number; deletedAt?: number }>(
  a: T[],
  b: T[],
): T[] {
  const byId = new Map<string, T>()
  for (const item of [...a, ...b]) {
    const existing = byId.get(item.id)
    const itemStamp = Math.max(item.updatedAt, item.deletedAt ?? 0)
    if (!existing) {
      byId.set(item.id, item)
      continue
    }
    const existingStamp = Math.max(existing.updatedAt, existing.deletedAt ?? 0)
    if (itemStamp >= existingStamp) byId.set(item.id, item)
  }
  return [...byId.values()]
}

export function mergeData(local: HomepageData, incoming: HomepageData): HomepageData {
  return {
    groups: mergeEntities<Group>(local.groups, incoming.groups),
    bookmarks: mergeEntities<Bookmark>(local.bookmarks, incoming.bookmarks),
    repos: mergeEntities<Repo>(local.repos, incoming.repos ?? []),
    quickPins: mergeEntities<QuickPin>(local.quickPins, incoming.quickPins ?? []),
  }
}

export function liveGroups(data: HomepageData): Group[] {
  return data.groups.filter((g) => !g.deletedAt).sort((a, b) => a.order - b.order)
}

export function liveBookmarksFor(data: HomepageData, groupId: string): Bookmark[] {
  return data.bookmarks
    .filter((b) => !b.deletedAt && b.groupId === groupId)
    .sort((a, b) => a.order - b.order)
}

export function liveRepos(data: HomepageData): Repo[] {
  return data.repos.filter((r) => !r.deletedAt).sort((a, b) => a.order - b.order)
}

export function liveQuickPins(data: HomepageData): QuickPin[] {
  return data.quickPins.filter((p) => !p.deletedAt).sort((a, b) => a.order - b.order)
}
