import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { getCachedFavicon, setCachedFavicon } from '../lib/faviconCache'

const MAX_ICON_PX = 64

function candidatesFor(url: string): string[] {
  try {
    const u = new URL(url)
    return [
      `${u.origin}/favicon.ico`,
      `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`,
      `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`,
    ]
  } catch {
    return []
  }
}

function hostnameFor(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** Draws an image onto a canvas capped at MAX_ICON_PX (preserving aspect ratio) and returns a PNG data URL. */
function toCappedDataUrl(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
): string | null {
  const scale = Math.min(1, MAX_ICON_PX / Math.max(naturalWidth, naturalHeight, 1))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

interface FaviconProps {
  url: string
  className?: string
  /** Shows the icon as a clickable upload target for a manual, permanent override. */
  editable?: boolean
}

export default function Favicon({ url, className, editable }: FaviconProps) {
  const hostname = useMemo(() => hostnameFor(url), [url])
  const candidates = useMemo(() => candidatesFor(url), [url])
  const [src, setSrc] = useState<string | null>(
    () => (hostname ? getCachedFavicon(hostname)?.dataUrl : null) ?? null,
  )
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
    setSrc((hostname ? getCachedFavicon(hostname)?.dataUrl : null) ?? null)
  }, [hostname])

  useEffect(() => {
    if (!hostname || candidateIndex >= candidates.length) return
    if (getCachedFavicon(hostname)?.manual) return // never auto-override a manual upload
    const candidate = candidates[candidateIndex]
    let cancelled = false

    // Plain load for display — never blocked by missing CORS headers.
    const displayImg = new Image()
    displayImg.onload = () => {
      if (!cancelled) setSrc(candidate)
    }
    displayImg.onerror = () => {
      if (!cancelled) setCandidateIndex((i) => i + 1)
    }
    displayImg.src = candidate

    // Separate opportunistic load for caching — only works if the server
    // sends CORS headers; silently gives up otherwise (display is unaffected).
    const cacheImg = new Image()
    cacheImg.crossOrigin = 'anonymous'
    cacheImg.onload = () => {
      try {
        const dataUrl = toCappedDataUrl(
          cacheImg,
          cacheImg.naturalWidth || 32,
          cacheImg.naturalHeight || 32,
        )
        if (dataUrl) setCachedFavicon(hostname, dataUrl)
      } catch {
        // Tainted canvas (no CORS) — can't cache this one.
      }
    }
    cacheImg.src = candidate

    return () => {
      cancelled = true
    }
  }, [candidateIndex, candidates, hostname])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !hostname) return
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const dataUrl = toCappedDataUrl(img, img.naturalWidth, img.naturalHeight)
        if (dataUrl) {
          setCachedFavicon(hostname, dataUrl, true)
          setSrc(dataUrl)
        }
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
    img.src = objectUrl
  }

  const icon = src ? (
    <img src={src} alt="" className="block size-full object-contain" />
  ) : (
    <span className="block size-full rounded-full bg-(--code-bg)" />
  )

  if (!editable) return <span className={`inline-block ${className}`}>{icon}</span>

  return (
    <label
      className={`inline-block cursor-pointer ${className}`}
      title="Click to use your own icon for this site"
    >
      {icon}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </label>
  )
}
