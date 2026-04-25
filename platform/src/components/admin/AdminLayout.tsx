import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Home, Globe, FileText, Settings, LogOut, BarChart2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import ThemeToggle from '@/components/common/ui/ThemeToggle'
import DecryptedText from '@/components/common/animations/DecryptedText'
import AdminGreeting from './AdminGreeting'
import NewPostButton from './sidebar/NewPostButton'
import { cn } from '@/lib/utils'
import { prefetchOnIntent, scheduleIdlePrefetch } from '@/lib/prefetch'
import { postService } from '@/services/postService'
import { settingsService } from '@/services/settingsService'

function SidebarLink({
    to,
    icon: Icon,
    label,
    active,
    external = false,
    onPrefetch,
}: {
    to: string
    icon: typeof Home
    label: string
    active?: boolean
    external?: boolean
    onPrefetch?: () => void
}) {
    const handlePrefetch = () => {
        if (onPrefetch) prefetchOnIntent(onPrefetch)
    }

    return (
        <Link
            to={to}
            target={external ? '_blank' : undefined}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
            onTouchStart={handlePrefetch}
            className={cn(
                'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-normal transition-colors',
                active
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
        >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{label}</span>
        </Link>
    )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div data-section-label className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-foreground/90 first:mt-0">
            {children}
        </div>
    )
}

function SignOutScreen({ greetingName }: { greetingName: string }) {
    useLockBodyScroll()
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground">
            <div className="font-mono text-3xl font-semibold">
                <DecryptedText
                    text={`Goodbye, ${greetingName}.`}
                    speed={80}
                    maxIterations={30}
                    animateOn="view"
                    revealDirection="center"
                />
            </div>
            <div className="mt-4 font-mono text-sm opacity-50">
                <DecryptedText
                    text="TERMINATING SESSION..."
                    speed={50}
                    maxIterations={15}
                    animateOn="view"
                    revealDirection="end"
                />
            </div>
        </div>
    )
}

export default function AdminLayout() {
    const { logout, isAuthenticated, name } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const { settings, fetchSettings } = useAdminStore()
    const greetingName = settings?.siteName || name || 'Admin'
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    useEffect(() => {
        if (!isAuthenticated) return
        useAdminStore.getState().fetchPosts()
        useAdminStore.getState().fetchStats()
        fetchSettings(true)
    }, [isAuthenticated, fetchSettings])

    useEffect(() => {
        if (!isAuthenticated) return
        return scheduleIdlePrefetch(() => {
            postService.prefetchPublicPosts()
            settingsService.prefetchSettings({ preferFresh: true })
        }, 1800)
    }, [isAuthenticated])

    const isActive = (path: string) => location.pathname === path
    const prefetchDashboard = () => {
        const store = useAdminStore.getState()
        void store.fetchPosts()
        void store.fetchStats()
        void store.fetchSettings()
    }
    const prefetchPosts = () => {
        void useAdminStore.getState().fetchPosts()
    }
    const prefetchStats = () => {
        const store = useAdminStore.getState()
        void store.fetchPosts()
        void store.fetchStats()
    }
    const prefetchSettings = () => {
        void useAdminStore.getState().fetchSettings()
    }
    const prefetchLiveBlog = () => {
        postService.prefetchPublicPosts()
        settingsService.prefetchSettings({ preferFresh: true })
    }

    const handleSignOut = async () => {
        setIsLoggingOut(true)
        setTimeout(async () => {
            await logout()
            navigate('/')
        }, 3000)
    }

    if (isLoggingOut) return <SignOutScreen greetingName={greetingName} />

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="fixed z-40 flex h-dvh w-[260px] flex-col border-r bg-card/95 shadow-[1px_0_30px_rgba(0,0,0,0.1)] dark:bg-[#0B0B0B] dark:shadow-[1px_0_30px_rgba(255,255,255,0.08)]">
                <div className="px-5 pb-4 pt-8">
                    <AdminGreeting name={greetingName} />
                </div>

                <NewPostButton onPrefetch={prefetchSettings} />

                <nav className="flex flex-1 flex-col gap-1 px-5 pb-4">
                    <SectionLabel>Menu</SectionLabel>
                    <SidebarLink to="/admin" icon={Home} label="Home" active={isActive('/admin')} onPrefetch={prefetchDashboard} />
                    <SidebarLink
                        to="/admin/posts"
                        icon={FileText}
                        label="Posts"
                        active={isActive('/admin/posts')}
                        onPrefetch={prefetchPosts}
                    />

                    <SectionLabel>Audience</SectionLabel>
                    <SidebarLink
                        to="/admin/stats"
                        icon={BarChart2}
                        label="Stats"
                        active={isActive('/admin/stats')}
                        onPrefetch={prefetchStats}
                    />

                    <SectionLabel>Tools</SectionLabel>
                    <SidebarLink
                        to="/admin/settings"
                        icon={Settings}
                        label="Settings"
                        active={isActive('/admin/settings')}
                        onPrefetch={prefetchSettings}
                    />
                    <SidebarLink to="/blog" icon={Globe} label="Live ↗" external onPrefetch={prefetchLiveBlog} />
                </nav>

                <div className="p-5">
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main relative ml-[260px] h-screen flex-1 overflow-hidden bg-background">
                <div className="absolute right-6 top-6 z-50">
                    <ThemeToggle />
                </div>

                <div className="admin-scroll absolute inset-0 z-10 overflow-y-auto overflow-x-hidden">
                    <div className="admin-content mx-auto max-w-[1000px] px-8 py-10">
                        <Outlet />
                    </div>
                </div>
            </main>

            <style>{`
                @media (max-width: 640px) {
                    aside {
                        top: auto !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                        height: calc(70px + env(safe-area-inset-bottom)) !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        border-right: 0 !important;
                        border-top: 1px solid hsl(var(--border)) !important;
                        overflow-x: hidden !important;
                        overflow-y: hidden !important;
                        padding: 0 max(0.35rem, env(safe-area-inset-right)) env(safe-area-inset-bottom) max(0.35rem, env(safe-area-inset-left)) !important;
                    }
                    aside > div:first-child,
                    aside [data-section-label] { display: none !important; }
                    aside .px-5,
                    aside .pb-6 {
                        padding-left: 0.35rem !important;
                        padding-right: 0.35rem !important;
                        padding-bottom: 0 !important;
                    }
                    aside nav {
                        min-width: 0;
                        flex: 1 1 auto;
                        flex-direction: row !important;
                        align-items: center;
                        justify-content: space-evenly;
                        gap: 0.2rem !important;
                        padding: 0 !important;
                    }
                    aside nav a span,
                    aside button span,
                    aside [data-greeting] { display: none !important; }
                    aside nav a, aside button {
                        justify-content: center;
                        width: 42px !important;
                        height: 42px !important;
                        padding: 0 !important;
                        border-radius: 9999px;
                        margin: 0 auto;
                    }
                    aside > div:last-child {
                        flex: 0 0 42px !important;
                        padding: 0 !important;
                    }
                    aside .new-post-btn {
                        flex: 0 0 42px !important;
                        padding: 0 !important;
                    }
                    .admin-main {
                        margin-left: 0 !important;
                        height: 100dvh !important;
                    }
                    .admin-scroll {
                        padding-bottom: calc(82px + env(safe-area-inset-bottom)) !important;
                    }
                    .admin-content {
                        padding: 4.5rem 1rem 2rem !important;
                        max-width: 100% !important;
                    }
                    .admin-main > .absolute.right-6.top-6 {
                        top: 1rem !important;
                        right: 1rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
