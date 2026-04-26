import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import Landing from '@/features/landing/Landing'
import Login from '@/features/auth/Login'
import Setup from '@/features/auth/Setup'
import Blog from '@/features/blog/Blog'
import Dashboard from '@/features/admin/Dashboard'
import Posts from '@/features/admin/Posts'
import Editor from '@/features/admin/Editor'
import Settings from '@/features/admin/Settings'
import Stats from '@/features/admin/Stats'
import AdminLayout from '@/components/admin/AdminLayout'
import { ToastContainer } from '@/components/common/feedback/Toast'
import { SimpleErrorBoundary } from '@/components/common/feedback/SimpleErrorBoundary'
import AuthShellSkeleton from '@/components/admin/skeletons/AuthShellSkeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/styles/globals.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, hasChecked, needsSetup, initialize } = useAuthStore()

    useEffect(() => {
        if (!hasChecked && !isLoading) {
            initialize()
        }
    }, [hasChecked, initialize, isLoading])

    if (!hasChecked || isLoading) return <AuthShellSkeleton />
    if (needsSetup) return <Navigate to="/setup" replace />
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

function ThemeInit() {
    const theme = useThemeStore((state) => state.theme)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])
    return null
}

function RootRoute() {
    return <Landing />
}

function isDefaultAppHost(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/\.$/, '')
    return (
        normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '0.0.0.0' ||
        normalized.endsWith('.workers.dev') ||
        normalized.endsWith('.pages.dev')
    )
}

function isBlogPath(pathname: string) {
    return pathname === '/blog' || pathname.startsWith('/blog/')
}

function AppRoutes() {
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname
    const isCustomHost = typeof window !== 'undefined' && !isDefaultAppHost(window.location.hostname)

    if (isCustomHost && !isBlogPath(currentPath)) {
        return (
            <Routes>
                <Route path="*" element={<Navigate to="/blog" replace />} />
            </Routes>
        )
    }

    return (
        <Routes>
            <Route path="/" element={<RootRoute />} />

            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />

            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <SimpleErrorBoundary>
                            <AdminLayout />
                        </SimpleErrorBoundary>
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="posts" element={<Posts />} />
                <Route path="stats" element={<Stats />} />
                <Route path="settings" element={<Settings />} />
            </Route>

            <Route
                path="/admin/posts/new"
                element={
                    <ProtectedRoute>
                        <Editor />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/posts/:id/edit"
                element={
                    <ProtectedRoute>
                        <Editor />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TooltipProvider>
                <ThemeInit />
                <ToastContainer />
                <AppRoutes />
            </TooltipProvider>
        </BrowserRouter>
    )
}

export default App
