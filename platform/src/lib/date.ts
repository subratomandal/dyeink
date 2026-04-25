const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
})

export function formatDateShort(value: string | number | Date) {
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? '' : shortDateFormatter.format(date)
}

export function formatDateKey(value: string | number | Date) {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
