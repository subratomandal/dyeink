import { ArrowRight } from 'lucide-react'
import { max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
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
                        <div className="h-[340px] w-full min-w-0 overflow-hidden">
                            {!ready || graphData.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    {!ready ? null : 'No stats recorded yet'}
                                </div>
                            ) : (
                                <CombinedAnalyticsChart data={graphData} />
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

function CombinedAnalyticsChart({ data }: { data: ChartPoint[] }) {
    const width = 980
    const height = 340
    const padding = { top: 34, right: 84, bottom: 48, left: 58 }
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom
    const points = data.map((point, index) => ({
        index,
        date: point.date,
        label: point.name || point.date,
        views: Math.max(0, point.views || 0),
        shares: Math.max(0, point.shares || 0),
    }))
    const xScale = scaleLinear()
        .domain([0, Math.max(1, points.length - 1)])
        .range([padding.left, padding.left + innerWidth])
    const yScale = scaleLinear()
        .domain([0, Math.max(1, max(points.flatMap((point) => [point.views, point.shares])) || 0)])
        .range([padding.top + innerHeight, padding.top])
        .nice(4)
    const yTicks = yScale.ticks(4)
    const labelStep = Math.max(1, Math.ceil(points.length / 5))
    const baseline = yScale(0)
    const viewsPath = line<(typeof points)[number]>()
        .curve(curveMonotoneX)
        .x((point) => xScale(point.index))
        .y((point) => yScale(point.views))(points)
    const sharesPath = line<(typeof points)[number]>()
        .curve(curveMonotoneX)
        .x((point) => xScale(point.index))
        .y((point) => yScale(point.shares))(points)
    const viewsArea = area<(typeof points)[number]>()
        .curve(curveMonotoneX)
        .x((point) => xScale(point.index))
        .y0(baseline)
        .y1((point) => yScale(point.views))(points)
    const lastPoint = points[points.length - 1]
    const previousPoint = points[points.length - 2]
    const viewsDelta = lastPoint && previousPoint ? lastPoint.views - previousPoint.views : 0
    const sharesDelta = lastPoint && previousPoint ? lastPoint.shares - previousPoint.shares : 0
    const viewsLabelY = lastPoint ? yScale(lastPoint.views) : 0
    const rawSharesLabelY = lastPoint ? yScale(lastPoint.shares) : 0
    const sharesLabelY =
        lastPoint && Math.abs(viewsLabelY - rawSharesLabelY) < 26
            ? Math.min(height - 34, rawSharesLabelY + 26)
            : rawSharesLabelY

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-full w-full overflow-visible"
            role="img"
            aria-label="Combined analytics chart for views and shares over time"
        >
            <defs>
                <linearGradient id="dash_views_area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.2" />
                    <stop offset="55%" stopColor="hsl(var(--foreground))" stopOpacity="0.075" />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="dash_views_line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" />
                </linearGradient>
            </defs>

            <g transform={`translate(${padding.left} 12)`}>
                <text fill="hsl(var(--foreground))" fontSize="13" fontWeight="700" letterSpacing="0.02em">
                    Views and shares
                </text>
                <text x="0" y="20" fill="hsl(var(--muted-foreground))" fontSize="11">
                    Daily performance
                </text>
            </g>
            <g transform={`translate(${width - padding.right - 196} 15)`}>
                <circle cx="5" cy="5" r="4" fill="hsl(var(--foreground))" />
                <text x="16" y="9" fill="hsl(var(--muted-foreground))" fontSize="12">Views</text>
                <line x1="76" x2="92" y1="5" y2="5" stroke="#d6a04f" strokeWidth="2.4" strokeLinecap="round" />
                <text x="102" y="9" fill="hsl(var(--muted-foreground))" fontSize="12">Shares</text>
            </g>

            {yTicks.map((tick) => (
                <g key={tick}>
                    <line
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={yScale(tick)}
                        y2={yScale(tick)}
                        stroke="hsl(var(--border))"
                        strokeDasharray={tick === 0 ? undefined : '3 8'}
                        strokeOpacity={tick === 0 ? 0.9 : 0.5}
                    />
                    <text
                        x={padding.left - 14}
                        y={yScale(tick) + 4}
                        textAnchor="end"
                        fill="hsl(var(--muted-foreground))"
                        fontSize="11"
                    >
                        {formatAxisValue(tick)}
                    </text>
                </g>
            ))}

            {viewsArea ? <path d={viewsArea} fill="url(#dash_views_area)" /> : null}
            {viewsPath ? (
                <path
                    d={viewsPath}
                    fill="none"
                    stroke="url(#dash_views_line)"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}
            {sharesPath ? (
                <path
                    d={sharesPath}
                    fill="none"
                    stroke="#d6a04f"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}

            {points.map((point, index) => {
                const showLabel = index === 0 || index === points.length - 1 || index % labelStep === 0
                return (
                    <g key={`${point.date}-${index}`}>
                        <circle cx={xScale(point.index)} cy={yScale(point.views)} r="3.8" fill="hsl(var(--foreground))">
                            <title>{`${point.label}: ${point.views} views, ${point.shares} shares`}</title>
                        </circle>
                        <circle
                            cx={xScale(point.index)}
                            cy={yScale(point.shares)}
                            r="3"
                            fill="#d6a04f"
                            stroke="hsl(var(--background))"
                            strokeWidth="1.8"
                        />
                        {showLabel ? (
                            <text
                                x={xScale(point.index)}
                                y={height - 18}
                                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                                fill="hsl(var(--muted-foreground))"
                                fontSize="11"
                            >
                                {point.label}
                            </text>
                        ) : null}
                    </g>
                )
            })}

            {lastPoint ? (
                <>
                    <g transform={`translate(${width - padding.right + 12} ${viewsLabelY})`}>
                        <text fill="hsl(var(--foreground))" fontSize="12" fontWeight="700">
                            {formatAxisValue(lastPoint.views)}
                        </text>
                        <text
                            y="16"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="10"
                            letterSpacing="0.04em"
                        >
                            views {formatDelta(viewsDelta)}
                        </text>
                    </g>
                    <g transform={`translate(${width - padding.right + 12} ${sharesLabelY})`}>
                        <text fill="#d6a04f" fontSize="12" fontWeight="700">
                            {formatAxisValue(lastPoint.shares)}
                        </text>
                        <text
                            y="16"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="10"
                            letterSpacing="0.04em"
                        >
                            shares {formatDelta(sharesDelta)}
                        </text>
                    </g>
                </>
            ) : null}
        </svg>
    )
}

function formatAxisValue(value: number) {
    return Math.round(value).toLocaleString()
}

function formatDelta(value: number) {
    if (value === 0) return '0'
    return `${value > 0 ? '+' : ''}${formatAxisValue(value)}`
}
