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
        <div className="dashboard-stat flex-1 py-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className="text-3xl font-bold leading-none text-foreground">{value}</div>
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
        <div className="dashboard-page animate-fade-in pb-16">
            <div className="dashboard-header mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-[2rem] font-semibold leading-tight sm:text-4xl">Dashboard</h1>
            </div>

            <section className="dashboard-section mb-12">
                <h2 className="dashboard-section-title mb-6 text-lg font-semibold text-muted-foreground sm:text-xl">Analytics</h2>

                <div className="mb-8 flex gap-8 dashboard-stats-row">
                    <Stat label="Total Views" value={(stats?.totalViews || 0).toLocaleString()} />
                    <Stat label="Total Shares" value={(stats?.totalShares || 0).toLocaleString()} />
                    <Stat label="Published" value={dashboardStats.publishedPosts.toString()} />
                </div>

                <Card className="dashboard-chart-card overflow-hidden border-0 bg-transparent shadow-none">
                    <CardContent className="dashboard-chart-content px-0 py-3 sm:py-6">
                        <div className="dashboard-chart-frame h-[280px] w-full min-w-0 overflow-hidden sm:h-[390px]">
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

            <div className="dashboard-latest-section mb-8">
                <h2 className="dashboard-latest-title mb-5 text-lg font-semibold text-muted-foreground sm:text-xl">Latest Post</h2>
                {dashboardStats.latestPost ? (
                    <Link
                        to={`/blog/${dashboardStats.latestPost.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block no-underline"
                    >
                        <Card className="dashboard-latest-card border-border bg-transparent shadow-none transition-colors hover:border-foreground">
                            <CardContent className="dashboard-latest-content p-5 sm:p-6">
                                <h3 className="dashboard-latest-heading mb-4 break-words font-heading text-[1.35rem] font-normal leading-tight tracking-tight text-foreground sm:text-2xl">
                                    {dashboardStats.latestPost.title}
                                </h3>
                                <div className="dashboard-latest-meta flex flex-wrap items-center justify-between gap-3">
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
                    <Card className="dashboard-latest-card border-border bg-transparent shadow-none">
                        <CardContent className="dashboard-latest-content p-6">
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
                    .dashboard-page {
                        padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)) !important;
                    }
                    .dashboard-header {
                        margin-bottom: 1.05rem !important;
                    }
                    .dashboard-header h1 {
                        font-size: clamp(1.75rem, 8vw, 2rem) !important;
                    }
                    .dashboard-section {
                        margin-bottom: 1.35rem !important;
                    }
                    .dashboard-section-title,
                    .dashboard-latest-title {
                        margin-bottom: 0.9rem !important;
                        font-size: 1rem !important;
                        line-height: 1.25 !important;
                    }
                    .dashboard-stats-row {
                        display: grid !important;
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        gap: 0.55rem !important;
                        margin-bottom: 0.9rem !important;
                        align-items: start !important;
                    }
                    .dashboard-stat {
                        min-width: 0;
                        padding: 0.35rem 0 !important;
                    }
                    .dashboard-stat > div:first-child {
                        min-height: 2.15em;
                        font-size: 0.62rem !important;
                        letter-spacing: 0.08em !important;
                        line-height: 1.1 !important;
                        margin-bottom: 0.45rem !important;
                    }
                    .dashboard-stat > div:last-child {
                        font-size: clamp(1.45rem, 7.6vw, 2rem) !important;
                    }
                    .dashboard-chart-content {
                        padding-top: 0.35rem !important;
                        padding-bottom: 0.4rem !important;
                    }
                    .dashboard-chart-frame {
                        height: clamp(330px, 74vw, 400px) !important;
                        margin-left: 0 !important;
                        width: 100% !important;
                    }
                    .dashboard-chart-frame svg {
                        height: 100% !important;
                        min-width: 0 !important;
                        transform: scale(1.04);
                        transform-origin: left center;
                    }
                    .dashboard-latest-section {
                        margin-bottom: 0 !important;
                    }
                    .dashboard-latest-content {
                        padding: 1rem !important;
                    }
                    .dashboard-latest-heading {
                        margin-bottom: 0.85rem !important;
                        font-size: 1.2rem !important;
                    }
                    .dashboard-latest-meta {
                        gap: 0.7rem !important;
                    }
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
    const width = 1080
    const height = 390
    const padding = { top: 28, right: 132, bottom: 62, left: 56 }
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
            preserveAspectRatio="xMidYMid meet"
            className="block h-full w-full overflow-visible"
            role="img"
            aria-label="Combined analytics chart for views and shares over time"
        >
            <defs>
                <linearGradient id="dash_views_area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.24" />
                    <stop offset="55%" stopColor="#a855f7" stopOpacity="0.095" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="dash_views_line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>

            {yTicks.map((tick) => (
                <g key={tick}>
                    <line
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={yScale(tick)}
                        y2={yScale(tick)}
                        stroke="hsl(var(--border))"
                        strokeDasharray={tick === 0 ? undefined : '5 10'}
                        strokeWidth={tick === 0 ? 2.4 : 1.8}
                        strokeOpacity={tick === 0 ? 0.95 : 0.7}
                    />
                    <text
                        x={padding.left - 18}
                        y={yScale(tick) + 6}
                        textAnchor="end"
                        fill="hsl(var(--muted-foreground))"
                        fontSize="16"
                        fontWeight="700"
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
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}
            {sharesPath ? (
                <path
                    d={sharesPath}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : null}

            {points.map((point, index) => {
                const showLabel = index === 0 || index === points.length - 1 || index % labelStep === 0
                return (
                    <g key={`${point.date}-${index}`}>
                        <circle cx={xScale(point.index)} cy={yScale(point.views)} r="7" fill="#ec4899">
                            <title>{`${point.label}: ${point.views} views, ${point.shares} shares`}</title>
                        </circle>
                        <circle
                            cx={xScale(point.index)}
                            cy={yScale(point.shares)}
                            r="5.8"
                            fill="#8b5cf6"
                            stroke="hsl(var(--background))"
                            strokeWidth="2.4"
                        />
                        {showLabel ? (
                            <text
                                x={xScale(point.index)}
                                y={height - 18}
                                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                                fill="hsl(var(--muted-foreground))"
                                fontSize="15"
                                fontWeight="700"
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
                        <text fill="hsl(var(--foreground))" fontSize="16" fontWeight="800">
                            {formatAxisValue(lastPoint.views)}
                        </text>
                        <text
                            y="20"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="13"
                            fontWeight="700"
                            letterSpacing="0.04em"
                        >
                            views {formatDelta(viewsDelta)}
                        </text>
                    </g>
                    <g transform={`translate(${width - padding.right + 12} ${sharesLabelY})`}>
                        <text fill="#8b5cf6" fontSize="16" fontWeight="800">
                            {formatAxisValue(lastPoint.shares)}
                        </text>
                        <text
                            y="20"
                            fill="hsl(var(--muted-foreground))"
                            fontSize="13"
                            fontWeight="700"
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
