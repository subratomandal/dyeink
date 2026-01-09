import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
export interface User {
    id: string
    email: string
    name: string
    isAdmin: boolean
    createdAt: string
    updatedAt: string
    user_metadata?: {
        full_name?: string
        [key: string]: any
    }
}
interface AuthState {
    session: Session | null
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    setSession: (session: Session | null) => void
    setUser: (user: User | null) => void
    logout: () => Promise<void>
    initialize: () => Promise<void>
}
const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        isAdmin: supabaseUser.user_metadata?.is_admin || false,
        createdAt: supabaseUser.created_at || new Date().toISOString(),
        updatedAt: supabaseUser.updated_at || new Date().toISOString(),
        user_metadata: supabaseUser.user_metadata
    }
}
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: true,
            setSession: (session) => {
                const user = mapSupabaseUser(session?.user ?? null)
                set({
                    session,
                    user,
                    isAuthenticated: !!session,
                    isLoading: false
                })
            },
            setUser: (user) => {
                set({ user, isAuthenticated: !!user })
            },
            logout: async () => {
                await supabase.auth.signOut()
                set({
                    session: null,
                    user: null,
                    isAuthenticated: false,
                    isLoading: false
                })
            },
            initialize: async () => {
                set({ isLoading: true })
                const { data: { session } } = await supabase.auth.getSession()
                let user = null
                let validSession = session
                if (session) {
                    const { data: { user: validatedUser }, error } = await supabase.auth.getUser()
                    if (error || !validatedUser) {
                        validSession = null
                        user = null
                        await supabase.auth.signOut()
                    } else {
                        user = mapSupabaseUser(validatedUser)
                    }
                }
                set({
                    session: validSession,
                    user,
                    isAuthenticated: !!validSession,
                    isLoading: false
                })
                supabase.auth.onAuthStateChange((_event, session) => {
                    const user = mapSupabaseUser(session?.user ?? null)
                    set({
                        session,
                        user,
                        isAuthenticated: !!session
                    })
                })
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
)

