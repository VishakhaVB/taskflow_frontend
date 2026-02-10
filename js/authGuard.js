
console.log("🔒 AuthGuard: Initializing...");

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const path = window.location.pathname;
    const page = path.split('/').pop().split('?')[0];

    // Normalize page names
    // Only redirect away from Sign In / Sign Up if logged in
    const isAuthPage = ['signin.html', 'create_account.html'].includes(page);
    const isDashboard = page === 'dashboard.html';

    console.log(`🔒 AuthGuard: Checking Token. Token Exists: ${!!token} | Page: ${page}`);

    if (token) {
        if (isAuthPage) {
            console.log("🔒 AuthGuard: Redirecting Logged-In User to Dashboard.");
            window.location.replace('dashboard.html');
        }
    } else {
        if (isDashboard) {
            console.log("🔒 AuthGuard: Redirecting Guest to Login.");
            window.location.replace('signin.html');
        }
    }
}

// Run immediately
checkAuth();
