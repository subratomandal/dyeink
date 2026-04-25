import Skeleton from '../../common/ui/Skeleton'

export default function DashboardSkeleton() {
    return (
        <div className="animate-fade-in mx-auto flex max-w-[1200px] flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <Skeleton className="h-11 w-56 rounded-2xl" />
                    <Skeleton className="h-5 w-48 rounded-full" />
                </div>
                <Skeleton className="h-11 w-11 rounded-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-3xl border border-border/80 bg-card/70 p-5">
                        <Skeleton className="mb-4 h-4 w-24 rounded-full" />
                        <Skeleton className="h-9 w-20 rounded-2xl" />
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-border/80 bg-card/70 p-6">
                <Skeleton className="mb-6 h-6 w-40 rounded-full" />
                <div className="flex h-[300px] items-end gap-3">
                    {[58, 78, 46, 88, 62, 92, 70, 84, 55].map((height, index) => (
                        <Skeleton
                            key={index}
                            className="flex-1 rounded-t-2xl"
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
