
// import { apiRequest } from './api.js'; // Using global window.apiRequest

console.log("🚀 Signup.js: Loaded.");

const signupForm = document.querySelector('form');
const signUpBtn = document.getElementById('signUpBtn');

const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');

// Attach Listener
if (signupForm) {
    console.log("🚀 Signup.js: Attaching listener to FORM.");
    signupForm.addEventListener('submit', handleSignup);
} else if (signUpBtn) {
    console.log("🚀 Signup.js: Attaching listener to BUTTON (Fallback).");
    signUpBtn.addEventListener('click', handleSignup);
} else {
    console.error("❌ Signup.js: Create Account Form/Button NOT FOUND.");
}

async function handleSignup(e) {
    e.preventDefault();
    console.log("🚀 Signup.js: Signup Triggered.");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    // Validation
    if (!name) return alert("Please enter your full name.");
    if (!email) return alert("Please enter a valid email address.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (confirmPassword && password !== confirmPassword) return alert("Passwords do not match.");

    // Lock UI
    const originalText = signUpBtn.innerText;
    signUpBtn.disabled = true;
    signUpBtn.innerText = "Creating Account...";

    try {
        const response = await apiRequest('/auth/signup', 'POST', { name, email, password });

        console.log("✅ User Created:", response);
        alert("Account created successfully! Please sign in.");

        window.location.href = 'signin.html';

    } catch (error) {
        console.error("❌ Signup Error:", error);
        alert("Error: " + error.message);

        signUpBtn.disabled = false;
        signUpBtn.innerText = originalText;
    }
}
