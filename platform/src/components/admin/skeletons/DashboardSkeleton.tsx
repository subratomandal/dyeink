import Skeleton from '../../common/ui/Skeleton'

export default function DashboardSkeleton() {
    return (
        <div className="animate-fade-in pb-16">
            <div className="mb-8 flex items-center justify-between">
                <Skeleton className="h-10 w-52 rounded-lg" />
            </div>

            <section className="mb-12">
                <Skeleton className="mb-6 h-7 w-28 rounded-lg" />

                <div className="mb-8 flex gap-8 dashboard-stats-row">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-1 py-6">
                            <Skeleton className="mb-2 h-4 w-24 rounded-full" />
                            <Skeleton className="h-9 w-20 rounded-lg" />
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-xl border bg-card p-4 shadow sm:p-6">
                    <Skeleton className="h-[300px] w-full rounded-lg" />
                </div>
            </section>

            <div className="mb-8 rounded-xl border bg-card p-6 shadow">
                <Skeleton className="mb-5 h-7 w-32 rounded-lg" />
                <Skeleton className="mb-4 h-8 w-64 max-w-full rounded-lg" />
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                </div>
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
