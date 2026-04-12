/* ScreenCap Chrome Extension - Popup Logic */

const APP_URL = 'https://snappit.adityakhare.com';
const $ = (id) => document.getElementById(id);

function showView(name) {
  ['loading', 'unauth', 'idle', 'recording'].forEach((v) => {
    const el = $(v + '-view');
    if (el) el.classList.toggle('hidden', v !== name);
  });
}

async function checkAuth() {
  try {
    // Get all cookies for the app domain
    const cookies = await chrome.cookies.getAll({ url: APP_URL });
    
    // Find the better-auth session cookie (handles dev and prod __Secure- prefixes)
    const sessionCookie = cookies.find((c) =>
      c.name.includes("better-auth.session_token")
    );

    if (!sessionCookie) return false;

    // Pass the cookie value as a Bearer token
    const res = await fetch(`${APP_URL}/api/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${sessionCookie.value}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.session?.userId || data?.user) {
        const user = data.user || data.session.user;
        $('userName').textContent = user.name || 'User';
        $('userEmail').textContent = user.email || '';
        return true;
      }
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }
  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  showView('loading');
  const isLoggedIn = await checkAuth();
  
  if (!isLoggedIn) {
    showView('unauth');
    return;
  }

  chrome.runtime.sendMessage({ action: 'get-status' }, (res) => {
    if (!res) return;
    if (res.state === 'recording') {
      showView('recording');
    } else {
      showView('idle');
    }
  });
});

$('signInBtn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL + '/sign-in' });
});

$('startBtn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'start-recording' }, (res) => {
    if (res?.ok) {
      showView('recording');
    } else {
      alert('Failed to start recording: ' + (res?.error || 'Unknown error'));
      showView('idle');
    }
  });
});

$('stopBtn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stop-recording' }, () => {
    window.close(); // Close the extension popup window after invoking stop
  });
});
