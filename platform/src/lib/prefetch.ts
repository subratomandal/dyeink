type ConnectionInfo = {
    saveData?: boolean
    effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
    connection?: ConnectionInfo
    mozConnection?: ConnectionInfo
    webkitConnection?: ConnectionInfo
}

type IdleDeadlineLike = {
    didTimeout: boolean
    timeRemaining: () => number
}

type IdleWindow = Window & {
    requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
}

export function canPrefetch() {
    if (typeof navigator === 'undefined') return false
    const nav = navigator as NavigatorWithConnection
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection
    if (connection?.saveData) return false
    if (connection?.effectiveType && /^(slow-)?2g$/i.test(connection.effectiveType)) return false
    return true
}

export function prefetchOnIntent(task: () => void) {
    if (!canPrefetch()) return
    try {
        task()
    } catch {
        // Prefetch must never affect the primary user action.
    }
}

export function scheduleIdlePrefetch(task: () => void, timeout = 1200) {
    if (typeof window === 'undefined' || !canPrefetch()) return () => {}

    const idleWindow = window as IdleWindow
    let cancelled = false
    const run = () => {
        if (cancelled) return
        prefetchOnIntent(task)
    }

    if (idleWindow.requestIdleCallback) {
        const handle = idleWindow.requestIdleCallback(run, { timeout })
        return () => {
            cancelled = true
            idleWindow.cancelIdleCallback?.(handle)
        }
    }

    const handle = window.setTimeout(run, Math.min(timeout, 350))
    return () => {
        cancelled = true
        window.clearTimeout(handle)
    }
}
