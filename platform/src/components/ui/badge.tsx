import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'

const baseBadgeClass =
  'inline-flex items-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

const badgeClass: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
  outline: 'text-foreground',
  success: 'border-transparent bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25',
  warning: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25',
}

export function badgeVariants({ variant = 'default' }: { variant?: BadgeVariant } = {}) {
  return cn(baseBadgeClass, badgeClass[variant])
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
