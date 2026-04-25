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

                <Card className="overflow-hidden border-border bg-transparent shadow-none">
                    <CardContent className="px-0 py-4 sm:py-6">
                        <div className="h-[300px] w-full min-w-0 overflow-hidden">
                            {!ready || graphData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    {!ready ? null : 'No stats recorded yet'}
                                </div>
                            ) : (
                                <NativeAnalyticsChart data={graphData} />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>

            <div className="mb-8">
                <h2 className="mb-5 text-xl font-semibold text-muted-foreground">Latest Post</h2>
                {dashboardStats.latestPost ? (
                    <Link
                        to={`/blog/${dashboardStats.latestPost.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block no-underline"
                    >
                        <Card className="border-border bg-transparent shadow-none transition-all hover:border-foreground hover:scale-[1.005]">
                            <CardContent className="p-6">
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
                    <Card className="border-border bg-transparent shadow-none">
                        <CardContent className="p-6">
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

function NativeAnalyticsChart({ data }: { data: ChartPoint[] }) {
    const width = 780
    const height = 320
    const padding = { top: 38, right: 24, bottom: 50, left: 64 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const values = data.flatMap((point) => [point.views || 0, point.shares || 0])
    const maxValue = niceMax(Math.max(1, ...values))
    const baseline = padding.top + innerHeight
    const slotWidth = data.length > 0 ? innerWidth / data.length : innerWidth
    const barWidth = Math.max(10, Math.min(34, slotWidth * 0.48))

    const xFor = (index: number) =>
        padding.left + (data.length <= 1 ? innerWidth / 2 : index * slotWidth + slotWidth / 2)
    const yFor = (value: number) => baseline - (value / maxValue) * innerHeight
    const linePath = (key: 'shares') =>
        data
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point[key] || 0)}`)
            .join(' ')
    const yTicks = [maxValue, maxValue / 2, 0]
    const labelStep = Math.max(1, Math.ceil(data.length / 5))

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-full w-full max-w-[780px] overflow-visible"
            role="img"
            aria-label="Views and shares over time"
        >
            <defs>
                <linearGradient id="dash_bar_views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00cbff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#00cbff" stopOpacity="0.28" />
                </linearGradient>
            </defs>

            <text x={padding.left} y={18} fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600">
                Views
            </text>
            <g transform={`translate(${width - padding.right - 148} 8)`}>
                <rect width="10" height="10" rx="3" fill="#00cbff" opacity="0.75" />
                <text x="16" y="10" fill="hsl(var(--muted-foreground))" fontSize="12">Views</text>
                <line x1="70" x2="84" y1="5" y2="5" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <text x="90" y="10" fill="hsl(var(--muted-foreground))" fontSize="12">Shares</text>
            </g>

            {yTicks.map((tick) => {
                const y = yFor(tick)
                return (
                    <g key={tick}>
                        <line
                            x1={padding.left}
                            x2={width - padding.right}
                            y1={y}
                            y2={y}
                            stroke="hsl(var(--border))"
                            strokeDasharray={tick === 0 ? undefined : '4 6'}
                            strokeOpacity={tick === 0 ? 0.9 : 0.65}
                        />
                        <text
                            x={padding.left - 12}
                            y={y + 4}
                            textAnchor="end"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="12"
                        >
                            {formatAxisValue(tick)}
                        </text>
                    </g>
                )
            })}

            {data.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                    <rect
                        x={xFor(index) - barWidth / 2}
                        y={yFor(point.views || 0)}
                        width={barWidth}
                        height={Math.max(1, baseline - yFor(point.views || 0))}
                        rx="6"
                        fill="url(#dash_bar_views)"
                    >
                        <title>{`${point.name || point.date}: ${point.views || 0} views, ${point.shares || 0} shares`}</title>
                    </rect>
                    {index % labelStep === 0 || index === data.length - 1 ? (
                        <text
                            x={xFor(index)}
                            y={height - 16}
                            textAnchor="middle"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="12"
                        >
                            {point.name || point.date}
                        </text>
                    ) : null}
                </g>
            ))}

            <line x1={padding.left} x2={padding.left} y1={padding.top} y2={baseline} stroke="hsl(var(--border))" />
            <line x1={padding.left} x2={width - padding.right} y1={baseline} y2={baseline} stroke="hsl(var(--border))" />
            {data.length > 0 && (
                <path d={linePath('shares')} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {data.map((point, index) => (
                <circle
                    key={`${point.date}-${index}-share`}
                    cx={xFor(index)}
                    cy={yFor(point.shares || 0)}
                    r="3.5"
                    fill="#f59e0b"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                />
            ))}
        </svg>
    )
}

function niceMax(value: number) {
    if (value <= 1) return 1
    const power = 10 ** Math.floor(Math.log10(value))
    const normalized = value / power
    const rounded = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
    return rounded * power
}

function formatAxisValue(value: number) {
    return Math.round(value).toLocaleString()
}
