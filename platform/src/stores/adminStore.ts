import { create } from 'zustand'
import { postService } from '@/services/postService'
import { settingsService, type SiteSettings } from '@/services/settingsService'
import { statsService, type BasicStats } from '@/services/statsService'
import type { Post } from '@/types'

interface AdminState {
    posts: Post[] | null
    postsLoading: boolean
    postsLastFetched: number | null
    fetchPosts: (force?: boolean) => Promise<void>
    invalidatePosts: () => void
    deletePostFromCache: (id: string) => void

    settings: SiteSettings | null
    settingsLoading: boolean
    settingsLastFetched: number | null
    fetchSettings: (force?: boolean) => Promise<void>
    updateSettingsInCache: (settings: SiteSettings) => void

    stats: BasicStats | null
    statsLoading: boolean
    statsLastFetched: number | null
    fetchStats: (force?: boolean) => Promise<void>

    reset: () => void
}

const CACHE_DURATION = 5 * 60 * 1000

export const useAdminStore = create<AdminState>((set, get) => ({
    posts: null,
    postsLoading: false,
    postsLastFetched: null,
    fetchPosts: async (force = false) => {
        const { posts, postsLastFetched, postsLoading } = get()
        if (postsLoading) return
        const now = Date.now()
        if (!force && posts && postsLastFetched && now - postsLastFetched < CACHE_DURATION) return
        set({ postsLoading: true })
        try {
            const fetched = await postService.getPosts()
            set({ posts: fetched, postsLastFetched: Date.now(), postsLoading: false })
        } catch (e) {
            console.error('Failed to fetch posts:', e)
            set({ postsLoading: false })
        }
    },
    invalidatePosts: () => set({ postsLastFetched: null }),
    deletePostFromCache: (id) => {
        const { posts } = get()
        if (posts) set({ posts: posts.filter((p) => p.id !== id) })
    },

    settings: null,
    settingsLoading: false,
    settingsLastFetched: null,
    fetchSettings: async (force = false) => {
        const { settings, settingsLastFetched, settingsLoading } = get()
        if (settingsLoading) return
        const now = Date.now()
        if (!force && settings && settingsLastFetched && now - settingsLastFetched < CACHE_DURATION)
            return
        set({ settingsLoading: true })
        try {
            const fetched = await settingsService.getSettings()
            set({ settings: fetched, settingsLastFetched: Date.now(), settingsLoading: false })
        } catch (e) {
            console.error('Failed to fetch settings:', e)
            set({ settingsLoading: false })
        }
    },
    updateSettingsInCache: (settings) =>
        set({ settings, settingsLastFetched: Date.now() }),

    stats: null,
    statsLoading: false,
    statsLastFetched: null,
    fetchStats: async (force = false) => {
        const { stats, statsLastFetched, statsLoading } = get()
        if (statsLoading) return
        const now = Date.now()
        if (!force && stats && statsLastFetched && now - statsLastFetched < CACHE_DURATION) return
        set({ statsLoading: true })
        try {
            const fetched = await statsService.getStats()
            set({ stats: fetched, statsLastFetched: Date.now(), statsLoading: false })
        } catch (e) {
            console.error('Failed to fetch stats:', e)
            set({ statsLoading: false })
        }
    },

    reset: () =>
        set({
            posts: null,
            postsLoading: false,
            postsLastFetched: null,
            settings: null,
            settingsLoading: false,
            settingsLastFetched: null,
            stats: null,
            statsLoading: false,
            statsLastFetched: null,
        }),
}))
