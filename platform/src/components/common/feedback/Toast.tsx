import { useSyncExternalStore } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastInput {
    type: ToastType
    message: string
    duration?: number
    action?: { label: string; onClick: () => void }
}

type ToastRecord = ToastInput & { id: number }

let nextId = 1
let toasts: ToastRecord[] = []
const listeners = new Set<() => void>()
const timers = new Map<number, number>()

function emit() {
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function removeToast(id: number) {
    const timer = timers.get(id)
    if (timer) window.clearTimeout(timer)
    timers.delete(id)
    toasts = toasts.filter((toast) => toast.id !== id)
    emit()
}

export function addToast(input: ToastInput) {
    const id = nextId++
    const record = { ...input, id }
    toasts = [...toasts, record].slice(-5)
    emit()

    if (input.duration !== Infinity) {
        timers.set(id, window.setTimeout(() => removeToast(id), input.duration ?? 4000))
    }
}

export function useToast() {
    return { addToast }
}

export function ToastContainer() {
    const currentToasts = useSyncExternalStore(subscribe, () => toasts, () => [])

    return (
        <div
            aria-live="polite"
            aria-atomic="false"
            className="fixed bottom-4 left-4 right-4 z-[10000] flex max-w-[360px] flex-col gap-3 sm:left-auto sm:right-4 sm:w-[min(360px,calc(100vw-2rem))]"
        >
            {currentToasts.map((toast) => (
                <div
                    key={toast.id}
                    role={toast.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-lg border bg-background px-4 py-3 text-sm text-foreground shadow-lg toast-${toast.type}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="m-0 font-medium">{toast.message}</p>
                            {toast.action ? (
                                <button
                                    type="button"
                                    className="mt-2 text-xs font-semibold underline underline-offset-4"
                                    onClick={() => {
                                        toast.action?.onClick()
                                        removeToast(toast.id)
                                    }}
                                >
                                    {toast.action.label}
                                </button>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Dismiss notification"
                            onClick={() => removeToast(toast.id)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
            <style>{`
                .toast-success { border-color: rgb(16 185 129 / 0.35); }
                .toast-error { border-color: rgb(239 68 68 / 0.45); }
                .toast-warning { border-color: rgb(245 158 11 / 0.45); }
                .toast-info { border-color: hsl(var(--border)); }
            `}</style>
        </div>
    )
}

export const toast = addToast
