/**
 * TaskFlow Calendar Logic
 * Renders a monthly view with tasks as pill indicators
 */

const STATE = {
    user: null,
    tasks: [],
    projects: [],
    currentDate: new Date()
};

const elements = {
    calendarGrid: document.getElementById('calendarGrid'),
    monthDisplay: document.getElementById('monthDisplay'),
    prevBtn: document.getElementById('prevMonth'),
    nextBtn: document.getElementById('nextMonth'),
    todayList: document.getElementById('todayList'),
    upcomingList: document.getElementById('upcomingList'),

    // Modal (Reuse if possible, simplified for now)
    modalOverlay: document.getElementById('modalOverlay'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    taskForm: document.getElementById('taskForm'),
    addTaskBtn: document.getElementById('addTaskBtn'),

    userAvatarName: document.getElementById('userAvatarName'),
    logoutBtn: document.getElementById('logoutBtn')
};

// --- INIT ---
initCalendar();

async function initCalendar() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace('signin.html');
        return;
    }

    try {
        const userRes = await apiRequest('/auth/me', 'GET', null, token);
        if (userRes.success) {
            STATE.user = userRes.data;
            setupUserDropdown(STATE.user);
            if (elements.userAvatarName) {
                elements.userAvatarName.innerText = (STATE.user.name || STATE.user.email).charAt(0).toUpperCase();
            }
        }

        await fetchData(token);
        renderCalendar();
        renderSidePanels();

    } catch (error) {
        console.error("Calendar Init Error:", error);
        if (error.message.includes('Unauthorized')) {
            localStorage.removeItem('authToken');
            window.location.replace('signin.html');
        }
    }
}

async function fetchData(token) {
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
    } catch (error) {
        showToast("Failed to load data", "error");
    }
}

async function fetchTasks(token) {
    await fetchData(token);
}

// --- CALENDAR LOGIC ---

function renderCalendar() {
    elements.calendarGrid.innerHTML = '';

    // Header Row
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerText = day;
        elements.calendarGrid.appendChild(header);
    });

    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth();

    elements.monthDisplay.innerText = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const startDayIndex = firstDay.getDay(); // 0-6
    const totalDays = lastDay.getDate();
    const prevDays = prevLastDay.getDate();

    // Previous Month Filler
    for (let i = startDayIndex; i > 0; i--) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell other-month';
        dayCell.innerHTML = `<div class="day-number">${prevDays - i + 1}</div>`;
        elements.calendarGrid.appendChild(dayCell);
    }

    // Current Month
    const today = new Date();
    for (let i = 1; i <= totalDays; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        // Check today
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }

        dayCell.innerHTML = `<div class="day-number">${i}</div>`;

        // Render Tasks for this day
        const currentParamsDate = new Date(year, month, i).toISOString().split('T')[0];
        const dayTasks = STATE.tasks.filter(t => t.dueDate && t.dueDate.startsWith(currentParamsDate));
        const dayProjects = STATE.projects.filter(p => p.dueDate && p.dueDate.startsWith(currentParamsDate));

        // Add tasks
        dayTasks.slice(0, 2).forEach(task => { // Limit to 2 for space
            const pill = document.createElement('div');

            let priorityClass = 'task-medium';
            if (task.priority === 'High') priorityClass = 'task-high';
            if (task.priority === 'Low') priorityClass = 'task-low';
            if (task.status === 'Completed') priorityClass = 'completed-task';

            pill.className = `cal-task ${priorityClass}`;
            pill.innerText = task.title;
            pill.title = `Task: ${task.title}\nProject: ${task.project || 'None'}\nPriority: ${task.priority}`;
            dayCell.appendChild(pill);
        });
        
        // Add project deadlines
        dayProjects.slice(0, 2).forEach(project => {
            const pill = document.createElement('div');
            pill.className = 'cal-project';
            
            let priorityClass = 'proj-medium';
            if (project.priority === 'High') priorityClass = 'proj-high';
            if (project.priority === 'Low') priorityClass = 'proj-low';
            
            pill.classList.add(priorityClass);
            pill.innerHTML = `📁 ${project.title}`;
            pill.title = `Project Deadline: ${project.title}\nPriority: ${project.priority}`;
            dayCell.appendChild(pill);
        });

        const totalItems = dayTasks.length + dayProjects.length;
        if (totalItems > 4) {
            const more = document.createElement('div');
            more.className = 'more-ind';
            more.innerText = `+${totalItems - 4} more`;
            dayCell.appendChild(more);
        }

        elements.calendarGrid.appendChild(dayCell);
    }

    // Next Month Filler (Just to fill grid 7x6 = 42 usually)
    const remaining = 42 - (startDayIndex + totalDays); // Simplified logic
    // Actually, simple grid might not enforce 6 rows strictly unless CSS does.
    // CSS has `grid-template-rows: auto 1fr 1fr 1fr 1fr 1fr;` (5 rows)
    // Let's just fill the rest of the row
    /* 
       Actually, grid items automatically flow. 
       Let's just ensure we finish the LAST row.
    */
}

function renderSidePanels() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Today List - Tasks and Projects
    const todaysTasks = STATE.tasks.filter(t => t.dueDate && t.dueDate.startsWith(todayStr));
    const todaysProjects = STATE.projects.filter(p => p.dueDate && p.dueDate.startsWith(todayStr));
    
    elements.todayList.innerHTML = '';
    if (todaysTasks.length === 0 && todaysProjects.length === 0) {
        elements.todayList.innerHTML = `<div class="empty-msg">No tasks or deadlines for today!</div>`;
    } else {
        todaysTasks.forEach(task => elements.todayList.appendChild(createMiniTask(task)));
        todaysProjects.forEach(project => elements.todayList.appendChild(createMiniProject(project)));
    }

    // Upcoming (Next 7 days) - Tasks and Projects
    const upcomingTasks = STATE.tasks.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        const diff = (d - today) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 7;
    });
    
    const upcomingProjects = STATE.projects.filter(p => {
        if (!p.dueDate) return false;
        const d = new Date(p.dueDate);
        d.setHours(0, 0, 0, 0);
        const diff = (d - today) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 7;
    });
    
    const upcoming = [...upcomingTasks, ...upcomingProjects].sort((a, b) => 
        new Date(a.dueDate) - new Date(b.dueDate)
    );

    elements.upcomingList.innerHTML = '';
    if (upcoming.length === 0) {
        elements.upcomingList.innerHTML = `<div class="empty-msg">No upcoming deadlines this week.</div>`;
    } else {
        upcoming.forEach(item => {
            if (item.project !== undefined) {
                // It's a task
                elements.upcomingList.appendChild(createMiniTask(item));
            } else {
                // It's a project
                elements.upcomingList.appendChild(createMiniProject(item));
            }
        });
    }
}

function createMiniTask(task) {
    const div = document.createElement('div');
    div.className = 'mini-task-card';

    let priorityClass = 'medium';
    if (task.priority === 'High') priorityClass = 'high';
    if (task.priority === 'Low') priorityClass = 'low';

    div.innerHTML = `
        <div class="mini-task-header">
            <span class="mini-task-type">📝 Task</span>
            <span class="mini-task-priority ${priorityClass}">${task.priority}</span>
        </div>
        <div class="mini-task-title">${task.title}</div>
        <div class="mini-task-meta">${task.project || 'General'} • ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
    `;
    return div;
}

function createMiniProject(project) {
    const div = document.createElement('div');
    div.className = 'mini-task-card project-card';

    let priorityClass = 'medium';
    if (project.priority === 'High') priorityClass = 'high';
    if (project.priority === 'Low') priorityClass = 'low';

    div.innerHTML = `
        <div class="mini-task-header">
            <span class="mini-task-type">📁 Project</span>
            <span class="mini-task-priority ${priorityClass}">${project.priority}</span>
        </div>
        <div class="mini-task-title">${project.title}</div>
        <div class="mini-task-meta">Due: ${new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
    `;
    return div;
}

// --- EVENT LISTENERS ---
elements.prevBtn.onclick = () => {
    STATE.currentDate.setMonth(STATE.currentDate.getMonth() - 1);
    renderCalendar();
};

elements.nextBtn.onclick = () => {
    STATE.currentDate.setMonth(STATE.currentDate.getMonth() + 1);
    renderCalendar();
};

// Add Task Modal Logic (Simplified: Validates and calls API)
if (elements.addTaskBtn) {
    elements.addTaskBtn.onclick = () => {
        elements.modalOverlay.classList.add('open');
    };
    elements.closeModalBtn.onclick = () => {
        elements.modalOverlay.classList.remove('open');
    };
    elements.modalOverlay.onclick = (e) => {
        if (e.target === elements.modalOverlay) elements.modalOverlay.classList.remove('open');
    };

    elements.taskForm.onsubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('authToken');
        showLoading(elements.taskForm.querySelector('button[type="submit"]'));

        const taskData = {
            title: document.getElementById('inputTitle').value,
            status: document.getElementById('inputStatus').value,
            priority: document.getElementById('inputPriority').value,
            dueDate: document.getElementById('inputDate').value,
        };

        try {
            const res = await apiRequest('/tasks', 'POST', taskData, token);
            if (res.success) {
                showToast("Task allocated to calendar", "success");
                elements.modalOverlay.classList.remove('open');
                elements.taskForm.reset();
                await fetchTasks(token); // Reload
                renderCalendar();
                renderSidePanels();
            } else {
                showToast("Failed to create task", "error");
            }
        } catch (error) {
            showToast("Error creating task", "error");
        } finally {
            hideLoading(elements.taskForm.querySelector('button[type="submit"]'));
        }
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
