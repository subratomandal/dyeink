
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { postService } from '../services/postService'
import { settingsService, type SiteSettings } from '../services/settingsService'
import apiClient from '../lib/apiClient'
import type { Post } from '../types'
interface AdminState {
    posts: Post[] | null
    postsLoading: boolean
    postsLastFetched: number | null
    fetchPosts: (force?: boolean) => Promise<void>
    invalidatePosts: () => void
    deletePostFromCache: (id: number) => void
    settings: SiteSettings | null
    settingsLoading: boolean
    settingsLastFetched: number | null
    fetchSettings: (force?: boolean) => Promise<void>
    updateSettingsInCache: (settings: SiteSettings) => void
    stats: {
        totalViews: number
        totalShares: number
        graphData: any[]
    } | null
    statsLoading: boolean
    statsLastFetched: number | null
    fetchStats: (userId: string, force?: boolean) => Promise<void>
    reset: () => void
}
const CACHE_DURATION = 5 * 60 * 1000
export const useAdminStore = create<AdminState>()(
    persist(
        (set, get) => ({
            posts: null,
            postsLoading: false,
            postsLastFetched: null,
            fetchPosts: async (force = false) => {
                const { posts, postsLastFetched, postsLoading } = get()
                if (postsLoading) return
                const now = Date.now()
                if (!force && posts && postsLastFetched && (now - postsLastFetched < CACHE_DURATION)) {
                    return
                }
                set({ postsLoading: true })
                try {
                    const fetchedPosts = await postService.getPosts()
                    set({
                        posts: fetchedPosts,
                        postsLastFetched: Date.now(),
                        postsLoading: false
                    })
                } catch (error) {
                    console.error('Failed to fetch posts:', error)
                    set({ postsLoading: false })
                }
            },
            invalidatePosts: () => set({ postsLastFetched: null }),
            deletePostFromCache: (id: number) => {
                const { posts } = get()
                if (posts) {
                    set({ posts: posts.filter(p => p.id !== id) })
                }
            },
            settings: null,
            settingsLoading: false,
            settingsLastFetched: null,
            fetchSettings: async (force = false) => {
                const { settings, settingsLastFetched, settingsLoading } = get()
                if (settingsLoading) return
                const now = Date.now()
                if (!force && settings && settingsLastFetched && (now - settingsLastFetched < CACHE_DURATION)) {
                    return
                }
                set({ settingsLoading: true })
                try {
                    const fetchedSettings = await settingsService.getSettings()
                    set({
                        settings: fetchedSettings,
                        settingsLastFetched: Date.now(),
                        settingsLoading: false
                    })
                } catch (error) {
                    console.error('Failed to fetch settings:', error)
                    set({ settingsLoading: false })
                }
            },
            updateSettingsInCache: (newSettings: SiteSettings) => {
                set({ settings: newSettings, settingsLastFetched: Date.now() })
            },
            stats: null,
            statsLoading: false,
            statsLastFetched: null,
            fetchStats: async (_userId: string, force = false) => {
                const { stats, statsLastFetched, statsLoading } = get()
                if (statsLoading) return
                const now = Date.now()
                if (!force && stats && statsLastFetched && (now - statsLastFetched < CACHE_DURATION)) {
                    return
                }

                set({ statsLoading: true })
                try {
                    const response = await apiClient.get('/stats')
                    const data = response.data

                    set({
                        stats: {
                            totalViews: data.totalViews || 0,
                            totalShares: data.totalShares || 0,
                            graphData: data.graphData || []
                        },
                        statsLastFetched: Date.now(),
                        statsLoading: false
                    })

                } catch (error) {
                    console.error('Failed to fetch stats:', error)
                    set({ statsLoading: false })
                }
            },
            reset: () => set({
                posts: null,
                postsLoading: false,
                postsLastFetched: null,
                settings: null,
                settingsLoading: false,
                settingsLastFetched: null,
                stats: null,
                statsLoading: false,
                statsLastFetched: null
            })
        }),
        {
            name: 'admin-storage',
            partialize: (state) => ({
                posts: state.posts,
                postsLastFetched: state.postsLastFetched,
                settings: state.settings,
                settingsLastFetched: state.settingsLastFetched,
                stats: state.stats,
                statsLastFetched: state.statsLastFetched
            })
        }
    )
)
