import apiClient from '@/lib/apiClient'

export interface BasicStats {
    totalViews: number
    totalShares: number
    totalSubscribers: number
    graphData: {
        date: string
        name?: string
        views: number
        shares: number
    }[]
}

export const statsService = {
    async trackEvent(postId: string, type: 'view' | 'share'): Promise<void> {
        try {
            await apiClient.post(
                '/hit',
                { id: postId, type },
                {
                    cache: 'no-store',
                    keepalive: true,
                    headers: { 'Cache-Control': 'no-store' },
                },
            )
        } catch (error) {
            console.error('Error tracking event:', error)
        }
    },

    async getStats(): Promise<BasicStats | null> {
        try {
            const response = await apiClient.get('/stats')
            return response.data
        } catch {
            return null
        }
    },
}

export default statsService
