import { useEffect, useState } from 'react'
import type { TimeRange } from './data'

export interface Preferences {
  theme: 'system' | 'light' | 'dark'
  range: Exclude<TimeRange, 'custom'>
  favorites: string[]
}
const DEFAULTS: Preferences = { theme: 'system', range: '3y', favorites: [] }
const KEY = 'macro.preferences.v1'

function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Preferences> | null
    return {
      theme: saved && ['system', 'light', 'dark'].includes(saved.theme ?? '') ? saved.theme! : DEFAULTS.theme,
      range: saved && ['1y', '3y', '5y', 'all'].includes(saved.range ?? '') ? saved.range! : DEFAULTS.range,
      favorites: Array.isArray(saved?.favorites) ? saved.favorites.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch { return DEFAULTS }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    try {
      localStorage.setItem(KEY, JSON.stringify(preferences))
      setStorageError(false)
    } catch { setStorageError(true) }
  }, [preferences])
  const toggleFavorite = (id: string): void => setPreferences((p) => ({
    ...p, favorites: p.favorites.includes(id) ? p.favorites.filter((f) => f !== id) : [...p.favorites, id],
  }))
  return { preferences, setPreferences, toggleFavorite, storageError }
}
