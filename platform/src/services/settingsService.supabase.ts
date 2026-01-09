import { supabase } from '../lib/supabase'
export interface SiteSettings {
    id?: number
    siteName: string
    siteDescription: string
    customDomain: string | null
    subdomain: string | null
    twitterLink?: string | null
    linkedinLink?: string | null
    githubLink?: string | null
    websiteLink?: string | null
    dribbbleLink?: string | null
    huggingfaceLink?: string | null

    leetcodeLink?: string | null

    newsletterEmail?: string | null
    domainStatus?: 'pending' | 'verified' | 'active' | 'failed' | null
}
export const settingsService = {
    async getSettings(): Promise<SiteSettings | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            console.error('Error fetching settings:', error)
            throw error
        }

        return {
            id: data.id,
            siteName: data.site_name,
            siteDescription: data.site_description,
            customDomain: data.custom_domain,
            subdomain: data.subdomain,
            twitterLink: data.twitter_link,
            linkedinLink: data.linkedin_link,
            githubLink: data.github_link,
            websiteLink: data.website_link,
            dribbbleLink: data.dribbble_link,
            huggingfaceLink: data.huggingface_link,

            leetcodeLink: data.leetcode_link,

            newsletterEmail: data.newsletter_email
        }
    },
    async getPublicSettings(): Promise<SiteSettings | null> {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .limit(1)
            .single()

        if (error) {
            console.error('Error fetching public settings:', error)
            return null
        }

        return {
            id: data.id,
            siteName: data.site_name,
            siteDescription: data.site_description,
            customDomain: data.custom_domain,
            subdomain: data.subdomain,
            twitterLink: data.twitter_link,
            linkedinLink: data.linkedin_link,
            githubLink: data.github_link,
            websiteLink: data.website_link,
            dribbbleLink: data.dribbble_link,
            huggingfaceLink: data.huggingface_link,

            leetcodeLink: data.leetcode_link,

            newsletterEmail: data.newsletter_email
        }
    },
    async getSettingsByCustomDomain(domain: string): Promise<{ settings: SiteSettings; userId: string } | null> {
        const host = domain.toLowerCase()
        const cleanHost = host.startsWith('www.') ? host.slice(4) : host

        const { data, error } = await supabase
            .from('site_settings')
            .select('*, user_id')
            .or(`custom_domain.ilike.${cleanHost},custom_domain.ilike.www.${cleanHost}`)
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('Error fetching settings by custom domain:', error)
            return null
        }

        if (!data) return null

        return {
            settings: {
                id: data.id,
                siteName: data.site_name,
                siteDescription: data.site_description,
                customDomain: data.custom_domain,
                subdomain: data.subdomain,
                twitterLink: data.twitter_link,
                linkedinLink: data.linkedin_link,
                githubLink: data.github_link,
                websiteLink: data.website_link,
                dribbbleLink: data.dribbble_link,
                huggingfaceLink: data.huggingface_link,

                leetcodeLink: data.leetcode_link,

                newsletterEmail: data.newsletter_email,
                domainStatus: data.domain_status
            },
            userId: data.user_id
        }
    },
    async getSettingsBySubdomain(subdomain: string): Promise<{ settings: SiteSettings; userId: string } | null> {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*, user_id')
            .eq('subdomain', subdomain)
            .single()

        if (error) {
            console.error('Error fetching settings by subdomain:', error)
            return null
        }

        return {
            settings: {
                id: data.id,
                siteName: data.site_name,
                siteDescription: data.site_description,
                customDomain: data.custom_domain,
                subdomain: data.subdomain,
                twitterLink: data.twitter_link,
                linkedinLink: data.linkedin_link,
                githubLink: data.github_link,
                websiteLink: data.website_link,
                dribbbleLink: data.dribbble_link,
                huggingfaceLink: data.huggingface_link,

                leetcodeLink: data.leetcode_link,

                newsletterEmail: data.newsletter_email,
                domainStatus: data.domain_status
            },
            userId: data.user_id
        }
    },
    async saveSettings(settings: SiteSettings): Promise<SiteSettings | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const updates = {
            ...(settings.id ? { id: settings.id } : {}),
            user_id: user.id,
            site_name: settings.siteName,
            site_description: settings.siteDescription,
            custom_domain: settings.customDomain ? settings.customDomain.toLowerCase() : null,
            subdomain: settings.subdomain || `blog-${user.id.slice(0, 8)}`,
            twitter_link: settings.twitterLink,
            linkedin_link: settings.linkedinLink,
            github_link: settings.githubLink,
            website_link: settings.websiteLink,
            dribbble_link: settings.dribbbleLink,
            huggingface_link: settings.huggingfaceLink,

            leetcode_link: settings.leetcodeLink,

            newsletter_email: settings.newsletterEmail,
            domain_status: settings.domainStatus || null
        }

        const { data, error } = await supabase
            .from('site_settings')
            .upsert(updates, { onConflict: 'user_id' })
            .select()
            .single()

        if (error) {
            console.error('Error saving settings:', error)
            throw error
        }

        return {
            id: data.id,
            siteName: data.site_name,
            siteDescription: data.site_description,
            customDomain: data.custom_domain,
            subdomain: data.subdomain,
            twitterLink: data.twitter_link,
            linkedinLink: data.linkedin_link,
            githubLink: data.github_link,
            websiteLink: data.website_link,
            dribbbleLink: data.dribbble_link,
            huggingfaceLink: data.huggingface_link,

            leetcodeLink: data.leetcode_link,

            newsletterEmail: data.newsletter_email,
            domainStatus: data.domain_status
        }
    },
    async verifyDomain(domain: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
        try {
            const response = await fetch('/api/add-domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.toLowerCase() })
            })
            const data = await response.json()
            if (!response.ok) {
                return { success: false, error: data.error }
            }
            return { success: true, verified: data.verified }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    },
    async initializeSettings(settings: SiteSettings): Promise<SiteSettings | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const newSettings = {
            user_id: user.id,
            site_description: settings.siteDescription,
            custom_domain: null,
            subdomain: settings.subdomain || `blog-${user.id.slice(0, 8)}`,
            domain_status: 'pending'
        }

        const existing = await this.getSettings()
        if (existing) return existing

        const { data, error } = await supabase
            .from('site_settings')
            .insert(newSettings)
            .select()
            .single()

        if (error) {
            console.error('Error initializing settings:', error)
            throw error
        }

        return {
            id: data.id,
            siteName: data.site_name,
            siteDescription: data.site_description,
            customDomain: data.custom_domain,
            subdomain: data.subdomain,
            twitterLink: data.twitter_link,
            linkedinLink: data.linkedin_link,
            githubLink: data.github_link,
            websiteLink: data.website_link,
            dribbbleLink: data.dribbble_link,
            huggingfaceLink: data.huggingface_link,

            leetcodeLink: data.leetcode_link,

            newsletterEmail: data.newsletter_email,
            domainStatus: data.domain_status
        }
    }
}
