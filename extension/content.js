// Runs on the web app to transfer the recording from the extension's IndexedDB into the web app's IndexedDB
if (window.location.search.includes('from=extension')) {
  chrome.runtime.sendMessage({ action: 'get-recording' }, async (response) => {
    if (response && response.dataUrl) {
      // Convert the Base64 string back into a raw binary ArrayBuffer
      const res = await fetch(response.dataUrl);
      const arrayBuffer = await res.arrayBuffer();

      const req = indexedDB.open("snappit-temp", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("pending-upload")) {
          req.result.createObjectStore("pending-upload");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("pending-upload", "readwrite");
        tx.objectStore("pending-upload").put({
          buffer: arrayBuffer,
          type: response.type || "video/webm",
          duration: response.duration
        }, "current");

        tx.oncomplete = () => {
          chrome.runtime.sendMessage({ action: 'clear-recording' });
          window.location.replace(window.location.pathname); // Remove query param and reload safely
        };
      };
    }
  });
}