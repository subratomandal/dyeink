import apiClient from '../lib/apiClient';

export interface BasicStats {
  totalViews: number;
  totalShares: number;
  totalSubscribers: number;
  graphData: {
    date: string;
    views: number;
    shares: number;
  }[];
}

export const statsService = {
  async trackEvent(postId: string, type: 'view' | 'share'): Promise<void> {
    try {
      await fetch(`/api/hit?id=${postId}&type=${type}`);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  },

  async getStats(): Promise<BasicStats | null> {
    try {
      const response = await apiClient.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  },

  async getUserStats(userId: string): Promise<BasicStats | null> {
    try {
      const response = await apiClient.get(`/stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  },
};

export default statsService;
