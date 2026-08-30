import { api } from '@/lib/api';

export interface DomainStatusResponse {
  status: string;
  hostname?: string;
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
}

export const registerDomain = async (domain: string) => {
  const response = await api.post('/domain', { domain });
  return response.data;
};

export const getDomainStatus = async (): Promise<DomainStatusResponse> => {
  const response = await api.get('/domain/status');
  return response.data;
};
