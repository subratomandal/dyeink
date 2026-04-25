import { BarChart2, Share2 } from 'lucide-react'
import { useAdminStore } from '@/stores/adminStore'
import StatsSkeleton from '@/components/admin/skeletons/StatsSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="stats-card flex min-w-0 flex-col gap-2 py-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {icon && <span className="opacity-70">{icon}</span>}
                {label}
            </div>
            <div className="text-3xl font-bold leading-none text-foreground">{value}</div>
        </div>
    )
}

export default function Stats() {
    const { posts, postsLoading, stats, statsLoading } = useAdminStore()

    const safePosts = posts || []
    const showLoader = (postsLoading && !posts) || (statsLoading && !stats)
    const publishedPosts = safePosts.filter((p) => p.published).length

    if (showLoader) return <StatsSkeleton />

    return (
        <div className="stats-page pb-16 text-foreground">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-[2rem] font-semibold leading-tight sm:text-4xl">Stats</h1>
            </div>

            <Tabs defaultValue="traffic" className="animate-fade-in">
                <TabsList className="stats-tabs mb-6 w-full sm:w-auto">
                    <TabsTrigger value="traffic">Traffic</TabsTrigger>
                    <TabsTrigger value="sharing">Sharing</TabsTrigger>
                </TabsList>

                <TabsContent value="traffic">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                        <StatCard
                            label="Total Views"
                            value={(stats?.totalViews || 0).toLocaleString()}
                            icon={<BarChart2 size={18} />}
                        />
                        <StatCard label="Published" value={publishedPosts.toString()} />
                    </div>
                </TabsContent>

                <TabsContent value="sharing">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                        <StatCard
                            label="Total Shares"
                            value={(stats?.totalShares || 0).toLocaleString()}
                            icon={<Share2 size={18} />}
                        />
                    </div>
                </TabsContent>
            </Tabs>
            <style>{`
                @media (max-width: 640px) {
                    .stats-page {
                        padding-bottom: 2rem !important;
                    }
                    .stats-tabs {
                        height: auto !important;
                        gap: 0.25rem;
                        padding: 0.25rem !important;
                    }
                    .stats-tabs button {
                        min-height: 40px;
                        flex: 1 1 0;
                    }
                    .stats-card {
                        padding-top: 0.75rem !important;
                        padding-bottom: 0.75rem !important;
                    }
                    .stats-card > div:last-child {
                        font-size: clamp(1.6rem, 8vw, 2.1rem) !important;
                    }
                }
            `}</style>
        </div>
    )
}
