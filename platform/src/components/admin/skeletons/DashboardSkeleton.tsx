import Skeleton from '../../common/ui/Skeleton'

export default function DashboardSkeleton() {
    return (
        <div className="dashboard-page animate-fade-in pb-16">
            <div className="dashboard-header mb-8 flex items-center justify-between">
                <Skeleton className="h-10 w-52 rounded-lg" />
            </div>

            <section className="dashboard-section mb-12">
                <Skeleton className="dashboard-section-title mb-6 h-7 w-28 rounded-lg" />

                <div className="mb-8 flex gap-8 dashboard-stats-row">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="dashboard-stat flex-1 py-6">
                            <Skeleton className="mb-2 h-4 w-24 rounded-full" />
                            <Skeleton className="h-9 w-20 rounded-lg" />
                        </div>
                    ))}
                </div>

                <div className="dashboard-chart-skeleton overflow-hidden rounded-xl border bg-card p-4 shadow sm:p-6">
                    <Skeleton className="dashboard-chart-skeleton-fill h-[300px] w-full rounded-lg" />
                </div>
            </section>

            <div className="dashboard-latest-section mb-8 rounded-xl border bg-card p-6 shadow">
                <Skeleton className="dashboard-latest-title mb-5 h-7 w-32 rounded-lg" />
                <Skeleton className="dashboard-latest-heading mb-4 h-8 w-64 max-w-full rounded-lg" />
                <div className="dashboard-latest-meta flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                </div>
            </div>

            <style>{`
                @media (max-width: 640px) {
                    .dashboard-page {
                        padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)) !important;
                    }
                    .dashboard-header {
                        margin-bottom: 1.05rem !important;
                    }
                    .dashboard-header .skeleton-shimmer {
                        width: 10.5rem !important;
                    }
                    .dashboard-section {
                        margin-bottom: 1.35rem !important;
                    }
                    .dashboard-section-title,
                    .dashboard-latest-title {
                        margin-bottom: 0.9rem !important;
                    }
                    .dashboard-stats-row {
                        display: grid !important;
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                        gap: 0.55rem !important;
                        margin-bottom: 0.9rem !important;
                    }
                    .dashboard-stat {
                        min-width: 0;
                        padding: 0.35rem 0 !important;
                    }
                    .dashboard-stat .skeleton-shimmer:first-child {
                        width: 100% !important;
                        max-width: 4.8rem !important;
                        margin-bottom: 0.45rem !important;
                    }
                    .dashboard-stat .skeleton-shimmer:last-child {
                        width: 70% !important;
                        max-width: 4.6rem !important;
                    }
                    .dashboard-chart-skeleton {
                        padding: 0.8rem !important;
                    }
                    .dashboard-chart-skeleton-fill {
                        height: clamp(330px, 74vw, 400px) !important;
                    }
                    .dashboard-latest-section {
                        margin-bottom: 0 !important;
                        padding: 1rem !important;
                    }
                    .dashboard-latest-heading {
                        margin-bottom: 0.85rem !important;
                    }
                    .dashboard-latest-meta {
                        gap: 0.7rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
