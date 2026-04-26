import { useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mitimiti_theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    const initial = stored === 'dark' ? 'dark' : 'light'
    document.documentElement.dataset.theme = initial
    return initial
  })

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      document.documentElement.dataset.theme = next
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return { theme, toggleTheme }
}
