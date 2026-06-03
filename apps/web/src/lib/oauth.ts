import { useStore } from '../store/useStore';

const CONFIG = {
  pegawai: {
    issuer: import.meta.env.SSO_PEGAWAI_ISSUER || 'https://sso.bps.go.id/auth/realms/pegawai-bps',
    clientId: import.meta.env.SSO_PEGAWAI_CLIENT_ID || '',
    clientSecret: import.meta.env.SSO_PEGAWAI_CLIENT_SECRET || '',
    realm: 'pegawai-bps'
  },
  eksternal: {
    issuer: import.meta.env.SSO_EKSTERNAL_ISSUER || 'https://sso.bps.go.id/auth/realms/eksternal',
    clientId: import.meta.env.SSO_EKSTERNAL_CLIENT_ID || '',
    clientSecret: import.meta.env.SSO_EKSTERNAL_CLIENT_SECRET || '',
    realm: 'eksternal'
  }
};

export type SSOType = keyof typeof CONFIG;

export const loginWithSSO = (type: SSOType) => {
  const config = CONFIG[type];
  const redirectUri = window.location.origin + window.location.pathname;
  const url = `${config.issuer}/protocol/openid-connect/auth?client_id=${config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid&state=${type}`;
  window.location.href = url;
};

export const handleSSOCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state') as SSOType | null;
  
  if (!code) return false;

  const type: SSOType = state && CONFIG[state] ? state : 'pegawai';
  const config = CONFIG[type];

  try {
    const redirectUri = window.location.origin + window.location.pathname;
    const bodyParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: redirectUri,
    };
    
    if (config.clientSecret) {
      bodyParams.client_secret = config.clientSecret;
    }

    const body = new URLSearchParams(bodyParams);

    // Use Vite proxy in development to bypass CORS, or direct URL in production if allowed
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const tokenUrl = isDev 
      ? `/api/sso/auth/realms/${config.realm}/protocol/openid-connect/token`
      : `${config.issuer}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('SSO Token Error Response:', errText);
      throw new Error(`SSO Token Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.access_token) {
      useStore.getState().setGlobalSettings(data.access_token);
      localStorage.setItem('fasih_bearer_token', data.access_token);
      
      // Clean up the URL by removing the code parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  } catch (error) {
    console.error(`Failed to exchange SSO code for token (${type}):`, error);
  }
  return false;
};
