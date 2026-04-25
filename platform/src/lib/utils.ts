type ClassValue =
    | string
    | number
    | false
    | null
    | undefined
    | Record<string, boolean | null | undefined>
    | ClassValue[]

export function cn(...inputs: ClassValue[]) {
    const classes: string[] = []

    const append = (value: ClassValue): void => {
        if (!value) return
        if (Array.isArray(value)) {
            value.forEach(append)
            return
        }
        if (typeof value === 'object') {
            for (const [key, enabled] of Object.entries(value)) {
                if (enabled) classes.push(key)
            }
            return
        }
        classes.push(String(value))
    }

    inputs.forEach(append)
    return classes.join(' ')
}
