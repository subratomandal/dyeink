import apiClient from '@/lib/apiClient'

export interface Subscriber {
    id: string
    email: string
    verified: boolean
    createdAt: string
}

export const subscribersService = {
    async subscribe(email: string): Promise<{ ok: boolean; message: string }> {
        try {
            const response = await apiClient.post('/subscribe', { email })
            return response.data
        } catch (error: any) {
            return {
                ok: false,
                message: error.response?.data?.error || 'Failed to subscribe',
            }
        }
    },

    async getSubscribers(): Promise<{ subscribers: Subscriber[]; total: number }> {
        try {
            const response = await apiClient.get('/subscribers')
            return response.data
        } catch {
            return { subscribers: [], total: 0 }
        }
    },

    async deleteSubscriber(id: string): Promise<void> {
        await apiClient.delete(`/subscribers/${id}`)
    },
}

export default subscribersService
