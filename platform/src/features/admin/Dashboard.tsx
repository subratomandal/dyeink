import { ArrowRight } from 'lucide-react'
import { extent, max, ticks } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { area, curveBasis, line } from 'd3-shape'
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
                                <RidgelineAnalyticsChart data={graphData} />
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

function RidgelineAnalyticsChart({ data }: { data: ChartPoint[] }) {
    const width = 780
    const height = 320
    const padding = { top: 32, right: 24, bottom: 48, left: 92 }
    const innerHeight = height - padding.top - padding.bottom
    const values = data.flatMap((point) => [point.views || 0, point.shares || 0]).filter((value) => Number.isFinite(value))
    const [rawMin = 0, rawMax = 1] = extent(values)
    const domainMin = Math.min(0, rawMin)
    const domainMax = rawMax <= domainMin ? domainMin + 1 : rawMax
    const xScale = scaleLinear().domain([domainMin, domainMax]).range([padding.left, width - padding.right]).nice()
    const groups = [
        {
            key: 'views',
            label: 'Views',
            color: '#00cbff',
            values: data.map((point) => point.views || 0),
        },
        {
            key: 'shares',
            label: 'Shares',
            color: '#f59e0b',
            values: data.map((point) => point.shares || 0),
        },
    ]
    const yScale = scaleBand<string>()
        .domain(groups.map((group) => group.label))
        .range([padding.top, padding.top + innerHeight])
        .paddingInner(0.34)
        .paddingOuter(0.16)
    const thresholds = ticks(xScale.domain()[0], xScale.domain()[1], 48)
    const bandwidth = yScale.bandwidth()
    const densityHeight = Math.max(36, bandwidth * 0.82)
    const bandwidthEstimate = Math.max((xScale.domain()[1] - xScale.domain()[0]) / 18, 1)
    const densities = groups.map((group) => ({
        ...group,
        density: kernelDensityEstimator(kernelEpanechnikov(bandwidthEstimate), thresholds)(group.values),
    }))
    const maxDensity = max(densities.flatMap((group) => group.density.map((point) => point[1]))) || 1
    const ridgeScale = scaleLinear().domain([0, maxDensity]).range([0, densityHeight])
    const areaGenerator = area<[number, number]>()
        .curve(curveBasis)
        .x((point) => xScale(point[0]))
        .y0(() => 0)
        .y1((point) => -ridgeScale(point[1]))
    const lineGenerator = line<[number, number]>()
        .curve(curveBasis)
        .x((point) => xScale(point[0]))
        .y((point) => -ridgeScale(point[1]))
    const xTicks = xScale.ticks(5)
    const baselineFor = (label: string) => (yScale(label) || padding.top) + bandwidth

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-full w-full overflow-visible"
            role="img"
            aria-label="Ridgeline distribution chart for views and shares"
        >
            <defs>
                <linearGradient id="dash_ridge_views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00cbff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#00cbff" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="dash_ridge_shares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
                </linearGradient>
            </defs>

            <text x={padding.left} y={18} fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600">
                Distribution
            </text>
            <g transform={`translate(${width - padding.right - 144} 8)`}>
                <rect width="10" height="10" rx="3" fill="#00cbff" opacity="0.75" />
                <text x="16" y="10" fill="hsl(var(--muted-foreground))" fontSize="12">Views</text>
                <rect x="70" width="10" height="10" rx="3" fill="#f59e0b" opacity="0.75" />
                <text x="90" y="10" fill="hsl(var(--muted-foreground))" fontSize="12">Shares</text>
            </g>

            {xTicks.map((tick) => (
                <g key={tick}>
                    <line
                        x1={xScale(tick)}
                        x2={xScale(tick)}
                        y1={padding.top + 12}
                        y2={padding.top + innerHeight}
                        stroke="hsl(var(--border))"
                        strokeDasharray="4 8"
                        strokeOpacity="0.55"
                    />
                    <text
                        x={xScale(tick)}
                        y={height - 18}
                        textAnchor="middle"
                        fill="hsl(var(--muted-foreground))"
                        fontSize="12"
                    >
                        {formatAxisValue(tick)}
                    </text>
                </g>
            ))}

            {densities.map((group) => {
                const baseline = baselineFor(group.label)
                const fillId = group.key === 'views' ? 'dash_ridge_views' : 'dash_ridge_shares'
                return (
                    <g key={group.key} transform={`translate(0 ${baseline})`}>
                        <line
                            x1={padding.left}
                            x2={width - padding.right}
                            y1="0"
                            y2="0"
                            stroke="hsl(var(--border))"
                            strokeOpacity="0.8"
                        />
                        <path
                            d={areaGenerator(group.density) || undefined}
                            fill={`url(#${fillId})`}
                            stroke="none"
                        />
                        <path
                            d={lineGenerator(group.density) || undefined}
                            fill="none"
                            stroke={group.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <text
                            x={padding.left - 16}
                            y="-4"
                            textAnchor="end"
                            fill="hsl(var(--foreground))"
                            fontSize="13"
                            fontWeight="600"
                        >
                            {group.label}
                        </text>
                        <title>{`${group.label}: ${group.values.join(', ')}`}</title>
                    </g>
                )
            })}

            <line
                x1={padding.left}
                x2={width - padding.right}
                y1={padding.top + innerHeight}
                y2={padding.top + innerHeight}
                stroke="hsl(var(--border))"
            />
            <text
                x={width - padding.right}
                y={height - 4}
                textAnchor="end"
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
            >
                event count
            </text>
        </svg>
    )
}

function kernelDensityEstimator(kernel: (value: number) => number, thresholds: number[]) {
    return (values: number[]) =>
        thresholds.map((threshold) => [
            threshold,
            values.reduce((sum, value) => sum + kernel(threshold - value), 0) / Math.max(1, values.length),
        ] as [number, number])
}

function kernelEpanechnikov(bandwidth: number) {
    return (value: number) => {
        const scaled = value / bandwidth
        return Math.abs(scaled) <= 1 ? (0.75 * (1 - scaled * scaled)) / bandwidth : 0
    }
}

function formatAxisValue(value: number) {
    return Math.round(value).toLocaleString()
}
