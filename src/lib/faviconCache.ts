const STORAGE_KEY = 'homepage.faviconCache.v1'
const MAX_ENTRIES = 300

export interface FaviconCacheEntry {
  dataUrl: string
  manual?: boolean
  updatedAt: number
}

export type FaviconCache = Record<string, FaviconCacheEntry>

function readCache(): FaviconCache {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as FaviconCache
  } catch {
    return {}
  }
}

function writeCache(cache: FaviconCache): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Storage quota exceeded — skip caching this one, live display still works.
  }
}

export function getCachedFavicon(hostname: string): FaviconCacheEntry | null {
  return readCache()[hostname] ?? null
}

export function getAllFavicons(): FaviconCache {
  return readCache()
}

/**
 * Stores a favicon for a hostname. A manually-uploaded icon (manual: true)
 * is pinned and will not be overwritten by later auto-fetched results —
 * only another manual upload can replace it.
 */
export function setCachedFavicon(hostname: string, dataUrl: string, manual = false): void {
  const cache = readCache()
  if (cache[hostname]?.manual && !manual) return
  cache[hostname] = { dataUrl, manual, updatedAt: Date.now() }
  const keys = Object.keys(cache)
  if (keys.length > MAX_ENTRIES) delete cache[keys[0]]
  writeCache(cache)
}

/**
 * Merges an imported favicon cache into the local one: a manual pin always
 * beats a non-manual entry regardless of age, otherwise the newer one wins.
 */
export function mergeFaviconCache(incoming: FaviconCache): void {
  const cache = readCache()
  for (const [hostname, entry] of Object.entries(incoming)) {
    const existing = cache[hostname]
    if (!existing) {
      cache[hostname] = entry
      continue
    }
    if (entry.manual && !existing.manual) {
      cache[hostname] = entry
    } else if (!entry.manual && existing.manual) {
      continue
    } else if (entry.updatedAt >= existing.updatedAt) {
      cache[hostname] = entry
    }
  }
  writeCache(cache)
}
