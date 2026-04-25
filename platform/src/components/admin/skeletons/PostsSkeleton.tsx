import Skeleton from '../../common/ui/Skeleton'

export default function PostsSkeleton() {
    return (
        <div className="animate-fade-in mx-auto max-w-[1000px]">
            <div className="mb-10 flex items-start justify-between gap-4">
                <div className="space-y-3">
                    <Skeleton className="h-10 w-56 rounded-2xl" />
                    <Skeleton className="h-5 w-44 rounded-full" />
                </div>
                <Skeleton className="h-10 w-28 rounded-full" />
            </div>

            <div className="mb-3 hidden grid-cols-[minmax(0,1fr)_140px_150px_96px] gap-4 px-5 md:grid">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-full" />
                <Skeleton className="ml-auto h-3 w-14 rounded-full" />
            </div>

            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="grid gap-4 rounded-3xl border border-border/80 bg-card/70 p-4 shadow-[0_14px_50px_hsl(var(--foreground)/0.04)] md:grid-cols-[minmax(0,1fr)_140px_150px_96px] md:items-center md:p-5"
                    >
                        <div className="space-y-3">
                            <Skeleton className="h-3 w-10 rounded-full" />
                            <Skeleton className="h-6 w-[min(380px,76%)] rounded-2xl" />
                        </div>
                        <div className="flex justify-between md:block">
                            <Skeleton className="h-3 w-14 rounded-full md:hidden" />
                            <Skeleton className="h-7 w-24 rounded-full" />
                        </div>
                        <div className="flex justify-between md:block">
                            <Skeleton className="h-3 w-10 rounded-full md:hidden" />
                            <Skeleton className="h-7 w-28 rounded-full" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <Skeleton className="h-9 w-9 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
