import apiClient from '@/lib/apiClient'
import { createNativeStore } from '@/lib/nativeStore'

interface AuthState {
    isAuthenticated: boolean
    isLoading: boolean
    hasChecked: boolean
    needsSetup: boolean
    name: string
    email: string
    initialize: () => Promise<void>
    login: (password: string) => Promise<void>
    setup: (password: string) => Promise<void>
    logout: () => Promise<void>
}

export const useAuthStore = createNativeStore<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: false,
    hasChecked: false,
    needsSetup: false,
    name: '',
    email: '',

    initialize: async () => {
        set({ isLoading: true })
        try {
            const status = await apiClient.get('/setup/status')
            if (!status.data.initialized) {
                set({ isLoading: false, hasChecked: true, needsSetup: true, isAuthenticated: false })
                return
            }
            try {
                const me = await apiClient.get('/auth/me')
                set({
                    isAuthenticated: true,
                    isLoading: false,
                    hasChecked: true,
                    needsSetup: false,
                    name: me.data.name || 'Admin',
                    email: me.data.email || '',
                })
            } catch {
                set({ isAuthenticated: false, isLoading: false, hasChecked: true, needsSetup: false })
            }
        } catch {
            set({ isAuthenticated: false, isLoading: false, hasChecked: true, needsSetup: false })
        }
    },

    login: async (password) => {
        await apiClient.post('/auth/login', { password })
        const me = await apiClient.get('/auth/me')
        set({
            isAuthenticated: true,
            hasChecked: true,
            needsSetup: false,
            name: me.data.name || 'Admin',
            email: me.data.email || '',
        })
    },

    setup: async (password) => {
        await apiClient.post('/setup', { password })
        const me = await apiClient.get('/auth/me')
        set({
            isAuthenticated: true,
            hasChecked: true,
            needsSetup: false,
            name: me.data.name || 'Admin',
            email: me.data.email || '',
        })
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout')
        } catch {
            /* swallow - local state is cleared either way */
        }
        set({ isAuthenticated: false, hasChecked: true, name: '', email: '' })
    },
}))

if (typeof window !== 'undefined') {
    window.addEventListener('auth:unauthorized', () => {
        useAuthStore.setState({ isAuthenticated: false, isLoading: false, hasChecked: true })
    })
}

export default useAuthStore
