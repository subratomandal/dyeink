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
}

const PUBLIC_CONTENT_BASE = (import.meta.env.VITE_PUBLIC_CONTENT_URL || '').replace(/\/$/, '')

async function getPublicSettings(): Promise<SiteSettings | null> {
    const response = await fetch(`${PUBLIC_CONTENT_BASE}/public/settings.json`, {
        headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Public settings request failed: ${response.status}`)
    return response.json()
}

async function getApiSettings(): Promise<SiteSettings | null> {
    const response = await apiClient.get('/settings')
    return response.data ?? DEFAULT_SETTINGS
}

interface GetSettingsOptions {
    preferFresh?: boolean
}

export const settingsService = {
    async getSettings({ preferFresh = false }: GetSettingsOptions = {}): Promise<SiteSettings> {
        if (preferFresh) {
            try {
                return (await getApiSettings()) ?? DEFAULT_SETTINGS
            } catch {
                // Fall through to public artifact for resilience.
            }
        }

        try {
            return (await getPublicSettings()) ?? DEFAULT_SETTINGS
        } catch {
            // Fall back to the API for older deployments or before public artifacts exist.
        }

        try {
            return (await getApiSettings()) ?? DEFAULT_SETTINGS
        } catch {
            return DEFAULT_SETTINGS
        }
    },

    async saveSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
        const response = await apiClient.put('/settings', updates)
        return response.data
    },

    async changePassword(current: string, next: string): Promise<void> {
        await apiClient.post('/auth/change-password', { current, next })
    },
}

export default settingsService
