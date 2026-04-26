import apiClient from '@/lib/apiClient'

export interface SiteSettings {
    siteName: string
    siteDescription: string
    authorName: string
    authorEmail: string
    newsletterEnabled: boolean
    twitterLink: string | null
    linkedinLink: string | null
    githubLink: string | null
    websiteLink: string | null
    dribbbleLink: string | null
    huggingfaceLink: string | null
    leetcodeLink: string | null
    customDomain: string | null
    domainStatus: 'pending' | 'verified' | 'active' | 'failed' | null
}

const DEFAULT_SETTINGS: SiteSettings = {
    siteName: 'My Blog',
    siteDescription: '',
    authorName: '',
    authorEmail: '',
    newsletterEnabled: false,
    twitterLink: null,
    linkedinLink: null,
    githubLink: null,
    websiteLink: null,
    dribbbleLink: null,
    huggingfaceLink: null,
    leetcodeLink: null,
    customDomain: null,
    domainStatus: null,
}

const PUBLIC_CONTENT_BASE = (import.meta.env.VITE_PUBLIC_CONTENT_URL || '').replace(/\/$/, '')
const API_PREFETCH_TTL = 30_000
let publicSettingsCache: Promise<SiteSettings | null> | null = null
let apiSettingsPrefetch: { promise: Promise<SiteSettings | null>; requestedAt: number } | null = null

async function getPublicSettings(): Promise<SiteSettings | null> {
    const response = await fetch(`${PUBLIC_CONTENT_BASE}/public/settings.json`, {
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Public settings request failed: ${response.status}`)
    return response.json()
}

function getCachedPublicSettings(): Promise<SiteSettings | null> {
    publicSettingsCache ??= getPublicSettings().catch((error) => {
        publicSettingsCache = null
        throw error
    })
    return publicSettingsCache
}

async function getApiSettings(): Promise<SiteSettings | null> {
    const response = await apiClient.get('/settings')
    return response.data ?? DEFAULT_SETTINGS
}

interface GetSettingsOptions {
    preferFresh?: boolean
}

export interface DomainConnectResponse {
    success: boolean
    verified?: boolean
    hostname?: string
    status?: SiteSettings['domainStatus']
    message?: string
    error?: string
    missing?: string[]
    requiresCloudflareZone?: boolean
    instructions?: {
        target?: string
        steps?: string[]
    }
    settings?: SiteSettings
}

export const settingsService = {
    async getSettings({ preferFresh = false }: GetSettingsOptions = {}): Promise<SiteSettings> {
        if (preferFresh) {
            try {
                const cached = apiSettingsPrefetch
                if (cached && Date.now() - cached.requestedAt <= API_PREFETCH_TTL) {
                    apiSettingsPrefetch = null
                    return (await cached.promise) ?? DEFAULT_SETTINGS
                }
                apiSettingsPrefetch = null
                return (await getApiSettings()) ?? DEFAULT_SETTINGS
            } catch {
                // Fall through to public artifact for resilience.
            }
        }

        try {
            return (await getCachedPublicSettings()) ?? DEFAULT_SETTINGS
        } catch {
            // Fall back to the API for older deployments or before public artifacts exist.
        }

        try {
            return (await getApiSettings()) ?? DEFAULT_SETTINGS
        } catch {
            return DEFAULT_SETTINGS
        }
    },

    prefetchSettings({ preferFresh = false }: GetSettingsOptions = {}): void {
        if (preferFresh) {
            apiSettingsPrefetch ??= {
                requestedAt: Date.now(),
                promise: getApiSettings().catch((error) => {
                    apiSettingsPrefetch = null
                    throw error
                }),
            }
            apiSettingsPrefetch.promise.catch(() => {})
            return
        }

        getCachedPublicSettings().catch(() => {})
    },

    async saveSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
        const response = await apiClient.put('/settings', updates)
        publicSettingsCache = null
        apiSettingsPrefetch = null
        return response.data
    },

    async changePassword(current: string, next: string): Promise<void> {
        await apiClient.post('/auth/change-password', { current, next })
    },

    async verifyDomain(domain: string): Promise<DomainConnectResponse> {
        try {
            const response = await apiClient.post<DomainConnectResponse>('/add-domain', { domain })
            publicSettingsCache = null
            apiSettingsPrefetch = null
            return response.data
        } catch (err: any) {
            return {
                success: false,
                ...(err?.response?.data || {}),
                error: err?.response?.data?.error || err.message || 'Failed to connect domain',
            }
        }
    },

    async disconnectDomain(): Promise<{ ok: boolean; settings?: SiteSettings; warning?: string }> {
        const response = await apiClient.delete<{ ok: boolean; settings?: SiteSettings; warning?: string }>('/add-domain')
        publicSettingsCache = null
        apiSettingsPrefetch = null
        return response.data
    },
}

export default settingsService
