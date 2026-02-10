
// import { apiRequest } from './api.js'; // Using global window.apiRequest

console.log("🔑 Signin.js: Loaded.");

const loginForm = document.querySelector('form');
const signInBtn = document.getElementById('signInBtn');

if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
} else if (signInBtn) {
    signInBtn.addEventListener('click', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    console.log("🔑 Signin.js: Login Triggered.");

    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) return alert("Please enter your email and password.");

    const originalText = signInBtn.innerText;
    signInBtn.disabled = true;
    signInBtn.innerText = "Signing In...";

    try {
        const response = await apiRequest('/auth/login', 'POST', { email, password });

        console.log("✅ Login Successful:", response);

        if (response.data && response.data.token) {
            localStorage.setItem('authToken', response.data.token);
            // Also store user info if needed, but token is enough
            localStorage.setItem('user', JSON.stringify(response.data));

            window.location.replace('dashboard.html');
        } else {
            throw new Error("No token received");
        }

    } catch (error) {
        console.error("❌ Login Error:", error);
        alert(error.message || "Invalid email or password.");

        signInBtn.disabled = false;
        signInBtn.innerText = originalText;
    }
}
