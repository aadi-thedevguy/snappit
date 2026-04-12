/* Communicates with background service worker; recording runs in offscreen doc */

let mediaRecorder = null;
let chunks = [];
let stream = null;
const DB_NAME = "snappit-temp";
const STORE_NAME = "pending-upload";
const KEY = "current";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'offscreen-start') {
    startRecording();
  } else if (msg.action === 'offscreen-stop') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }
});

async function startRecording() {
  try {
    // Clear any orphaned data from previous abandoned extension sessions
    const db = await openDB();
    if (db.objectStoreNames.contains(STORE_NAME)) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(KEY);
    }

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    });

    chrome.runtime.sendMessage({ action: 'show-countdown' });
    
    for (let i = 3; i > 0; i--) {
      if (!stream.active) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    
    if (!stream.active) return;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const recordedBlob = new Blob(chunks, { type: 'video/webm' });
      
      // Convert Blob to a Base64 Data URL to safely cross the Chrome Messaging boundary
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        chrome.runtime.sendMessage({ action: 'get-status' }, (res) => {
          const duration = res?.elapsed || 0;
          openDB().then((db) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put({ dataUrl, type: recordedBlob.type, duration }, KEY);
            tx.oncomplete = () => chrome.runtime.sendMessage({ action: 'recording-stopped-by-user' });
          }).catch(err => console.error('Failed to save to IndexedDB', err));
        });
      };
      reader.readAsDataURL(recordedBlob);
    };

    stream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };

    mediaRecorder.start(1000);
  } catch (err) {
    console.error('Recording failed:', err);
    chrome.runtime.sendMessage({ action: 'recording-stopped-by-user' });
  }
}
