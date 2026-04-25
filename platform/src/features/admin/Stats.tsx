import { BarChart2, Share2 } from 'lucide-react'
import { useAdminStore } from '@/stores/adminStore'
import StatsSkeleton from '@/components/admin/skeletons/StatsSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2 py-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {icon && <span className="opacity-70">{icon}</span>}
                {label}
            </div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
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
        <div className="pb-16 text-foreground">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="m-0 font-heading text-4xl font-semibold">Stats</h1>
            </div>

            <Tabs defaultValue="traffic" className="animate-fade-in">
                <TabsList className="mb-6">
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
        </div>
    )
}
