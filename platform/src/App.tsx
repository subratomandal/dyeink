import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import Landing from './features/landing/Landing'
import Login from './features/auth/Login'
import Register from './features/auth/Register'
import ForgotPassword from './features/auth/ForgotPassword'
import ResetPassword from './features/auth/ResetPassword'
import Blog from './features/blog/Blog'
import Dashboard from './features/admin/Dashboard'
import Posts from './features/admin/Posts'
import Editor from './features/admin/Editor'
import Domains from './features/admin/Domains'
import Settings from './features/admin/Settings'
import Stats from './features/admin/Stats'
import AdminLayout from './components/admin/AdminLayout'
import { ToastContainer } from './components/common/feedback/Toast'
import { SimpleErrorBoundary } from './components/common/feedback/SimpleErrorBoundary'
import AuthShellSkeleton from './components/admin/skeletons/AuthShellSkeleton'
import './styles/globals.css'

interface ProtectedRouteProps {
    children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuthStore()

    if (isLoading) {
        return <>{children}</>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }
    return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore()
    if (isLoading) {
        return <AuthShellSkeleton />
    }
    if (isAuthenticated) {
        return <Navigate to="/admin" replace />
    }
    return <>{children}</>
}

function ThemeInit() {
    const theme = useThemeStore((state) => state.theme)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])
    return null
}

function AuthListener() {
    const navigate = useNavigate()
    const initialize = useAuthStore((state) => state.initialize)

    useEffect(() => {
        // Initialize Auth0 authentication
        initialize()

        // Handle password recovery redirect (if needed)
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.has('password_reset')) {
            navigate('/admin/settings?tab=Security')
        }
    }, [initialize, navigate])

    return null
}

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ThemeInit />
            <AuthListener />
            <ToastContainer />
            <Routes>
                <Route path="/" element={
                    !window.location.hostname.includes('localhost') &&
                        !window.location.hostname.includes('vercel.app') &&
                        window.location.hostname !== 'dyeink.subratomandal.com' ? (
                        <Blog isCustomDomain={true} />
                    ) : (
                        <PublicRoute>
                            <Landing />
                        </PublicRoute>
                    )
                } />

                <Route path="/blog" element={<Blog />} />

                <Route path="/:subdomain" element={<Blog />} />
                <Route path="/:subdomain/:slug" element={<Blog />} />

                <Route path="/login" element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } />
                <Route path="/register" element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                } />
                <Route path="/forgot-password" element={
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                } />
                <Route path="/reset-password" element={
                    <ResetPassword />
                } />

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
                    <Route path="domains" element={<Domains />} />
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
            </Routes>
        </BrowserRouter>
    )
}

export default App
