/**
 * Sidebar Component
 * Reusable sidebar navigation for all pages
 */

function createSidebar(activePage = '') {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    
    sidebar.innerHTML = `
        <a href="index.html" class="logo" style="text-decoration:none; color:inherit;">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="#6366F1" stroke-width="2" />
            </svg>
            <span>TaskFlow</span>
        </a>

        <nav class="nav-menu">
            <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                <span>Dashboard</span>
            </a>
            <a href="tasks.html" class="nav-item ${activePage === 'tasks' ? 'active' : ''}">
                <span>Tasks</span>
            </a>
            <a href="projects.html" class="nav-item ${activePage === 'projects' ? 'active' : ''}">
                <span>Projects</span>
            </a>
            <a href="calendar.html" class="nav-item ${activePage === 'calendar' ? 'active' : ''}">
                <span>Calendar</span>
            </a>
            <a href="notifications.html" class="nav-item ${activePage === 'notifications' ? 'active' : ''}">
                <span>Notifications</span>
            </a>
        </nav>

        <div class="nav-item" id="logoutBtn" style="margin-top: auto; color: #ef4444;">
            <span>Log Out</span>
        </div>
    `;
    
    // Setup logout handler
    setTimeout(() => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof confirmModal === 'function') {
                    confirmModal("Are you sure you want to log out?", () => {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        window.location.href = 'signin.html';
                    });
                } else {
                    if (confirm("Are you sure you want to log out?")) {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        window.location.href = 'signin.html';
                    }
                }
            });
        }
    }, 100);
    
    return sidebar;
}

function renderSidebar(activePage = '') {
    const existingSidebar = document.querySelector('.sidebar');
    if (existingSidebar) {
        existingSidebar.replaceWith(createSidebar(activePage));
    } else {
        document.body.prepend(createSidebar(activePage));
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSidebar, renderSidebar };
}
