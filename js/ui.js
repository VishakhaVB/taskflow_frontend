/**
 * Shared UI Logic
 * Handles User Avatar Dropdown, Toasts, Modals, and Loading States.
 */

// --- STATE ---
const UI_STATE = {
    toastTimeout: null
};

// --- USER DROPDOWN ---
function setupUserDropdown(user) {
    const avatar = document.getElementById('userAvatarName');
    const profileContainer = document.querySelector('.user-profile');

    if (!avatar || !profileContainer) return;

    // Remove existing dropdown if any (to prevent duplicates)
    const existing = document.getElementById('userDropdown');
    if (existing) existing.remove();

    // Create Dropdown HTML
    let dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'dropdown-menu';
    dropdown.innerHTML = `
        <div class="dropdown-header">
            <div class="dropdown-avatar">${(user.name || user.email).charAt(0).toUpperCase()}</div>
            <div class="dropdown-user-info">
                <span class="user-name">${user.name || 'User'}</span>
                <span class="user-email">${user.email}</span>
            </div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="profile.html" class="dropdown-item">
            <span class="dropdown-icon">👤</span>
            <span>Profile</span>
        </a>
        <div id="dropdownSettings" class="dropdown-item">
            <span class="dropdown-icon">⚙️</span>
            <span>Settings</span>
        </div>
        <div class="dropdown-divider"></div>
        <div id="dropdownLogout" class="dropdown-item text-danger">
            <span class="dropdown-icon">🚪</span>
            <span>Log Out</span>
        </div>
    `;
    profileContainer.appendChild(dropdown);

    // Toggle Logic
    avatar.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    };

    // Close on click outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });

    dropdown.onclick = (e) => e.stopPropagation();

    // Settings Handler
    const settingsBtn = document.getElementById('dropdownSettings');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            showToast('Settings page coming soon!', 'info');
            dropdown.classList.remove('show');
        };
    }

    // Logout
    const logoutBtn = document.getElementById('dropdownLogout');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            confirmModal("Are you sure you want to log out?", () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'signin.html';
            });
        };
    }
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
    // Ensure container exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- CONFIRM MODAL ---
function confirmModal(message, onConfirm) {
    // Simple browser confirm for now, but wrapped to allow future custom modal upgrade easily
    if (confirm(message)) {
        onConfirm();
    }
}

// --- LOADING STATES ---
function showLoading(element) {
    if (!element) return;
    element.dataset.originalText = element.innerText;
    element.innerText = 'Loading...';
    element.disabled = true;
    element.classList.add('btn-loading');
}

function hideLoading(element) {
    if (!element) return;
    if (element.dataset.originalText) {
        element.innerText = element.dataset.originalText;
    }
    element.disabled = false;
    element.classList.remove('btn-loading');
}

// --- EXPORT ---
window.setupUserDropdown = setupUserDropdown;
window.showToast = showToast;
window.confirmModal = confirmModal;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
