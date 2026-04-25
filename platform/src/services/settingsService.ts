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

export const settingsService = {
    async getSettings(): Promise<SiteSettings> {
        try {
            const response = await apiClient.get('/settings')
            return response.data ?? DEFAULT_SETTINGS
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
