const STORAGE_KEY = 'homepage.faviconCache.v1'
const MAX_ENTRIES = 300

interface CacheEntry {
  dataUrl: string
  manual?: boolean
}

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, CacheEntry>
  } catch {
    return {}
  }
}

export function getCachedFavicon(hostname: string): CacheEntry | null {
  return readCache()[hostname] ?? null
}

/**
 * Stores a favicon for a hostname. A manually-uploaded icon (manual: true)
 * is pinned and will not be overwritten by later auto-fetched results —
 * only another manual upload can replace it.
 */
export function setCachedFavicon(hostname: string, dataUrl: string, manual = false): void {
  const cache = readCache()
  if (cache[hostname]?.manual && !manual) return
  cache[hostname] = { dataUrl, manual }
  const keys = Object.keys(cache)
  if (keys.length > MAX_ENTRIES) delete cache[keys[0]]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Storage quota exceeded — skip caching this one, live display still works.
  }
}
