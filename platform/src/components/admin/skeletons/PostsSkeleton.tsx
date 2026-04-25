import Skeleton from '../../common/ui/Skeleton'

export default function PostsSkeleton() {
    return (
        <div className="animate-fade-in mx-auto max-w-5xl">
            <div className="mb-12">
                <Skeleton className="mb-3 h-8 w-48 rounded-full" />
                <Skeleton className="h-3 w-36 rounded-full" />
            </div>

            <div className="posts-skeleton-panel overflow-hidden bg-transparent">
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_150px_92px] bg-transparent px-1 py-3 md:grid">
                    <Skeleton className="h-2.5 w-12 rounded-full" />
                    <Skeleton className="h-2.5 w-14 rounded-full" />
                    <Skeleton className="h-2.5 w-10 rounded-full" />
                    <Skeleton className="ml-auto h-2.5 w-12 rounded-full" />
                </div>

                <div className="posts-skeleton-list space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="grid gap-4 px-1 py-3 md:grid-cols-[minmax(0,1fr)_130px_150px_92px] md:items-center"
                        >
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-2.5 w-8 rounded-full" />
                                    <Skeleton className="h-4 w-[min(320px,68%)] rounded-full" />
                                </div>
                            </div>
                            <div className="flex justify-between md:block">
                                <Skeleton className="h-2.5 w-12 rounded-full md:hidden" />
                                <Skeleton className="h-4 w-20 rounded-full" />
                            </div>
                            <div className="flex justify-between md:block">
                                <Skeleton className="h-2.5 w-9 rounded-full md:hidden" />
                                <Skeleton className="h-4 w-24 rounded-full" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Skeleton className="h-7 w-7 rounded-full" />
                                <Skeleton className="h-7 w-7 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @media (max-width: 767px) {
                    .posts-skeleton-panel {
                        border-width: 0 !important;
                    }
                    .posts-skeleton-list > :not([hidden]) ~ :not([hidden]) {
                        border-top-width: 0 !important;
                    }
                }
            `}</style>
        </div>
    )
}
