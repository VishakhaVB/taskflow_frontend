/**
 * TaskFlow Projects Logic
 * Handles CRUD, Progress Logic, and Grid Rendering via REST API
 */

// --- STATE ---
const STATE = {
    user: null,
    projects: [],
    tasks: [], // Need tasks to calculate progress
    filters: {
        search: '',
        showCompleted: true,
        status: 'all', // all, not-started, in-progress, completed
        priority: 'all', // all, low, medium, high
        sortBy: 'dueDate' // dueDate, progress, priority, updated
    },
    viewMode: 'grid' // grid or list
};

// --- DOM ELEMENTS ---
const elements = {
    projectsGrid: document.getElementById('projectsGrid'),
    searchInput: document.getElementById('searchInput'),
    showCompleted: document.getElementById('showCompleted'),
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    sortBy: document.getElementById('sortBy'),
    viewToggle: document.querySelectorAll('.view-toggle-btn'),
    statsTotal: document.getElementById('stats-total'),
    statsActive: document.getElementById('stats-active'),
    statsCompleted: document.getElementById('stats-completed'),
    statsDelayed: document.getElementById('stats-delayed'),

    modalOverlay: document.getElementById('modalOverlay'),
    addProjectBtn: document.getElementById('addProjectBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    projectForm: document.getElementById('projectForm'),
    modalTitle: document.getElementById('modalTitle'),

    // Form Inputs
    projectId: document.getElementById('projectId'),
    inputTitle: document.getElementById('inputTitle'),
    inputDesc: document.getElementById('inputDesc'),
    inputPriority: document.getElementById('inputPriority'),
    inputTheme: document.getElementById('inputTheme'),
    inputDate: document.getElementById('inputDate'),

    userAvatarName: document.getElementById('userAvatarName'),
    logoutBtn: document.getElementById('logoutBtn')
};

// --- INIT ---
initProjectsPage();

async function initProjectsPage() {
    console.log("🚀 Projects Page: Init");
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('signin.html');
        return;
    }

    try {
        // Fetch User
        const userRes = await apiRequest('/auth/me', 'GET', null, token);
        if (userRes.success) {
            STATE.user = userRes.data;
            setupUserDropdown(STATE.user);
            if (elements.userAvatarName) {
                elements.userAvatarName.innerText = (STATE.user.name || STATE.user.email).charAt(0).toUpperCase();
            }
        }

        // Fetch Data (Projects & Tasks)
        await loadData(token);

    } catch (error) {
        console.error("❌ Projects Init Error:", error);
        if (error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            window.location.replace('signin.html');
        }
    }
}

async function loadData(token) {
    try {
        // Parallel fetch for speed
        const [projectsRes, tasksRes] = await Promise.all([
            apiRequest('/projects', 'GET', null, token).catch(err => ({ success: false, data: [] })),
            apiRequest('/tasks', 'GET', null, token).catch(err => ({ success: false, data: [] }))
        ]);

        if (projectsRes.success) {
            STATE.projects = projectsRes.data || [];
        } else {
            // If backend project endpoint doesn't exist yet, mock for MVP or handle error
            // For now, assuming it WILL exist or we mock it locally if fails?
            // Let's assume standard behavior: if fail, empty list.
            console.warn("Could not fetch projects (API might be missing)");
            STATE.projects = [];
        }

        if (tasksRes.success) {
            STATE.tasks = tasksRes.data || [];
        }

        renderGrid();
    } catch (error) {
        showToast("Error loading data", "error");
    }
}

// --- OPERATIONS ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    showLoading(elements.projectForm.querySelector('button[type="submit"]'));

    const projectData = {
        title: elements.inputTitle.value.trim(),
        description: elements.inputDesc.value.trim(),
        // Remove manual status - will be auto-derived from task progress
        priority: elements.inputPriority.value,
        theme: elements.inputTheme.value,
        dueDate: elements.inputDate.value,
        userId: STATE.user.id || STATE.user._id,
    };

    const id = elements.projectId.value;

    try {
        let res;
        if (id) {
            res = await apiRequest(`/projects/${id}`, 'PUT', projectData, token);
        } else {
            res = await apiRequest('/projects', 'POST', projectData, token);
        }

        if (res.success) {
            showToast(id ? "Project updated ✓" : "Project created ✓", "success");
            closeModal();
            await loadData(token);
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        console.error("Save Error:", error);
        showToast(error.message || "Failed to save project", "error");
    } finally {
        hideLoading(elements.projectForm.querySelector('button[type="submit"]'));
    }
}

async function deleteProject(project) {
    // Check for active tasks
    const projectTasks = STATE.tasks.filter(t => t.project === project.title);
    if (projectTasks.length > 0) {
        alert(`Cannot delete project "${project.title}" because it has ${projectTasks.length} active tasks.`);
        return;
    }

    confirmModal(`Delete project "${project.title}"?`, async () => {
        const token = localStorage.getItem('authToken');
        try {
            const res = await apiRequest(`/projects/${project._id || project.id}`, 'DELETE', null, token);
            if (res.success) {
                showToast("Project deleted", "success");
                await loadData(token);
            } else {
                showToast("Failed to delete", "error");
            }
        } catch (error) {
            showToast("Error deleting project", "error");
        }
    });
}

async function completeProject(project, projectId) {
    const { progress, completed, total } = calculateProgress(projectId, project.title);
    
    if (progress === 100) {
        showToast("Project already completed!", "info");
        return;
    }
    
    if (total === 0) {
        showToast("Cannot complete project with no tasks", "error");
        return;
    }
    
    const incompleteTasks = total - completed;
    const message = `Complete all ${incompleteTasks} remaining task${incompleteTasks > 1 ? 's' : ''} in "${project.title}"?`;
    
    confirmModal(message, async () => {
        const token = localStorage.getItem('authToken');
        
        try {
            // Get all incomplete tasks for this project
            const projectTasks = STATE.tasks.filter(t => 
                ((t.projectId === projectId) || (t.project && t.project._id === projectId) || (t.project === projectId)) &&
                (t.status !== 'Completed' && t.status !== 'Done')
            );
            
            // Update all tasks to completed
            const updatePromises = projectTasks.map(task => 
                apiRequest(`/tasks/${task._id || task.id}`, 'PUT', { ...task, status: 'Completed' }, token)
            );
            
            await Promise.all(updatePromises);
            
            showToast(`Project "${project.title}" completed! 🎉`, "success");
            await loadData(token);
            
        } catch (error) {
            console.error("Complete Project Error:", error);
            showToast("Failed to complete project", "error");
        }
    });
}

// --- LOGIC ---
function calculateProgress(projectId, projectTitle = null) {
    // Find the project to get its title if not provided
    if (!projectTitle) {
        const project = STATE.projects.find(p => (p._id || p.id) === projectId);
        projectTitle = project ? project.title : null;
    }
    
    // Match tasks by projectId OR project name (for backward compatibility)
    const projectTasks = STATE.tasks.filter(t => {
        // Check projectId field first (most reliable)
        if (t.projectId === projectId) return true;
        // Check if project is an object with _id
        if (t.project && typeof t.project === 'object' && t.project._id === projectId) return true;
        // Check if project is just the ID string
        if (t.project === projectId) return true;
        // IMPORTANT: Also match by project name/title (for tasks that only have name)
        if (projectTitle && t.project === projectTitle) return true;
        return false;
    });
    
    if (projectTasks.length === 0) return { progress: 0, completed: 0, total: 0 };
    
    const completedCount = projectTasks.filter(t => {
        const status = (t.status || '').toLowerCase();
        return status === 'completed' || status === 'done';
    }).length;
    
    const progress = Math.round((completedCount / projectTasks.length) * 100);
    
    return { progress, completed: completedCount, total: projectTasks.length };
}

// Auto-derive status from actual progress
function deriveStatus(progress) {
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Completed';
    return 'In Progress';
}

// Get status class for badge styling
function getStatusClass(progress) {
    if (progress === 0) return 'not-started';
    if (progress === 100) return 'completed';
    return 'in-progress';
}

// Progress bar color based on completion
function getProgressColor(progress) {
    if (progress === 0) return 'fill-gray';
    if (progress < 40) return 'fill-red';
    if (progress < 100) return 'fill-yellow';
    return 'fill-green';
}

// Check if project is overdue
function isOverdue(dueDate, progress) {
    if (!dueDate || progress === 100) return false;
    return new Date(dueDate) < new Date();
}

// Project health indicator
function getProjectHealth(progress, overdue) {
    if (progress === 100) return { icon: '🟢', label: 'Completed', class: 'health-good' };
    if (overdue) return { icon: '🔴', label: 'Overdue', class: 'health-critical' };
    if (progress >= 60) return { icon: '🟡', label: 'On Track', class: 'health-ok' };
    if (progress > 0) return { icon: '🟠', label: 'Behind', class: 'health-warning' };
    return { icon: '⚪', label: 'Not Started', class: 'health-none' };
}

// --- RENDERING ---
function renderGrid() {
    const search = STATE.filters.search;
    const showCompleted = STATE.filters.showCompleted;
    const filterStatus = STATE.filters.status;
    const filterPriority = STATE.filters.priority;
    const sortBy = STATE.filters.sortBy;
    
    // Filter projects
    let filtered = STATE.projects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search);
        
        const projectId = p._id || p.id;
        const { progress } = calculateProgress(projectId, p.title);
        const status = deriveStatus(progress).toLowerCase().replace(/ /g, '-');
        
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        const matchesPriority = filterPriority === 'all' || p.priority === filterPriority;
        const matchesCompleted = showCompleted || progress < 100;
        
        return matchesSearch && matchesStatus && matchesPriority && matchesCompleted;
    });

    // Sort projects
    filtered = sortProjects(filtered, sortBy);
    
    // Update stats
    updateProjectStats(filtered);

    // Empty state
    if (filtered.length === 0) {
        const isEmpty = STATE.projects.length === 0;
        elements.projectsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 80px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">${isEmpty ? '📋' : '🔍'}</div>
                <h3 style="color: #374151; margin-bottom: 8px; font-size: 18px;">
                    ${isEmpty ? 'No projects yet' : 'No projects found'}
                </h3>
                <p style="font-size: 14px; color: #9ca3af;">
                    ${isEmpty ? 'Create your first project to get started' : 'Try adjusting your filters or search'}
                </p>
            </div>
        `;
        return;
    }

    // Render based on view mode
    if (STATE.viewMode === 'list') {
        renderListView(filtered);
    } else {
        renderGridView(filtered);
    }
}

// Sort projects helper
function sortProjects(projects, sortBy) {
    return [...projects].sort((a, b) => {
        const aId = a._id || a.id;
        const bId = b._id || b.id;
        
        switch(sortBy) {
            case 'progress':
                const aProgress = calculateProgress(aId, a.title).progress;
                const bProgress = calculateProgress(bId, b.title).progress;
                return bProgress - aProgress;
                
            case 'priority':
                const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                
            case 'updated':
                return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                
            case 'dueDate':
            default:
                const aDate = a.dueDate ? new Date(a.dueDate) : new Date('2099-12-31');
                const bDate = b.dueDate ? new Date(b.dueDate) : new Date('2099-12-31');
                return aDate - bDate;
        }
    });
}

// Update project statistics
function updateProjectStats(filteredProjects) {
    const total = filteredProjects.length;
    let active = 0, completed = 0, delayed = 0;
    
    filteredProjects.forEach(p => {
        const projectId = p._id || p.id;
        const { progress } = calculateProgress(projectId, p.title);
        const overdue = isOverdue(p.dueDate, progress);
        
        if (progress === 100) completed++;
        else active++;
        
        if (overdue) delayed++;
    });
    
    if (elements.statsTotal) elements.statsTotal.textContent = total;
    if (elements.statsActive) elements.statsActive.textContent = active;
    if (elements.statsCompleted) elements.statsCompleted.textContent = completed;
    if (elements.statsDelayed) elements.statsDelayed.textContent = delayed;
}

// Render Grid View
function renderGridView(projects) {
    elements.projectsGrid.innerHTML = '';
    elements.projectsGrid.className = 'projects-grid';
    
    projects.forEach(project => {
        renderProjectCard(project);
    });
}

// Render List View
function renderListView(projects) {
    elements.projectsGrid.className = 'projects-list';
    
    let html = `
        <div class="list-header">
            <div>Project</div>
            <div>Progress</div>
            <div>Tasks</div>
            <div>Due Date</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Actions</div>
        </div>
    `;
    
    projects.forEach(project => {
        html += renderProjectRow(project);
    });
    
    elements.projectsGrid.innerHTML = html;
    
    // Attach event listeners
    attachListRowListeners();
}

// Render individual project card
function renderProjectCard(project) {
    const projectId = project._id || project.id;
    const { progress, completed, total } = calculateProgress(projectId, project.title);
    const status = deriveStatus(progress);
    const statusClass = getStatusClass(progress);
    const progressColorClass = getProgressColor(progress);
    const overdueStatus = isOverdue(project.dueDate, progress);
    const health = getProjectHealth(progress, overdueStatus);
    const taskDist = getTaskDistribution(projectId);
    
    const theme = project.theme || 'purple';
    let priorityClass = 'priority-med';
    if (project.priority === 'High') priorityClass = 'priority-high';
    if (project.priority === 'Low') priorityClass = 'priority-low';

    const card = document.createElement('div');
    card.className = `project-card theme-${theme} ${overdueStatus ? 'card-overdue' : ''} ${progress === 100 ? 'completed' : ''}`;
    card.setAttribute('data-project-id', projectId);

    card.innerHTML = `
        ${renderQuickActions()}
        
        <div class="card-header-section">
            <div style="flex: 1;">
                <h3 class="project-title">${escapeHtml(project.title)}</h3>
                <p class="project-desc">${escapeHtml(project.description || 'No description')}</p>
            </div>
            <span class="priority-badge ${priorityClass}">${project.priority}</span>
        </div>
        
        <div class="progress-section">
            <div class="progress-row">
                <span class="status-pill ${statusClass}">${status}</span>
                <span class="health-indicator ${health.class}">${health.icon}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill ${progressColorClass}" style="width: ${progress}%"></div>
            </div>
            <div class="progress-info">
                <span class="progress-percent">${progress}%</span>
                <span class="task-count">${completed}/${total} tasks</span>
            </div>
        </div>
        
        <div class="card-footer">
            <div class="date-badge ${overdueStatus ? 'date-overdue' : ''}">
                <span class="date-icon">📅</span>
                <span class="date-text">${formatDateEnhanced(project.dueDate, overdueStatus)}</span>
            </div>
        </div>
    `;

    // Event listeners
    card.onclick = (e) => {
        if (!e.target.closest('.quick-actions') && !e.target.closest('.actions-menu')) {
            viewProjectDetail(project);
        }
    };
    
    attachCardActions(card, project, projectId);
    elements.projectsGrid.appendChild(card);
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Get initials from name
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Helper: Enhanced date formatting
function formatDateEnhanced(dateStr, isOverdue) {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const today = new Date();
    const diffTime = d - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (isOverdue) {
        const overdueDays = Math.abs(diffDays);
        return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    }
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks left`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get task distribution for a project
function getTaskDistribution(projectId) {
    const projectTasks = STATE.tasks.filter(t => 
        (t.projectId === projectId) || (t.project && t.project._id === projectId) || (t.project === projectId)
    );
    
    const todo = projectTasks.filter(t => t.status === 'To Do' || t.status === 'Todo').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress' || t.status === 'Doing').length;
    const done = projectTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    
    return { todo, inProgress, done };
}

// Render team members
function renderTeamMembers(project) {
    // For MVP, show current user
    // In production, would pull from project.teamMembers array
    const user = STATE.user;
    const initials = getInitials(user.name || user.email);
    
    return `
        <div class="team-members">
            <div class="member-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" 
                 title="${user.name || user.email}">
                ${initials}
            </div>
        </div>
    `;
}

// Render quick actions menu
function renderQuickActions() {
    return `
        <div class="quick-actions">
            <button class="actions-trigger">⋮</button>
            <div class="actions-menu">
                <div class="action-item" data-action="add-task">➕ Add Task</div>
                <div class="action-item" data-action="view">👁️ View Project</div>
                <div class="action-item" data-action="edit">✏️ Edit</div>
                <div class="action-item" data-action="complete">✓ Complete</div>
                <div class="action-item" data-action="duplicate">📋 Duplicate</div>
                <div class="action-item danger" data-action="delete">🗑️ Delete</div>
            </div>
        </div>
    `;
}

// Attach event listeners to card actions
function attachCardActions(card, project, projectId) {
    const trigger = card.querySelector('.actions-trigger');
    const menu = card.querySelector('.actions-menu');
    
    // Toggle menu
    trigger.onclick = (e) => {
        e.stopPropagation();
        // Close all other menus
        document.querySelectorAll('.actions-menu.active').forEach(m => {
            if (m !== menu) m.classList.remove('active');
        });
        menu.classList.toggle('active');
    };
    
    // Handle action clicks
    card.querySelectorAll('.action-item').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            menu.classList.remove('active');
            
            switch(action) {
                case 'add-task':
                    openTaskModalForProject(project);
                    break;
                case 'view':
                    viewProjectDetail(project);
                    break;
                case 'edit':
                    openModal(project);
                    break;
                case 'complete':
                    completeProject(project, projectId);
                    break;
                case 'duplicate':
                    duplicateProject(project);
                    break;
                case 'delete':
                    deleteProject(project);
                    break;
            }
        };
    });
}

// Render project row for list view
function renderProjectRow(project) {
    const projectId = project._id || project.id;
    const { progress, completed, total } = calculateProgress(projectId, project.title);
    const status = deriveStatus(progress);
    const statusClass = getStatusClass(progress);
    const progressColorClass = getProgressColor(progress);
    const overdueStatus = isOverdue(project.dueDate, progress);
    
    let priorityClass = 'priority-med';
    if (project.priority === 'High') priorityClass = 'priority-high';
    if (project.priority === 'Low') priorityClass = 'priority-low';
    
    const progressColor = progress === 0 ? '#d1d5db' : progress < 40 ? '#ef4444' : progress < 100 ? '#f59e0b' : '#10b981';
    
    return `
        <div class="list-row" data-project-id="${projectId}">
            <div>
                <div class="list-project-name">${escapeHtml(project.title)}</div>
                <div class="list-project-desc">${escapeHtml(project.description || 'No description')}</div>
            </div>
            <div class="list-progress">
                <div class="list-progress-bar">
                    <div class="list-progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                </div>
                <span class="list-progress-text">${progress}%</span>
            </div>
            <div style="font-size: 12px; font-weight: 600;">${completed}/${total}</div>
            <div style="font-size: 12px; color: ${overdueStatus ? '#dc2626' : '#6b7280'};">
                ${formatDateEnhanced(project.dueDate, overdueStatus)}
            </div>
            <div><span class="priority-badge ${priorityClass}" style="font-size: 9px; padding: 3px 8px;">${project.priority}</span></div>
            <div><span class="status-pill ${statusClass}" style="font-size: 10px; padding: 3px 10px;">${status}</span></div>
            <div>${renderQuickActions()}</div>
        </div>
    `;
}

// Attach listeners to list rows
function attachListRowListeners() {
    document.querySelectorAll('.list-row').forEach(row => {
        const projectId = row.dataset.projectId;
        const project = STATE.projects.find(p => (p._id || p.id) === projectId);
        
        if (project) {
            row.onclick = (e) => {
                if (!e.target.closest('.quick-actions')) {
                    viewProjectDetail(project);
                }
            };
            
            attachCardActions(row, project, projectId);
        }
    });
}

// View project detail (placeholder for future implementation)
function viewProjectDetail(project) {
    // Future: Navigate to project detail page with task board
    showToast(`Opening "${project.title}" detail view...`, 'info');
    console.log('View project detail:', project);
    // window.location.href = `project-detail.html?id=${project._id || project.id}`;
}

// Duplicate project
async function duplicateProject(project) {
    const token = localStorage.getItem('authToken');
    const newProject = {
        ...project,
        title: `${project.title} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    delete newProject._id;
    delete newProject.id;
    
    try {
        const res = await apiRequest('/projects', 'POST', newProject, token);
        if (res.success) {
            showToast('Project duplicated successfully', 'success');
            await loadData(token);
        }
    } catch (error) {
        showToast('Failed to duplicate project', 'error');
    }
}

// Open task creation modal with project pre-selected
function openTaskModalForProject(project) {
    // Store project info in sessionStorage for task creation
    sessionStorage.setItem('selectedProject', JSON.stringify({
        id: project._id || project.id,
        title: project.title
    }));
    
    // Navigate to tasks page with action parameter
    window.location.href = 'tasks.html?action=create&projectId=' + (project._id || project.id);
}

// --- MODAL ---
function openModal(project = null) {
    elements.modalOverlay.classList.add('open');
    if (project) {
        elements.modalTitle.innerText = "Edit Project";
        elements.projectId.value = project._id || project.id;
        elements.inputTitle.value = project.title;
        elements.inputDesc.value = project.description || '';
        // Remove status field - auto-derived from progress
        // elements.inputStatus.value = project.status;
        elements.inputPriority.value = project.priority;
        elements.inputTheme.value = project.theme || 'purple';

        if (project.dueDate) {
            const d = new Date(project.dueDate);
            elements.inputDate.value = d.toISOString().split('T')[0];
        }
    } else {
        elements.modalTitle.innerText = "Create Project";
        elements.projectForm.reset();
        elements.projectId.value = "";
        // Set default date to 7 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        elements.inputDate.value = defaultDate.toISOString().split('T')[0];
    }
}

function closeModal() {
    elements.modalOverlay.classList.remove('open');
}

// --- LISTENERS ---
// Debounced search for better performance
let searchTimeout;
elements.searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        STATE.filters.search = e.target.value.toLowerCase();
        renderGrid();
    }, 300);
};

// Show completed checkbox
if (elements.showCompleted) {
    elements.showCompleted.onchange = (e) => {
        STATE.filters.showCompleted = e.target.checked;
        renderGrid();
    };
}

// Filter by status
if (elements.filterStatus) {
    elements.filterStatus.onchange = (e) => {
        STATE.filters.status = e.target.value;
        renderGrid();
    };
}

// Filter by priority
if (elements.filterPriority) {
    elements.filterPriority.onchange = (e) => {
        STATE.filters.priority = e.target.value;
        renderGrid();
    };
}

// Sort by
if (elements.sortBy) {
    elements.sortBy.onchange = (e) => {
        STATE.filters.sortBy = e.target.value;
        renderGrid();
    };
}

// View toggle
elements.viewToggle.forEach(btn => {
    btn.onclick = () => {
        elements.viewToggle.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.viewMode = btn.dataset.view;
        renderGrid();
    };
});

// Close actions menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.quick-actions')) {
        document.querySelectorAll('.actions-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});

elements.addProjectBtn.onclick = () => openModal();
elements.closeModalBtn.onclick = closeModal;
elements.projectForm.onsubmit = handleFormSubmit;
elements.modalOverlay.onclick = (e) => { if (e.target === elements.modalOverlay) closeModal(); };

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        confirmModal("Log out?", () => {
            localStorage.removeItem('authToken');
            window.location.href = 'signin.html';
        });
    });
}

