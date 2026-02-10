/**
 * TaskFlow Notifications Logic
 * Mocks a notification system for MVP since backend lacks it.
 * Generates notifications based on local logic (Welcome, Random updates).
 */

const STATE = {
    notifications: []
};

const elements = {
    list: document.getElementById('notificationList'),
    markAllBtn: document.getElementById('markAllReadBtn'),
    userAvatarName: document.getElementById('userAvatarName'),
    logoutBtn: document.getElementById('logoutBtn')
};

// --- INIT ---
initNotifications();

async function initNotifications() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('signin.html');
        return;
    }

    try {
        const userRes = await apiRequest('/auth/me', 'GET', null, token);
        if (userRes.success) {
            const user = userRes.data;
            setupUserDropdown(user);
            if (elements.userAvatarName) {
                elements.userAvatarName.innerText = (user.name || user.email).charAt(0).toUpperCase();
            }

            // For MVP: Generate fake notifications if none exist locally
            loadMockNotifications(user.name);
        }

    } catch (error) {
        console.error("Notif Init Error:", error);
        if (error.message.includes('Unauthorized')) {
            window.location.replace('signin.html');
        }
    }
}

function loadMockNotifications(userName) {
    // Check if we have stored notifications to persist read state (simulated)
    const stored = localStorage.getItem('taskflow_notifications');

    if (stored) {
        STATE.notifications = JSON.parse(stored);
    } else {
        // Generate seeds
        STATE.notifications = [
            {
                id: 1,
                type: 'welcome',
                message: `Welcome to TaskFlow, ${userName}! Start by creating your first project.`,
                time: 'Just now',
                read: false,
                icon: '👋'
            },
            {
                id: 2,
                type: 'info',
                message: 'Your dashboard is ready. Check out the new Kanban board.',
                time: '5 mins ago',
                read: false,
                icon: '📊'
            },
            {
                id: 3,
                type: 'success',
                message: 'Project "Mobile App Redesign" was created successfully.',
                time: '1 hour ago',
                read: true,
                icon: '✅'
            },
            {
                id: 4,
                type: 'alert',
                message: 'Reminder: Weekly sync meeting is coming up tomorrow.',
                time: '2 hours ago',
                read: true,
                icon: '⏰'
            }
        ];
        saveNotifs();
    }

    renderNotifications();
}

function saveNotifs() {
    localStorage.setItem('taskflow_notifications', JSON.stringify(STATE.notifications));
}

function renderNotifications() {
    elements.list.innerHTML = '';

    if (STATE.notifications.length === 0) {
        elements.list.innerHTML = `<div class="empty-state">You're all caught up! 🎉</div>`;
        return;
    }

    STATE.notifications.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notification-card ${notif.read ? 'read' : 'unread'}`;

        card.innerHTML = `
            <div class="notif-icon">${notif.icon}</div>
            <div class="notif-content">
                <div class="notif-msg">${notif.message}</div>
                <div class="notif-time">${notif.time}</div>
            </div>
            ${!notif.read ? '<div class="notif-dot"></div>' : ''}
        `;

        // Click to mark read
        card.addEventListener('click', () => {
            if (!notif.read) {
                notif.read = true;
                saveNotifs();
                renderNotifications();
            }
        });

        elements.list.appendChild(card);
    });
}

// --- ACTIONS ---
elements.markAllBtn.onclick = () => {
    const unreadCount = STATE.notifications.filter(n => !n.read).length;
    if (unreadCount === 0) {
        showToast("No unread notifications", "info");
        return;
    }

    STATE.notifications.forEach(n => n.read = true);
    saveNotifs();
    renderNotifications();
    showToast("All notifications marked as read", "success");
};

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        confirmModal("Log out?", () => {
            localStorage.removeItem('authToken');
            window.location.href = 'signin.html';
        });
    });
}
