import apiClient from '../lib/apiClient';

export interface Subscriber {
  id: string;
  email: string;
  verified: boolean;
  createdAt: string;
}

export const subscribersService = {
  async subscribe(options: {
    email: string;
    blogId?: string;
    subdomain?: string;
    customDomain?: string;
  }): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await apiClient.post('/subscribers/subscribe', options);
      return response.data;
    } catch (error: any) {
      console.error('Error subscribing:', error);
      return {
        ok: false,
        message: error.response?.data?.error || 'Failed to subscribe',
      };
    }
  },

  async getSubscribers(): Promise<{ subscribers: Subscriber[]; total: number }> {
    try {
      const response = await apiClient.get('/subscribers');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      return { subscribers: [], total: 0 };
    }
  },

  async deleteSubscriber(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete(`/subscribers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      throw error;
    }
  },

  async unsubscribe(options: {
    email: string;
    subdomain?: string;
    customDomain?: string;
  }): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await apiClient.post('/unsubscribe', options);
      return response.data;
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      return {
        ok: false,
        message: error.response?.data?.error || 'Failed to unsubscribe',
      };
    }
  },
};

export default subscribersService;
