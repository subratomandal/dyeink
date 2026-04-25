import Skeleton from '../../common/ui/Skeleton'

export default function PostsSkeleton() {
    return (
        <div className="animate-fade-in mx-auto max-w-5xl">
            <div className="mb-12">
                <Skeleton className="mb-3 h-10 w-56 rounded-lg" />
                <Skeleton className="h-5 w-48 rounded-full" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_150px_92px] border-b border-border bg-muted/20 px-5 py-3 md:grid">
                    <Skeleton className="h-3 w-14 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded-full" />
                    <Skeleton className="ml-auto h-3 w-14 rounded-full" />
                </div>

                <div className="divide-y divide-border">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_130px_150px_92px] md:items-center md:px-5"
                        >
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Skeleton className="h-3 w-10 rounded-full" />
                                    <Skeleton className="h-5 w-[min(340px,72%)] rounded-lg" />
                                </div>
                            </div>
                            <div className="flex justify-between md:block">
                                <Skeleton className="h-3 w-14 rounded-full md:hidden" />
                                <Skeleton className="h-5 w-24 rounded-full" />
                            </div>
                            <div className="flex justify-between md:block">
                                <Skeleton className="h-3 w-10 rounded-full md:hidden" />
                                <Skeleton className="h-5 w-28 rounded-full" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
