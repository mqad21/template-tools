import { useStore } from '../store/useStore';

const ISSUER = import.meta.env.SSO_PEGAWAI_ISSUER || 'https://sso.bps.go.id/auth/realms/pegawai-bps';
const CLIENT_ID = import.meta.env.SSO_PEGAWAI_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.SSO_PEGAWAI_CLIENT_SECRET || '';

export const loginWithSSO = () => {
  const redirectUri = window.location.origin + window.location.pathname;
  const url = `${ISSUER}/protocol/openid-connect/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid`;
  window.location.href = url;
};

export const handleSSOCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) return false;

  try {
    const redirectUri = window.location.origin + window.location.pathname;
    const bodyParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri,
    };
    
    if (CLIENT_SECRET) {
      bodyParams.client_secret = CLIENT_SECRET;
    }

    const body = new URLSearchParams(bodyParams);

    // Use Vite proxy in development to bypass CORS, or direct URL in production if allowed
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const tokenUrl = isDev 
      ? '/api/sso/auth/realms/pegawai-bps/protocol/openid-connect/token'
      : `${ISSUER}/protocol/openid-connect/token`;

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
    console.error('Failed to exchange SSO code for token:', error);
  }
  return false;
};
