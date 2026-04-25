import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type SkeletonProps = {
    className?: string
    style?: React.CSSProperties
}

/**
 * Compatibility shim — existing skeletons import this path. Routes through the
 * shadcn Skeleton so styling stays consistent with the rest of the UI.
 */
export default function Skeleton({ className = '', style }: SkeletonProps) {
    return <ShadcnSkeleton className={cn(className)} style={style} aria-hidden="true" />
}
