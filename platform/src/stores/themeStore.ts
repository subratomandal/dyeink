import { createNativeStore } from '@/lib/nativeStore'

type Theme = 'light' | 'dark'

interface ThemeState {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'theme-storage'

function readStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'dark'
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (!stored) return 'dark'
        const parsed = JSON.parse(stored)
        const theme = parsed?.state?.theme || parsed?.theme || stored
        return theme === 'light' ? 'light' : 'dark'
    } catch {
        return 'dark'
    }
}

function updateDomTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
    }
}

function persistTheme(theme: Theme) {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { theme }, version: 0 }))
    } catch {
        /* localStorage can be unavailable in hardened browser contexts */
    }
}

const initialTheme = readStoredTheme()
updateDomTheme(initialTheme)

export const useThemeStore = createNativeStore<ThemeState>((set, get) => ({
    theme: initialTheme,
    toggleTheme: () => {
        const theme = get().theme === 'light' ? 'dark' : 'light'
        updateDomTheme(theme)
        persistTheme(theme)
        set({ theme })
    },
    setTheme: (theme) => {
        updateDomTheme(theme)
        persistTheme(theme)
        set({ theme })
    },
}))
