import { Auth0Client, createAuth0Client } from '@auth0/auth0-spa-js';

let auth0Client: Auth0Client | null = null;

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string;
const AUTH0_REDIRECT_URI = import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin;

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  console.error('Missing Auth0 environment variables. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your .env file.');
}

export async function getAuth0Client(): Promise<Auth0Client> {
  if (auth0Client) {
    return auth0Client;
  }

  auth0Client = await createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: AUTH0_REDIRECT_URI,
      audience: AUTH0_AUDIENCE,
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });

  return auth0Client;
}

export async function login(options?: { connection?: string }): Promise<void> {
  const client = await getAuth0Client();
  await client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: AUTH0_REDIRECT_URI,
      ...(options?.connection && { connection: options.connection }),
    },
  });
}

export async function loginWithPopup(options?: { connection?: string }): Promise<void> {
  const client = await getAuth0Client();
  await client.loginWithPopup({
    authorizationParams: {
      ...(options?.connection && { connection: options.connection }),
    },
  });
}

export async function signup(): Promise<void> {
  const client = await getAuth0Client();
  await client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: AUTH0_REDIRECT_URI,
      screen_hint: 'signup',
    },
  });
}

export async function logout(): Promise<void> {
  const client = await getAuth0Client();
  await client.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
}

export async function handleRedirectCallback(): Promise<void> {
  const client = await getAuth0Client();
  await client.handleRedirectCallback();
  window.history.replaceState({}, document.title, window.location.pathname);
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuth0Client();
  return client.isAuthenticated();
}

export async function getUser(): Promise<any> {
  const client = await getAuth0Client();
  return client.getUser();
}

export async function getAccessToken(): Promise<string | undefined> {
  const client = await getAuth0Client();
  try {
    const token = await client.getTokenSilently();
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return undefined;
  }
}

export async function checkSession(): Promise<boolean> {
  const client = await getAuth0Client();
  try {
    await client.checkSession();
    return client.isAuthenticated();
  } catch (error) {
    return false;
  }
}

export async function resetPassword(email: string): Promise<void> {
  const response = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      email,
      connection: 'Username-Password-Authentication',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send password reset email');
  }
}

export default {
  getAuth0Client,
  login,
  loginWithPopup,
  signup,
  logout,
  handleRedirectCallback,
  isAuthenticated,
  getUser,
  getAccessToken,
  checkSession,
  resetPassword,
};
