import type { SiteSettings } from '@/services/settingsService'

function normalizeDomain(domain: string) {
    return domain
        .trim()
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/\.$/, '')
}

export function getPublicBlogOrigin(settings?: Pick<SiteSettings, 'customDomain' | 'domainStatus'> | null) {
    if (!settings?.customDomain) return ''
    if (settings.domainStatus && !['verified', 'active'].includes(settings.domainStatus)) return ''
    return `https://${normalizeDomain(settings.customDomain)}`
}

export function getPublicBlogUrl(
    settings: Pick<SiteSettings, 'customDomain' | 'domainStatus'> | null | undefined,
    path = '',
) {
    const base = getPublicBlogOrigin(settings)
    const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''
    return `${base || ''}/blog${suffix}`
}
