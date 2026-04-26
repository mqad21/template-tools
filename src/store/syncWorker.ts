
self.onmessage = async (e: MessageEvent) => {
  const { data, type } = e.data;
  
  if (type === 'SAVE_TO_DISK') {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        self.postMessage({ type: 'SAVE_SUCCESS' });
      } else {
        self.postMessage({ type: 'SAVE_ERROR', error: 'Server responded with error' });
      }
    } catch (error: any) {
      self.postMessage({ type: 'SAVE_ERROR', error: error.message });
    }
  }
};

export {}; // Ensure it's treated as a module
