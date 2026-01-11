import apiClient from '../lib/apiClient';
import type { Domain, DNSInstructions, CreateDomainInput } from '../types';

export const domainsApi = {
  list: async (): Promise<{ domains: Domain[] }> => {
    const { data } = await apiClient.get('/domains');
    return data;
  },

  create: async (
    input: CreateDomainInput
  ): Promise<{ domain: Domain; instructions: DNSInstructions }> => {
    const { data } = await apiClient.post('/domains/add', input);
    return data;
  },

  getInstructions: async (
    id: number
  ): Promise<{ domain: Domain; instructions: DNSInstructions }> => {
    const { data } = await apiClient.get(`/domains/${id}`);
    return data;
  },

  verify: async (id: number): Promise<{ domain: Domain }> => {
    const { data } = await apiClient.post(`/domains/verify`, { id });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/domains/${id}`);
  },
};

export default apiClient;
