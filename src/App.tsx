import { SquarePen } from 'lucide-react'
import { useEffect, useState } from 'react'
import Clock from './components/Clock'
import GithubRepos from './components/GithubRepos'
import QuickPins from './components/QuickPins'
import SearchBar from './components/SearchBar'
import Sidebar from './components/Sidebar'
import { getAllFavicons, mergeFaviconCache, type FaviconCache } from './lib/faviconCache'
import { loadSettings, saveSettings, type Settings } from './lib/settings'
import { exportData, loadData, mergeData, saveData } from './lib/storage'
import type { HomepageData } from './types'

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [data, setData] = useState<HomepageData>(() => loadData())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  function handleChange(updater: (data: HomepageData) => HomepageData) {
    setData((prev) => updater(prev))
  }

  function updateScale(key: keyof Settings, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function handleExport() {
    const exported = { ...exportData(data), faviconCache: getAllFavicons() }
    const stamp = new Date().toISOString().slice(0, 10)
    download(`homepage-bookmarks-${stamp}.json`, JSON.stringify(exported, null, 2))
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const incoming = JSON.parse(text) as HomepageData & { faviconCache?: FaviconCache }
      if (!incoming.groups || !incoming.bookmarks) throw new Error('invalid file')
      setData((prev) => mergeData(prev, incoming))
      if (incoming.faviconCache) mergeFaviconCache(incoming.faviconCache)
    } catch {
      alert('That file could not be imported — it does not look like a valid export.')
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar
        data={data}
        editing={editing}
        onChange={handleChange}
        onExport={handleExport}
        onImportFile={handleImportFile}
        scale={settings.bookmarksScale}
        onScaleChange={(v) => updateScale('bookmarksScale', v)}
      />
      <main className="flex flex-1 flex-col items-center px-4 pt-[10vh]">
        <Clock />
        <SearchBar />
      </main>
      <GithubRepos
        data={data}
        editing={editing}
        onChange={handleChange}
        scale={settings.reposScale}
        onScaleChange={(v) => updateScale('reposScale', v)}
      />
      <QuickPins
        data={data}
        editing={editing}
        onChange={handleChange}
        scale={settings.pinsScale}
        onScaleChange={(v) => updateScale('pinsScale', v)}
      />

      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        title={editing ? 'Done editing' : 'Edit bookmarks'}
        aria-label={editing ? 'Done editing' : 'Edit bookmarks'}
        className={`fixed bottom-5 left-5 flex size-9 items-center justify-center rounded-md border transition-colors ${
          editing
            ? 'border-(--accent-border) bg-(--accent-bg) text-(--accent)'
            : 'border-(--border) text-(--text) hover:border-(--accent-border) hover:text-(--accent)'
        }`}
      >
        <SquarePen className="size-5" strokeWidth={1.7} />
      </button>
    </div>
  )
}

export default App
