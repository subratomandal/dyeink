import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 className={cn('animate-spin', className)} size={size} />
}
