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

function SidebarLink({
    to,
    icon: Icon,
    label,
    active,
    external = false,
}: {
    to: string
    icon: typeof Home
    label: string
    active?: boolean
    external?: boolean
}) {
    return (
        <Link
            to={to}
            target={external ? '_blank' : undefined}
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
        <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-foreground/90 first:mt-0">
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
    const greetingName = settings?.authorName || settings?.siteName || name || 'Admin'
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    useEffect(() => {
        if (!isAuthenticated) return
        useAdminStore.getState().fetchPosts()
        useAdminStore.getState().fetchStats()
        fetchSettings()
    }, [isAuthenticated, fetchSettings])

    const isActive = (path: string) => location.pathname === path

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

                <NewPostButton />

                <nav className="flex flex-1 flex-col gap-1 px-5 pb-4">
                    <SectionLabel>Menu</SectionLabel>
                    <SidebarLink to="/admin" icon={Home} label="Home" active={isActive('/admin')} />
                    <SidebarLink
                        to="/admin/posts"
                        icon={FileText}
                        label="Posts"
                        active={isActive('/admin/posts')}
                    />

                    <SectionLabel>Audience</SectionLabel>
                    <SidebarLink
                        to="/admin/stats"
                        icon={BarChart2}
                        label="Stats"
                        active={isActive('/admin/stats')}
                    />

                    <SectionLabel>Tools</SectionLabel>
                    <SidebarLink
                        to="/admin/settings"
                        icon={Settings}
                        label="Settings"
                        active={isActive('/admin/settings')}
                    />
                    <SidebarLink to="/blog" icon={Globe} label="Live ↗" external />
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

            <main className="relative ml-[260px] h-screen flex-1 overflow-hidden bg-background">
                <div className="absolute right-6 top-6 z-50">
                    <ThemeToggle />
                </div>

                <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden">
                    <div className="mx-auto max-w-[1000px] px-8 py-10">
                        <Outlet />
                    </div>
                </div>
            </main>

            <style>{`
                @media (max-width: 640px) {
                    aside { width: 70px !important; }
                    aside .px-5, aside .pb-6 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
                    aside nav { align-items: center; }
                    aside nav a span,
                    aside button span,
                    aside .new-post-btn .magic-text,
                    aside [data-greeting] { display: none !important; }
                    aside nav a, aside button {
                        justify-content: center;
                        width: 44px; height: 44px; padding: 0;
                        border-radius: 9999px;
                        margin: 0 auto;
                    }
                    main { margin-left: 70px !important; }
                    main .mx-auto { padding: 2rem 1rem !important; }
                }
            `}</style>
        </div>
    )
}

