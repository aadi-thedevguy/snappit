/* Background service worker – manages recording state & offscreen document */

const APP_URL = 'https://snappit.adityakhare.com';

let recordingState = 'idle'; // idle | recording
let startTime = 0;

async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Screen recording via getDisplayMedia',
    });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'get-status') {
    let elapsed = 0;
    if (recordingState === 'recording') {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
    }
    sendResponse({ state: recordingState, elapsed });
    return true;
  }

  if (msg.action === 'start-recording') {
    (async () => {
      try {
        await ensureOffscreen();
        chrome.runtime.sendMessage({ action: 'offscreen-start' });
        recordingState = 'recording';
        startTime = Date.now() + 3000;
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === 'stop-recording') {
    chrome.runtime.sendMessage({ action: 'offscreen-stop' });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'recording-stopped-by-user') {
    recordingState = 'idle';
    startTime = 0;
    
    chrome.tabs.create({ url: APP_URL + '/upload?from=extension' });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'show-countdown') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:white;display:flex;align-items:center;justify-content:center;font-size:10rem;font-weight:bold;z-index:2147483647;font-family:sans-serif;pointer-events:none;';
            document.body.appendChild(overlay);
            let count = 3;
            overlay.innerText = count;
            const int = setInterval(() => {
              count--;
              if (count > 0) {
                overlay.innerText = count;
              } else {
                clearInterval(int);
                overlay.remove();
              }
            }, 1000);
          }
        }).catch(err => console.error("Could not inject countdown overlay:", err));
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'get-recording') {
    const dbReq = indexedDB.open("snappit-temp", 1);
    dbReq.onsuccess = () => {
      const db = dbReq.result;
      if (!db.objectStoreNames.contains("pending-upload")) return sendResponse(null);
      const tx = db.transaction("pending-upload", "readonly");
      const req = tx.objectStore("pending-upload").get("current");
      req.onsuccess = () => sendResponse(req.result);
      req.onerror = () => sendResponse(null);
    };
    dbReq.onerror = () => sendResponse(null);
    return true;
  }

  if (msg.action === 'clear-recording') {
    const dbReq = indexedDB.open("snappit-temp", 1);
    dbReq.onsuccess = () => {
      const db = dbReq.result;
      if (db.objectStoreNames.contains("pending-upload")) {
        const tx = db.transaction("pending-upload", "readwrite");
        tx.objectStore("pending-upload").delete("current");
      }
    };
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
