import axios from 'axios';

const VERCEL_API_BASE = 'https://api.vercel.com';

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}

export async function addDomainToVercel(domain: string): Promise<{
  success: boolean;
  verified: boolean;
  verification?: VercelDomainResponse['verification'];
}> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error('Vercel configuration missing');
  }

  try {
    const url = `${VERCEL_API_BASE}/v10/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`;

    const response = await axios.post<VercelDomainResponse>(
      url,
      { name: domain },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      verified: response.data.verified,
      verification: response.data.verification,
    };
  } catch (error: any) {
    if (error.response?.status === 409) {
      // Domain already exists
      return { success: true, verified: true };
    }
    throw error;
  }
}

export async function verifyDomain(domain: string): Promise<{
  verified: boolean;
  verification?: VercelDomainResponse['verification'];
}> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error('Vercel configuration missing');
  }

  try {
    const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${teamId ? `?teamId=${teamId}` : ''}`;

    const response = await axios.get<VercelDomainResponse>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      verified: response.data.verified,
      verification: response.data.verification,
    };
  } catch (error: any) {
    throw error;
  }
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error('Vercel configuration missing');
  }

  const url = `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${teamId ? `?teamId=${teamId}` : ''}`;

  await axios.delete(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
