import apiClient from '../lib/apiClient';

export interface SiteSettings {
  id?: string;
  userId?: string;
  siteName: string;
  siteDescription: string;
  customDomain: string | null;
  subdomain: string | null;
  twitterLink?: string | null;
  linkedinLink?: string | null;
  githubLink?: string | null;
  websiteLink?: string | null;
  dribbbleLink?: string | null;
  huggingfaceLink?: string | null;
  leetcodeLink?: string | null;
  newsletterEmail?: string | null;
  domainStatus?: 'pending' | 'verified' | 'active' | 'failed' | null;
}

const mapResponseToSettings = (data: any): SiteSettings => {
  return {
    id: data._id || data.id,
    userId: data.userId || data.user_id,
    siteName: data.siteName || data.site_name || '',
    siteDescription: data.siteDescription || data.site_description || '',
    customDomain: data.customDomain || data.custom_domain || null,
    subdomain: data.subdomain || null,
    twitterLink: data.twitterLink || data.twitter_link || null,
    linkedinLink: data.linkedinLink || data.linkedin_link || null,
    githubLink: data.githubLink || data.github_link || null,
    websiteLink: data.websiteLink || data.website_link || null,
    dribbbleLink: data.dribbbleLink || data.dribbble_link || null,
    huggingfaceLink: data.huggingfaceLink || data.huggingface_link || null,
    leetcodeLink: data.leetcodeLink || data.leetcode_link || null,
    newsletterEmail: data.newsletterEmail || data.newsletter_email || null,
    domainStatus: data.domainStatus || data.domain_status || null,
  };
};

export const settingsService = {
  async getSettings(): Promise<SiteSettings | null> {
    try {
      const response = await apiClient.get('/settings');
      return mapResponseToSettings(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  async getPublicSettings(): Promise<SiteSettings | null> {
    try {
      const response = await apiClient.get('/settings');
      return mapResponseToSettings(response.data);
    } catch (error) {
      console.error('Error fetching public settings:', error);
      return null;
    }
  },

  async getSettingsByCustomDomain(
    domain: string
  ): Promise<{ settings: SiteSettings; userId: string } | null> {
    try {
      const host = domain.toLowerCase();
      const cleanHost = host.startsWith('www.') ? host.slice(4) : host;

      const response = await apiClient.get(`/settings/domain/${cleanHost}`);
      const settings = mapResponseToSettings(response.data);

      return {
        settings,
        userId: settings.userId || response.data.userId || response.data.user_id,
      };
    } catch (error) {
      console.error('Error fetching settings by custom domain:', error);
      return null;
    }
  },

  async getSettingsBySubdomain(
    subdomain: string
  ): Promise<{ settings: SiteSettings; userId: string } | null> {
    try {
      const response = await apiClient.get(`/settings/subdomain/${subdomain}`);
      const settings = mapResponseToSettings(response.data);

      return {
        settings,
        userId: settings.userId || response.data.userId || response.data.user_id,
      };
    } catch (error) {
      console.error('Error fetching settings by subdomain:', error);
      return null;
    }
  },

  async saveSettings(settings: SiteSettings): Promise<SiteSettings | null> {
    try {
      const response = await apiClient.put('/settings', {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        customDomain: settings.customDomain?.toLowerCase() || null,
        subdomain: settings.subdomain,
        twitterLink: settings.twitterLink,
        linkedinLink: settings.linkedinLink,
        githubLink: settings.githubLink,
        websiteLink: settings.websiteLink,
        dribbbleLink: settings.dribbbleLink,
        huggingfaceLink: settings.huggingfaceLink,
        leetcodeLink: settings.leetcodeLink,
        newsletterEmail: settings.newsletterEmail,
        domainStatus: settings.domainStatus,
      });

      return mapResponseToSettings(response.data);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async verifyDomain(
    domain: string
  ): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      const response = await apiClient.post('/domains', {
        domain: domain.toLowerCase(),
      });

      return {
        success: true,
        verified: response.data.verified,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message,
      };
    }
  },

  async initializeSettings(settings: SiteSettings): Promise<SiteSettings | null> {
    try {
      const response = await apiClient.post('/settings/initialize', {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        subdomain: settings.subdomain,
      });

      return mapResponseToSettings(response.data);
    } catch (error) {
      console.error('Error initializing settings:', error);
      throw error;
    }
  },

  async getDomainStatus(): Promise<{
    hasDomain: boolean;
    domain?: string;
    status?: string;
    verified?: boolean;
    verification?: any;
  }> {
    try {
      const response = await apiClient.get('/domains/status');
      return response.data;
    } catch (error) {
      console.error('Error getting domain status:', error);
      return { hasDomain: false };
    }
  },

  async removeDomain(): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete('/domains');
      return response.data;
    } catch (error) {
      console.error('Error removing domain:', error);
      throw error;
    }
  },
};

export default settingsService;
