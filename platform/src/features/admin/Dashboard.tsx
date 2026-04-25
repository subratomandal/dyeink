import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStore } from '@/stores/adminStore'
import DashboardSkeleton from '@/components/admin/skeletons/DashboardSkeleton'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateKey, formatDateShort } from '@/lib/date'

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
                    date: formatDateKey(d),
                    views: 0,
                    shares: 0,
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

                <Card className="overflow-hidden shadow-none">
                    <CardContent className="p-4 sm:p-6">
                        <div className="h-[300px] w-full min-w-0 overflow-hidden">
                            {!ready || graphData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    {!ready ? null : 'No stats recorded yet'}
                                </div>
                            ) : (
                                <NativeAreaChart data={graphData} />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>

            <div className="mb-8">
                {dashboardStats.latestPost ? (
                    <Link to="/blog" className="block no-underline">
                        <Card className="transition-all hover:border-foreground hover:scale-[1.005]">
                            <CardContent className="p-6">
                                <h2 className="mb-5 text-xl font-semibold text-muted-foreground">Latest Post</h2>
                                <h3 className="mb-4 break-words font-heading text-2xl font-normal leading-tight tracking-tight text-foreground">
                                    {dashboardStats.latestPost.title}
                                </h3>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="font-heading text-xs text-muted-foreground">
                                        {formatDateShort(dashboardStats.latestPost.createdAt)}
                                    </span>
                                    <span className="flex items-center gap-1 font-heading text-sm text-foreground">
                                        View Post <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ) : (
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="mb-5 text-xl font-semibold text-muted-foreground">Latest Post</h2>
                            <div className="text-center text-muted-foreground">
                                No posts yet.{' '}
                                <Link to="/admin/posts/new" className="text-foreground underline">
                                    Create one?
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
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

type ChartPoint = {
    date: string
    name?: string
    views?: number
    shares?: number
}

function NativeAreaChart({ data }: { data: ChartPoint[] }) {
    const width = 720
    const height = 300
    const padding = { top: 20, right: 48, bottom: 44, left: 48 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const values = data.flatMap((point) => [point.views || 0, point.shares || 0])
    const maxValue = Math.max(1, ...values)

    const xFor = (index: number) =>
        padding.left + (data.length <= 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth)
    const yFor = (value: number) => padding.top + innerHeight - (value / maxValue) * innerHeight
    const linePath = (key: 'views' | 'shares') =>
        data
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point[key] || 0)}`)
            .join(' ')
    const areaPath = (key: 'views' | 'shares') => {
        const line = linePath(key)
        return `${line} L ${xFor(data.length - 1)} ${padding.top + innerHeight} L ${xFor(0)} ${
            padding.top + innerHeight
        } Z`
    }
    const gridLines = Array.from({ length: 4 }, (_, index) => {
        const ratio = index / 3
        return padding.top + ratio * innerHeight
    })
    const labelStep = Math.max(1, Math.ceil(data.length / 5))

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-full w-full overflow-hidden"
            role="img"
            aria-label="Views and shares over time"
        >
            <defs>
                <linearGradient id="dash_grad_views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00cbff" stopOpacity="0.22" />
                    <stop offset="95%" stopColor="#00cbff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="dash_grad_shares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity="0.18" />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
            </defs>

            {gridLines.map((y, index) => (
                <line
                    key={index}
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                />
            ))}

            <path d={areaPath('shares')} fill="url(#dash_grad_shares)" />
            <path d={areaPath('views')} fill="url(#dash_grad_views)" />
            <path d={linePath('shares')} fill="none" stroke="#8b5cf6" strokeWidth="2" />
            <path d={linePath('views')} fill="none" stroke="#00cbff" strokeWidth="2" />

            {data.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                    <circle cx={xFor(index)} cy={yFor(point.views || 0)} r="3" fill="#00cbff">
                        <title>{`${point.name || point.date}: ${point.views || 0} views, ${point.shares || 0} shares`}</title>
                    </circle>
                    {index % labelStep === 0 || index === data.length - 1 ? (
                        <text
                            x={xFor(index)}
                            y={height - 10}
                            textAnchor="middle"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="12"
                        >
                            {point.name || point.date}
                        </text>
                    ) : null}
                </g>
            ))}

            <text x={padding.left} y={padding.top + 10} fill="hsl(var(--muted-foreground))" fontSize="12">
                {maxValue.toLocaleString()}
            </text>
            <text x={padding.left} y={padding.top + innerHeight} fill="hsl(var(--muted-foreground))" fontSize="12">
                0
            </text>
        </svg>
    )
}
