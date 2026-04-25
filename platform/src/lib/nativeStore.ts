import { useSyncExternalStore } from 'react'

type Listener = () => void
type SetState<T> = Partial<T> | ((state: T) => Partial<T>)

export type NativeStore<T> = {
    (): T
    <U>(selector: (state: T) => U): U
    getState: () => T
    setState: (partial: SetState<T>) => void
    subscribe: (listener: Listener) => () => void
}

export function createNativeStore<T extends object>(
    initializer: (set: (partial: SetState<T>) => void, get: () => T) => T,
): NativeStore<T> {
    let state: T
    const listeners = new Set<Listener>()

    const getState = () => state
    const subscribe = (listener: Listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
    }
    const setState = (partial: SetState<T>) => {
        const patch = typeof partial === 'function' ? partial(state) : partial
        if (!patch || Object.keys(patch).length === 0) return
        state = { ...state, ...patch }
        listeners.forEach((listener) => listener())
    }

    state = initializer(setState, getState)

    function useStore<U>(selector?: (state: T) => U) {
        return useSyncExternalStore(
            subscribe,
            () => (selector ? selector(state) : state) as U,
            () => (selector ? selector(state) : state) as U,
        )
    }

    useStore.getState = getState
    useStore.setState = setState
    useStore.subscribe = subscribe

    return useStore as NativeStore<T>
}
