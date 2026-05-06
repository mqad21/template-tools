// Fasih Form Studio - Background Script

let pendingData: any = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openStudio') {
    pendingData = {
      templateId: request.templateId,
      template: request.template,
      validation: request.validation,
      token: request.token
    };
    handleOpenStudio(sendResponse);
    return true; 
  }

  if (request.action === 'bridgeReady' && pendingData) {
    console.log('Bridge ready, sending pending data...');
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'injectData',
        ...pendingData
      });
    }
  }

  if (request.action === 'fetchFromBps') {
    handleFetchFromBps(request.path, request.token, sendResponse);
    return true; // Keep channel open for async
  }
});

async function handleFetchFromBps(path: string, token: string, sendResponse: any) {
  console.log('[Background] Received fetch request for:', path);
  
  try {
    // 1. Find the BPS tab
    const tabs = await chrome.tabs.query({ 
      url: [
        'https://fasih-qd.bps.go.id/*',
        'https://fasih-survey.bps.go.id/*'
      ]
    });
    
    if (tabs.length === 0) {
      console.warn('[Background] No BPS tab found for proxy fetch');
      sendResponse({ success: false, error: 'No BPS tab found. Please keep a BPS tab open.' });
      return;
    }

    const targetTabId = tabs[0].id!;
    console.log('[Background] Proxying through tab:', targetTabId);

    // 2. Execute the fetch inside the tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: async (fetchPath, bearerToken) => {
        try {
          const response = await fetch(`https://fasih-qd.bps.go.id${fetchPath}`, {
            headers: {
              'Authorization': bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}`,
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          if (!response.ok) return { success: false, error: `BPS Server Error: ${response.status}` };
          
          const data = await response.json();
          return { success: true, data };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
      args: [path, token]
    });

    // 3. Send result back to Studio
    const result = results[0]?.result as any;
    if (result) {
      console.log('[Background] Proxy fetch success:', result.success);
      sendResponse(result);
    } else {
      sendResponse({ success: false, error: 'Script execution returned no result' });
    }

  } catch (error: any) {
    console.error('[Background] Critical fetch proxy error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleOpenStudio(sendResponse: any) {
  try {
    const studioUrl = chrome.runtime.getURL('studio.html');
    
    // Check if studio is already open
    const tabs = await chrome.tabs.query({ url: studioUrl + '*' });
    let targetTab: chrome.tabs.Tab;

    if (tabs.length > 0) {
      targetTab = tabs[0];
      await chrome.tabs.update(targetTab.id!, { active: true });
      // If already open, the bridgeReady might not fire again, so we send immediately too
      if (pendingData) {
        chrome.tabs.sendMessage(targetTab.id!, {
          action: 'injectData',
          ...pendingData
        });
      }
    } else {
      targetTab = await chrome.tabs.create({ url: studioUrl });
    }

    sendResponse({ success: true });
  } catch (error: any) {
    console.error('Failed to open studio:', error);
    sendResponse({ success: false, error: error.message });
  }
}
