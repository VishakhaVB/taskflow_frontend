console.log("📊 Dashboard.js: Loaded.");

// --- STATE ---
const STATE = {
    user: null,
    tasks: [],
    projects: []
};

// --- DOM ELEMENTS ---
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    userAvatarName: document.getElementById('userAvatarName'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statCompleted: document.getElementById('stat-completed'),
    statProjects: document.getElementById('stat-projects'),
    statProgress: document.getElementById('stat-progress'),

    // Lists
    listTodo: document.getElementById('list-todo'),
    listInProgress: document.getElementById('list-inprogress'),
    listCompleted: document.getElementById('list-completed'),
    miniProjectList: document.getElementById('miniProjectList'),

    // Counts
    countTodo: document.getElementById('count-todo'),
    countInProgress: document.getElementById('count-inprogress'),
    countCompleted: document.getElementById('count-completed'),

    // Actions
    addTaskBtn: document.getElementById('addTaskBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    taskForm: document.getElementById('taskForm'),
    modalOverlay: document.getElementById('modalOverlay')
};

// --- INIT ---
initDashboard();

async function initDashboard() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('signin.html');
        return;
    }

    try {
        // 1. Fetch User Profile
        const userRes = await apiRequest('/auth/me', 'GET', null, token);
        if (userRes.success) {
            STATE.user = userRes.data;
            setupUserDropdown(STATE.user);
            const name = STATE.user.name || STATE.user.email;
            if (elements.userAvatarName) elements.userAvatarName.innerText = name.charAt(0).toUpperCase();
        }

        // 2. Fetch Data (Parallel)
        await loadData(token);

    } catch (error) {
        console.error("❌ Dashboard Init Error:", error);
        if (error.message.includes('Unauthorized') || error.message.includes('token')) {
            showToast("Session Error: " + error.message, "error");
        } else {
            showToast("Failed to load dashboard data", "error");
        }
    }
}

async function loadData(token) {
    try {
        const [tasksRes, projectsRes] = await Promise.all([
            apiRequest('/tasks', 'GET', null, token),
            apiRequest('/projects', 'GET', null, token).catch(() => ({ success: false, data: [] }))
        ]);

        if (tasksRes.success) {
            STATE.tasks = tasksRes.data || [];
        }

        if (projectsRes.success) {
            STATE.projects = projectsRes.data || [];
        }

        updateDashboardUI();

    } catch (error) {
        console.error("❌ Data Fetch Error:", error);
        showToast("Could not load dashboard data", "error");
    }
}

// --- UI UPDATES ---
function updateDashboardUI() {
    const tasks = STATE.tasks;

    // 1. Calculate Stats
    const total = tasks.length;
    const completed = tasks.filter(t => ['Completed', 'Done', 'Finished'].includes(t.status)).length;
    const inProgress = tasks.filter(t => ['In Progress', 'Doing', 'Active'].includes(t.status)).length;

    // Calculate active projects (not 100% complete)
    const activeProjectsCount = STATE.projects.filter(proj => {
        const progress = calculateProjectProgress(proj._id || proj.id, proj.title);
        return progress < 100;
    }).length;

    // Update Stat Cards with animation
    animateValue(elements.statTotal, total);
    animateValue(elements.statCompleted, completed);
    animateValue(elements.statProjects, activeProjectsCount);
    animateValue(elements.statProgress, inProgress);

    // 2. Populate Kanban Columns
    // Normalize status checks
    const isTodo = s => ['To Do', 'Todo', 'Open'].includes(s);
    const isProgress = s => ['In Progress', 'Doing', 'Active'].includes(s);
    const isDone = s => ['Completed', 'Done', 'Finished'].includes(s);

    renderColumn(elements.listTodo, elements.countTodo, tasks.filter(t => isTodo(t.status) || (!isProgress(t.status) && !isDone(t.status))));
    renderColumn(elements.listInProgress, elements.countInProgress, tasks.filter(t => isProgress(t.status)));
    renderColumn(elements.listCompleted, elements.countCompleted, tasks.filter(t => isDone(t.status)));

    // 3. Render Active Projects
    renderMiniProjects();
}

function renderColumn(listEl, countEl, columnTasks) {
    if (!listEl) return;

    if (countEl) countEl.innerText = columnTasks.length;
    listEl.innerHTML = '';

    if (columnTasks.length === 0) {
        listEl.innerHTML = `<div class="empty-state">No tasks</div>`;
        return;
    }

    columnTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.onclick = () => window.location.href = 'tasks.html';

        const priorityClass = `p-${(task.priority || 'medium').toLowerCase()}`;
        const projectTag = task.project ? `<span class="badge-project" style="font-size:10px; padding:2px 6px; background:#f3f4f6; border-radius:4px; color:#6b7280;">${task.project}</span>` : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                 ${projectTag}
            </div>
            <div class="task-title" style="margin-bottom:8px;">${task.title}</div>
            <div class="task-meta">
                <span class="task-priority ${priorityClass}">${task.priority}</span>
                <span class="task-date">${new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function renderMiniProjects() {
    if (!elements.miniProjectList) return;
    elements.miniProjectList.innerHTML = '';

    // Calculate progress for each project and filter active ones
    const projectsWithProgress = STATE.projects.map(proj => {
        const progress = calculateProjectProgress(proj._id || proj.id, proj.title);
        return { ...proj, progress };
    });

    // Show only active projects (not 100% complete), max 5
    const activeProjects = projectsWithProgress
        .filter(p => p.progress < 100)
        .slice(0, 5);

    if (activeProjects.length === 0) {
        elements.miniProjectList.innerHTML = `
            <div class="empty-state" style="text-align:center; padding:20px; color:#9ca3af;">
                <div style="font-size:32px; margin-bottom:8px;">✅</div>
                <div style="font-size:13px;">All projects completed!</div>
            </div>`;
        return;
    }

    activeProjects.forEach(proj => {
        const progress = proj.progress;
        const status = deriveProjectStatus(progress);
        const isOverdue = checkOverdue(proj.dueDate, progress);
        
        // Get progress color
        let progressColor = '#6366f1'; // Default purple
        if (progress === 0) progressColor = '#d1d5db';
        else if (progress < 40) progressColor = '#ef4444';
        else if (progress < 100) progressColor = '#f59e0b';
        else progressColor = '#10b981';

        const div = document.createElement('div');
        div.className = 'mini-project-card';
        div.style.cssText = `
            background: white; 
            padding: 14px; 
            border-radius: 12px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.08); 
            border: 1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'};
            cursor: pointer;
            transition: all 0.2s;
        `;
        div.onmouseover = () => {
            div.style.transform = 'translateX(3px)';
            div.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
        };
        div.onmouseout = () => {
            div.style.transform = 'none';
            div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        };
        div.onclick = () => window.location.href = 'projects.html';

        const projectTasks = STATE.tasks.filter(t => 
            (t.projectId === (proj._id || proj.id)) || 
            (t.project === proj.title)
        );
        const taskCount = projectTasks.length;
        const completedCount = projectTasks.filter(t => 
            t.status === 'Completed' || t.status === 'Done'
        ).length;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <div style="flex:1;">
                    <div style="font-size:14px; font-weight:600; color:#111827; margin-bottom:4px;">${escapeHtml(proj.title)}</div>
                    <div style="font-size:11px; color:#6b7280;">${completedCount}/${taskCount} tasks</div>
                </div>
                <span style="font-size:10px; padding:3px 8px; border-radius:8px; font-weight:600; 
                    background:${status === 'Not Started' ? 'rgba(156,163,175,0.1)' : status === 'In Progress' ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.15)'};
                    color:${status === 'Not Started' ? '#6b7280' : status === 'In Progress' ? '#d97706' : '#059669'}">
                    ${status}
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:8px; background:#f3f4f6; border-radius:10px; overflow:hidden;">
                    <div style="height:100%; width:${progress}%; background:${progressColor}; border-radius:10px; transition:width 0.3s;"></div>
                </div>
                <span style="font-size:12px; font-weight:700; color:#374151; min-width:35px; text-align:right;">${progress}%</span>
            </div>
            ${isOverdue ? '<div style="font-size:10px; color:#dc2626; margin-top:6px; font-weight:600;">⚠ Overdue</div>' : ''}
        `;
        elements.miniProjectList.appendChild(div);
    });
}

// Helper: Calculate project progress
function calculateProjectProgress(projectId, projectTitle = null) {
    // Find project title if not provided
    if (!projectTitle) {
        const project = STATE.projects.find(p => (p._id || p.id) === projectId);
        projectTitle = project ? project.title : null;
    }
    
    const projectTasks = STATE.tasks.filter(t => {
        // Check projectId field
        if (t.projectId === projectId) return true;
        // Check if project is object with _id
        if (t.project && t.project._id === projectId) return true;
        // Check if project is ID string
        if (t.project === projectId) return true;
        // Match by project name/title
        if (projectTitle && t.project === projectTitle) return true;
        return false;
    });
    
    if (projectTasks.length === 0) return 0;
    
    const completedCount = projectTasks.filter(t => {
        const status = (t.status || '').toLowerCase();
        return status === 'completed' || status === 'done';
    }).length;
    
    return Math.round((completedCount / projectTasks.length) * 100);
}

// Helper: Derive project status from progress
function deriveProjectStatus(progress) {
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Completed';
    return 'In Progress';
}

// Helper: Check if project is overdue
function checkOverdue(dueDate, progress) {
    if (!dueDate || progress === 100) return false;
    return new Date(dueDate) < new Date();
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function animateValue(obj, end, duration = 500) {
    if (!obj) return;
    let startTimestamp = null;
    const start = parseInt(obj.innerText) || 0;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

// --- QUICK ACTION MENU ---
const fabBtn = document.getElementById('fabBtn');
const quickActionMenu = document.getElementById('quickActionMenu');
const quickAddTask = document.getElementById('quickAddTask');
const quickAddProject = document.getElementById('quickAddProject');
const quickAddReminder = document.getElementById('quickAddReminder');

// Toggle menu
if (fabBtn && quickActionMenu) {
    fabBtn.onclick = (e) => {
        e.stopPropagation();
        fabBtn.classList.toggle('active');
        quickActionMenu.classList.toggle('show');
    };

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        fabBtn.classList.remove('active');
        quickActionMenu.classList.remove('show');
    });

    quickActionMenu.onclick = (e) => e.stopPropagation();
}

// Quick actions
if (quickAddTask) {
    quickAddTask.onclick = () => {
        window.location.href = 'tasks.html?action=create';
    };
}

if (quickAddProject) {
    quickAddProject.onclick = () => {
        window.location.href = 'projects.html?action=create';
    };
}

if (quickAddReminder) {
    quickAddReminder.onclick = () => {
        showToast('Reminder feature coming soon!', 'info');
    };
}

// --- EVENT LISTENERS ---
if (elements.addTaskBtn) {
    elements.addTaskBtn.onclick = () => {
        window.location.href = 'tasks.html?action=create';
    };
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        confirmModal("Log out?", () => {
            localStorage.removeItem('authToken');
            window.location.href = 'signin.html';
        });
    });
}
