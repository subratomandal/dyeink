import { toast as sonnerToast } from 'sonner'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastInput {
  type: ToastType
  message: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

/**
 * Compatibility shim. Existing call sites use:
 *   const { addToast } = useToast()
 *   addToast({ type: 'error', message: '...' })
 *
 * Under the hood this now routes through Sonner, so we get proper
 * stacking, accessibility, and theming for free.
 */
export function useToast() {
  return {
    addToast: ({ type, message, duration, action }: ToastInput) => {
      const opts: Parameters<typeof sonnerToast>[1] = {
        duration: duration === Infinity ? Infinity : duration,
        action: action ? { label: action.label, onClick: action.onClick } : undefined,
      }
      switch (type) {
        case 'success':
          sonnerToast.success(message, opts)
          break
        case 'error':
          sonnerToast.error(message, opts)
          break
        case 'warning':
          sonnerToast.warning(message, opts)
          break
        default:
          sonnerToast(message, opts)
      }
    },
  }
}

export const ToastContainer = () => <SonnerToaster position="bottom-right" richColors closeButton />

export { sonnerToast as toast }
