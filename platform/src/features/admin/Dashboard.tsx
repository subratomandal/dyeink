import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStore } from '@/stores/adminStore'
import DashboardSkeleton from '@/components/admin/skeletons/DashboardSkeleton'
import { Card, CardContent } from '@/components/ui/card'

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex-1 py-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
        </div>
    )
}

export default function Dashboard() {
    const { posts, postsLoading, stats, statsLoading } = useAdminStore()
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const timer = requestAnimationFrame(() => setReady(true))
        return () => cancelAnimationFrame(timer)
    }, [])

    const dashboardStats = useMemo(() => {
        const safePosts = posts || []
        return {
            totalPosts: safePosts.length,
            publishedPosts: safePosts.filter((p) => p.published).length,
            latestPost: safePosts[0] || null,
        }
    }, [posts])

    const graphData = useMemo(() => {
        let rawData: any[] = []
        if (stats?.graphData && stats.graphData.length > 0) {
            rawData = [...stats.graphData]
        } else {
            rawData = Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (6 - i))
                return {
                    name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    date: format(d, 'yyyy-MM-dd'),
                    views: 0,
                    shares: 0,
                    published: 0,
                }
            })
        }
        return rawData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [stats])

    const showLoader = (postsLoading && !posts) || (statsLoading && !stats)

    if (showLoader) return <DashboardSkeleton />

    return (
        <div className="animate-fade-in pb-16">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-4xl font-semibold">Dashboard</h1>
            </div>

            <section className="mb-12">
                <h2 className="mb-6 text-xl font-semibold text-muted-foreground">Analytics</h2>

                <div className="mb-8 flex gap-8 dashboard-stats-row">
                    <Stat label="Total Views" value={(stats?.totalViews || 0).toLocaleString()} />
                    <Stat label="Total Shares" value={(stats?.totalShares || 0).toLocaleString()} />
                    <Stat label="Published" value={dashboardStats.publishedPosts.toString()} />
                </div>

                <div className="h-[300px] w-full min-w-0">
                    {!ready || graphData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {!ready ? null : 'No stats recorded yet'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" debounce={300}>
                            <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -45, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="dash_grad_views" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00cbff" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#00cbff" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="dash_grad_pub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    domain={[0, 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        color: 'hsl(var(--popover-foreground))',
                                    }}
                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="published"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#dash_grad_pub)"
                                    isAnimationActive={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#00cbff"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#dash_grad_views)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </section>

            <div className="mb-8">
                <h2 className="mb-6 text-xl font-semibold text-muted-foreground">Latest Post</h2>
                {dashboardStats.latestPost ? (
                    <Link to="/blog" className="block no-underline">
                        <Card className="transition-all hover:border-foreground hover:scale-[1.005]">
                            <CardContent className="p-6">
                                <h3 className="mb-4 font-heading text-2xl font-normal leading-tight tracking-tight text-foreground">
                                    {dashboardStats.latestPost.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="font-heading text-xs text-muted-foreground">
                                        {new Date(dashboardStats.latestPost.createdAt).toLocaleDateString('en-US')}
                                    </span>
                                    <span className="flex items-center gap-1 font-heading text-sm text-foreground">
                                        View Post <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ) : (
                    <div className="rounded-xl p-6 text-center text-muted-foreground">
                        No posts yet.{' '}
                        <Link to="/admin/posts/new" className="text-foreground underline">
                            Create one?
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 640px) {
                    .dashboard-stats-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1rem !important; }
                    .dashboard-stats-row > div { padding: 0.5rem 0 !important; }
                }
            `}</style>
        </div>
    )
}
