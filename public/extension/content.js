chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkLogin') {
        // Check if user is logged in by checking for auth token
        const token = localStorage.getItem('snappit_auth_token');
        if (!token) {
            // Redirect to login page
            // window.location.href = 'https://snappit.thedevguy.in/sign-in';
            window.location.href = 'http://localhost:3000/sign-in';
        }
    }
});
