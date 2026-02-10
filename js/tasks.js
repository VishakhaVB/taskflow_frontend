/**
 * TaskFlow Tasks Logic
 * Handles CRUD and Table functionality via REST API
 */

// --- STATE ---
const STATE = {
    user: null,
    tasks: [],
    projects: [], // Derived from tasks for now, or fetch if API exists
    filters: {
        status: 'All',
        priority: 'All',
        project: 'All',
        search: ''
    }
};

// --- DOM ELEMENTS ---
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    userAvatarName: document.getElementById('userAvatarName'),

    // Filters
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    filterProject: document.getElementById('filterProject'),
    searchInput: document.getElementById('searchInput'),

    // Table
    tableBody: document.getElementById('taskTableBody'),

    // Modal & Form
    modalOverlay: document.getElementById('modalOverlay'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    taskForm: document.getElementById('taskForm'),
    modalTitle: document.getElementById('modalTitle'),

    // Form Inputs
    taskId: document.getElementById('taskId'),
    inputTitle: document.getElementById('inputTitle'),
    inputProject: document.getElementById('inputProject'),
    inputPriority: document.getElementById('inputPriority'),
    inputStatus: document.getElementById('inputStatus'),
    inputDate: document.getElementById('inputDate')
};

// --- INIT ---
initTasksPage();

async function initTasksPage() {
    console.log("📝 Tasks Page: Init");
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('signin.html');
        return;
    }

    // 1. Check for Action param (e.g. ?action=create&projectId=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const projectId = urlParams.get('projectId');

    try {
        // Fetch User
        const userRes = await apiRequest('/auth/me', 'GET', null, token);
        if (userRes.success) {
            STATE.user = userRes.data;
            setupUserDropdown(STATE.user);
            if (elements.userAvatarName) elements.userAvatarName.innerText = (STATE.user.name || STATE.user.email).charAt(0).toUpperCase();
        }

        // Fetch Tasks and Projects in parallel
        await loadData(token);

        // Open Modal if requested
        if (action === 'create') {
            // Get project info from sessionStorage if available
            const selectedProject = sessionStorage.getItem('selectedProject');
            let preSelectedProject = null;
            
            if (selectedProject) {
                preSelectedProject = JSON.parse(selectedProject);
                sessionStorage.removeItem('selectedProject');
            } else if (projectId) {
                // Find project by ID
                preSelectedProject = STATE.projects.find(p => (p._id || p.id) === projectId);
            }
            
            openModal(null, preSelectedProject);
            // Clean URL
            window.history.replaceState({}, document.title, "tasks.html");
        }

    } catch (error) {
        console.error("❌ Tasks Init Error:", error);
        if (error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            window.location.replace('signin.html');
        }
    }
}

// --- DATA OPERATIONS ---
async function loadData(token) {
    try {
        // Fetch tasks and projects in parallel
        const [tasksRes, projectsRes] = await Promise.all([
            apiRequest('/tasks', 'GET', null, token),
            apiRequest('/projects', 'GET', null, token).catch(() => ({ success: false, data: [] }))
        ]);
        
        if (tasksRes.success) {
            STATE.tasks = tasksRes.data || [];
        }
        
        if (projectsRes.success && projectsRes.data) {
            STATE.projects = projectsRes.data;
        } else {
            // Fallback: Extract unique projects from tasks
            const uniqueProjects = [...new Set(STATE.tasks.map(t => t.project).filter(Boolean))];
            STATE.projects = uniqueProjects.map(name => ({ title: name, _id: name }));
        }
        
        populateProjectDropdowns();
        renderTable();
    } catch (error) {
        console.error('Load data error:', error);
        showToast("Error loading data", "error");
    }
}

async function loadTasks(token) {
    await loadData(token);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    showLoading(elements.taskForm.querySelector('button[type="submit"]'));

    const selectedProjectOption = elements.inputProject.selectedOptions[0];
    const projectId = selectedProjectOption ? selectedProjectOption.dataset.projectId : null;
    const projectName = elements.inputProject.value;

    const taskData = {
        title: elements.inputTitle.value,
        project: projectName,
        projectId: projectId || null,
        priority: elements.inputPriority.value,
        status: elements.inputStatus.value,
        dueDate: elements.inputDate.value,
        assignee: STATE.user.email
    };

    const id = elements.taskId.value;

    try {
        let res;
        if (id) {
            // Edit
            res = await apiRequest(`/tasks/${id}`, 'PUT', taskData, token);
        } else {
            // Create
            res = await apiRequest('/tasks', 'POST', taskData, token);
        }

        if (res.success) {
            showToast(id ? "Task updated!" : "Task created!", "success");
            closeModal();
            await loadTasks(token); // Reload to reflect changes
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        console.error("Save Error:", error);
        showToast(error.message || "Failed to save task", "error");
    } finally {
        hideLoading(elements.taskForm.querySelector('button[type="submit"]'));
    }
}

async function deleteTask(id) {
    confirmModal('Are you sure you want to delete this task?', async () => {
        const token = localStorage.getItem('authToken');
        try {
            const res = await apiRequest(`/tasks/${id}`, 'DELETE', null, token);
            if (res.success) {
                showToast("Task deleted", "success");
                await loadTasks(token);
            } else {
                showToast(res.message, "error");
            }
        } catch (error) {
            showToast("Failed to delete task", "error");
        }
    });
}

// --- UI HELPERS ---
function populateProjectDropdowns() {
    // Filter Dropdown
    if (elements.filterProject) {
        const currentVal = elements.filterProject.value;
        elements.filterProject.innerHTML = `<option value="All">Project: All</option>`;
        STATE.projects.forEach(p => {
            const projectTitle = p.title || p;
            elements.filterProject.innerHTML += `<option value="${projectTitle}">${projectTitle}</option>`;
        });
        if (currentVal && currentVal !== 'All') elements.filterProject.value = currentVal;
    }

    // Input Dropdown (Form)
    if (elements.inputProject) {
        const currentVal = elements.inputProject.value;
        elements.inputProject.innerHTML = `<option value="" disabled>Select Project</option>`;
        
        // Add "No Project" option
        elements.inputProject.innerHTML += `<option value="General">General</option>`;
        
        // Add all projects
        STATE.projects.forEach(p => {
            const projectTitle = p.title || p;
            const projectId = p._id || p.id || projectTitle;
            elements.inputProject.innerHTML += `<option value="${projectTitle}" data-project-id="${projectId}">${projectTitle}</option>`;
        });
        
        // Restore previous value if exists
        if (currentVal) elements.inputProject.value = currentVal;
    }
}

// --- RENDER TABLE ---
function renderTable() {
    if (!elements.tableBody) return;
    elements.tableBody.innerHTML = '';

    const filtered = STATE.tasks.filter(task => {
        const tStatus = (task.status || '').toLowerCase();
        const fStatus = STATE.filters.status.toLowerCase();
        const matchStatus = fStatus === 'all' || tStatus === fStatus || (fStatus === 'completed' && tStatus === 'done'); // Normalize 'done'/'completed'

        const matchPriority = STATE.filters.priority === 'All' || task.priority === STATE.filters.priority;
        const matchProject = STATE.filters.project === 'All' || task.project === STATE.filters.project;
        const matchSearch = !STATE.filters.search || task.title.toLowerCase().includes(STATE.filters.search.toLowerCase());

        return matchStatus && matchPriority && matchProject && matchSearch;
    });

    if (filtered.length === 0) {
        elements.tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted">No tasks found</td></tr>`;
        return;
    }

    // Sort by Due Date
    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    filtered.forEach(task => {
        const tr = document.createElement('tr');

        const statusClass = `status-${(task.status || 'todo').replace(/\s+/g, '').toLowerCase()}`;
        const priorityClass = `p-${(task.priority || 'medium').toLowerCase()}`;

        tr.innerHTML = `
            <td><strong>${task.title}</strong></td>
            <td><span class="badge-project">${task.project || '-'}</span></td>
            <td><span class="priority-badge ${priorityClass}">${task.priority}</span></td>
            <td><span class="status-badge ${statusClass}">${task.status}</span></td>
            <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
            <td>
                <div class="user-avatar-sm" title="${task.assignee}">
                    ${(task.assignee || 'U').charAt(0).toUpperCase()}
                </div>
            </td>
            <td>
                <button class="action-btn edit-btn">✎</button>
                <button class="action-btn delete-btn">🗑</button>
            </td>
        `;

        tr.querySelector('.edit-btn').onclick = () => openModal(task);
        tr.querySelector('.delete-btn').onclick = () => deleteTask(task._id || task.id); // Handle both _id (mongo) and id

        elements.tableBody.appendChild(tr);
    });
}

// --- MODAL ---
function openModal(task = null, preSelectedProject = null) {
    elements.modalOverlay.classList.add('open');
    if (task) {
        elements.modalTitle.innerText = "Edit Task";
        elements.taskId.value = task._id || task.id;
        elements.inputTitle.value = task.title;
        elements.inputProject.value = task.project;
        elements.inputPriority.value = task.priority;
        elements.inputStatus.value = task.status;

        // Date formatting for input type=date (YYYY-MM-DD)
        if (task.dueDate) {
            const d = new Date(task.dueDate);
            elements.inputDate.value = d.toISOString().split('T')[0];
        }
    } else {
        elements.modalTitle.innerText = "Add New Task";
        elements.taskForm.reset();
        elements.taskId.value = "";
        
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        elements.inputDate.value = tomorrow.toISOString().split('T')[0];
        
        // Pre-select project if provided
        if (preSelectedProject) {
            setTimeout(() => {
                elements.inputProject.value = preSelectedProject.title;
            }, 100);
        }
    }
}

function closeModal() {
    elements.modalOverlay.classList.remove('open');
}

// --- LISTENERS ---
elements.addTaskBtn.onclick = () => openModal();
elements.closeModalBtn.onclick = closeModal;
elements.taskForm.onsubmit = handleFormSubmit;

// Filters
elements.filterStatus.onchange = (e) => { STATE.filters.status = e.target.value; renderTable(); };
elements.filterPriority.onchange = (e) => { STATE.filters.priority = e.target.value; renderTable(); };
elements.filterProject.onchange = (e) => { STATE.filters.project = e.target.value; renderTable(); };
elements.searchInput.oninput = (e) => { STATE.filters.search = e.target.value; renderTable(); };

// Close modal on outside click
elements.modalOverlay.onclick = (e) => {
    if (e.target === elements.modalOverlay) closeModal();
};

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        confirmModal("Log out?", () => {
            localStorage.removeItem('authToken');
            window.location.href = 'signin.html';
        });
    });
}

