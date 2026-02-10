/**
 * Header Component
 * Reusable top header for all pages
 */

function createHeader(pageTitle = 'Dashboard', showSearch = true) {
    const header = document.createElement('header');
    header.className = 'top-header';
    
    header.innerHTML = `
        <h2 class="header-title">${pageTitle}</h2>

        <div class="header-right">
            ${showSearch ? `
            <div class="search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" placeholder="Search...">
            </div>
            ` : ''}

            <div class="user-profile">
                <div class="avatar" id="userAvatarName">U</div>
            </div>
        </div>
    `;
    
    // Initialize user avatar
    setTimeout(() => {
        initUserAvatar();
    }, 100);
    
    return header;
}

function initUserAvatar() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userAvatarName = document.getElementById('userAvatarName');
    
    if (userAvatarName && user.email) {
        const displayName = user.name || user.email;
        userAvatarName.innerText = displayName.charAt(0).toUpperCase();
        
        // Setup dropdown if ui.js is loaded
        if (typeof setupUserDropdown === 'function') {
            setupUserDropdown(user);
        }
    }
}

function renderHeader(pageTitle = 'Dashboard', showSearch = true, containerSelector = '.main-content') {
    const container = document.querySelector(containerSelector);
    if (container) {
        const existingHeader = container.querySelector('.top-header');
        if (existingHeader) {
            existingHeader.replaceWith(createHeader(pageTitle, showSearch));
        } else {
            container.prepend(createHeader(pageTitle, showSearch));
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createHeader, renderHeader, initUserAvatar };
}
