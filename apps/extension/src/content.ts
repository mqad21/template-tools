// Fasih Form Studio - Content Script
console.log('Fasih Form Studio Helper Loaded');

const createFloatingButton = () => {
  const button = document.createElement('button');
  button.id = 'ffs-open-button';
  button.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
      </svg>
      <span>Buka di Fasih Form Studio</span>
    </div>
  `;

  // Premium Styling
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '99999',
    padding: '12px 20px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px) scale(1.02)';
    button.style.backgroundColor = '#111';
    button.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -6px rgba(0, 0, 0, 0.4)';
  };

  button.onmouseout = () => {
    button.style.transform = 'translateY(0) scale(1)';
    button.style.backgroundColor = '#000';
    button.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)';
  };

  button.onclick = async () => {
    const templateId = window.location.pathname.split('/').pop();
    if (!templateId) return;

    button.innerHTML = '<span>Syncing...</span>';
    button.disabled = true;

    try {
      // THE TOKEN DETECTIVE 2.0 (Deep Scan)
      const findToken = () => {
        const storages = [localStorage, sessionStorage];
        
        // Helper to check if a string looks like a JWT
        const isJWT = (str: string) => str && str.startsWith('ey') && str.includes('.');

        // 1. Scan everything
        for (const storage of storages) {
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            const val = storage.getItem(key);
            if (!val) continue;

            // Direct JWT
            if (isJWT(val)) return val;

            // Try to parse as JSON to find nested tokens
            try {
              if (val.startsWith('{') || val.startsWith('[')) {
                const obj = JSON.parse(val);
                // Deep scan object for token-like fields
                const keysToSearch = ['token', 'accessToken', 'access_token', 'id_token', 'idToken', 'bearer'];
                
                // Search top level
                for (const k of keysToSearch) {
                  if (obj[k] && typeof obj[k] === 'string' && isJWT(obj[k])) return obj[k];
                }

                // Search inside 'user' or 'auth' nested objects
                const nested = obj.user || obj.auth || obj.session || obj;
                for (const k of keysToSearch) {
                  if (nested[k] && typeof nested[k] === 'string' && isJWT(nested[k])) return nested[k];
                }
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
        
        return null;
      };

      const token = findToken();
      
      const headers: Record<string, string> = {
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      };

      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Token found and attached to request');
      } else {
        console.warn('Bearer token not found in any storage. Available keys:', Object.keys(localStorage));
      }

      // Fetch directly from content script context
      const [template, validation] = await Promise.all([
        fetchData(`https://fasih-qd.bps.go.id/designer/api/template/develop/file/${templateId}`, headers),
        fetchData(`https://fasih-qd.bps.go.id/designer/api/template/develop/file-validation/${templateId}`, headers)
      ]);

      // Send data to background to open the studio
      chrome.runtime.sendMessage({ 
        action: 'openStudio', 
        templateId,
        template,
        validation,
        token // <-- Kirim token sekalian bos
      }, (response) => {
        button.innerHTML = '<span>Buka di Fasih Form Studio</span>';
        button.disabled = false;
      });
    } catch (error: any) {
      console.error('Fetch failed:', error);
      alert('Sync failed: ' + error.message);
      button.innerHTML = '<span>Buka di Fasih Form Studio</span>';
      button.disabled = false;
    }
  };

  document.body.appendChild(button);
};

async function fetchData(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

// Initial injection
if (document.readyState === 'complete') {
  createFloatingButton();
} else {
  window.addEventListener('load', createFloatingButton);
}
