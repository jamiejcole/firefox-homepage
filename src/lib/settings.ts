export interface Settings {
  bookmarksScale: number
  reposScale: number
  pinsScale: number
}

const STORAGE_KEY = 'homepage.settings.v1'

export const SCALE_MIN = 0.75
export const SCALE_MAX = 1.6
export const SCALE_STEP = 0.05

const defaultSettings: Settings = {
  bookmarksScale: 1,
  reposScale: 1,
  pinsScale: 1,
}

export function loadSettings(): Settings {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...defaultSettings }
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...defaultSettings, ...parsed }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
