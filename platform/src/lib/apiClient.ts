const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

type RequestBody = BodyInit | object | null | undefined
type RequestOptions = Omit<RequestInit, 'body'> & { body?: RequestBody }

export class ApiError extends Error {
    response: { status: number; data: any }

    constructor(status: number, data: any) {
        super(data?.error || data?.message || `Request failed with status ${status}`)
        this.name = 'ApiError'
        this.response = { status, data }
    }
}

function buildUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseResponse(response: Response) {
    const contentType = response.headers.get('content-type') || ''
    if (response.status === 204) return null
    if (contentType.includes('application/json')) return response.json()
    const text = await response.text()
    return text ? { message: text } : null
}

async function request<T = any>(method: string, path: string, options: RequestOptions = {}) {
    const headers = new Headers(options.headers)
    let body: BodyInit | undefined

    if (options.body instanceof FormData || options.body instanceof Blob) {
        headers.delete('Content-Type')
        body = options.body
    } else if (options.body !== undefined && options.body !== null) {
        headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
        body = JSON.stringify(options.body)
    }

    const response = await fetch(buildUrl(path), {
        ...options,
        method,
        credentials: 'include',
        headers,
        body,
    })
    const data = await parseResponse(response)

    if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return { data: data as T, status: response.status, headers: response.headers }
}

const apiClient = {
    get: <T = any>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
    post: <T = any>(path: string, body?: RequestBody, options?: RequestOptions) =>
        request<T>('POST', path, { ...options, body }),
    put: <T = any>(path: string, body?: RequestBody, options?: RequestOptions) =>
        request<T>('PUT', path, { ...options, body }),
    delete: <T = any>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

export default apiClient
