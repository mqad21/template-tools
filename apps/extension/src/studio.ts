// studio.ts - Script for studio.html bridge
console.log('Fasih Studio Bridge Loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'injectData') {
    console.log('Bridge received data, injecting to iframe...');
    const frame = document.getElementById('studio-frame') as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({
        type: 'FFS_SYNC',
        templateId: message.templateId,
        template: message.template,
        validation: message.validation,
        token: message.token
      }, '*');
    }
  }
});

// Notify background that bridge is ready
chrome.runtime.sendMessage({ action: 'bridgeReady' });
