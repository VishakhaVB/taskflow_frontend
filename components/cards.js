/**
 * Card Component
 * Reusable card structures for tasks, projects, etc.
 */

class TaskCard {
    constructor(task, options = {}) {
        this.task = task;
        this.options = {
            showProject: true,
            showActions: true,
            onEdit: null,
            onDelete: null,
            onClick: null,
            ...options
        };
    }

    create() {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = this.task._id || this.task.id;

        const priorityClass = `p-${(this.task.priority || 'medium').toLowerCase()}`;
        const statusClass = `status-${(this.task.status || 'todo').toLowerCase().replace(' ', '')}`;

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-title">${this.task.title}</div>
                ${this.options.showActions ? `
                <div class="task-actions">
                    <button class="action-btn" data-action="edit">✏️</button>
                    <button class="action-btn" data-action="delete">🗑️</button>
                </div>
                ` : ''}
            </div>
            ${this.task.description ? `<div class="task-description">${this.task.description}</div>` : ''}
            <div class="task-card-footer">
                <span class="priority-badge ${priorityClass}">${this.task.priority || 'Medium'}</span>
                ${this.options.showProject && this.task.project ? `
                <span class="project-badge">📁 ${this.task.project}</span>
                ` : ''}
                ${this.task.dueDate ? `
                <span class="due-date">📅 ${new Date(this.task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                ` : ''}
            </div>
        `;

        // Event listeners
        if (this.options.onClick) {
            card.onclick = (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    this.options.onClick(this.task);
                }
            };
        }

        if (this.options.showActions) {
            const editBtn = card.querySelector('[data-action="edit"]');
            const deleteBtn = card.querySelector('[data-action="delete"]');

            if (editBtn && this.options.onEdit) {
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.options.onEdit(this.task);
                };
            }

            if (deleteBtn && this.options.onDelete) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.options.onDelete(this.task);
                };
            }
        }

        return card;
    }
}

class ProjectCard {
    constructor(project, options = {}) {
        this.project = project;
        this.options = {
            showTasks: true,
            showActions: true,
            onEdit: null,
            onDelete: null,
            onClick: null,
            ...options
        };
    }

    getProgress() {
        if (!this.project.tasks || this.project.tasks.length === 0) return 0;
        const completed = this.project.tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        return Math.round((completed / this.project.tasks.length) * 100);
    }

    getStatus() {
        const progress = this.getProgress();
        if (progress === 0) return 'Not Started';
        if (progress === 100) return 'Completed';
        return 'In Progress';
    }

    create() {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = this.project._id || this.project.id;

        const progress = this.getProgress();
        const status = this.getStatus();
        const priorityClass = `p-${(this.project.priority || 'medium').toLowerCase()}`;

        card.innerHTML = `
            <div class="project-card-header">
                <div class="project-title">${this.project.title}</div>
                ${this.options.showActions ? `
                <div class="project-actions">
                    <button class="action-btn" data-action="edit">✏️</button>
                    <button class="action-btn" data-action="delete">🗑️</button>
                </div>
                ` : ''}
            </div>
            ${this.project.description ? `<div class="project-description">${this.project.description}</div>` : ''}
            <div class="progress-bar-wrapper">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
            </div>
            <div class="project-card-footer">
                <span class="priority-badge ${priorityClass}">${this.project.priority || 'Medium'}</span>
                <span class="status-badge">${status}</span>
                ${this.project.dueDate ? `
                <span class="due-date">📅 ${new Date(this.project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                ` : ''}
            </div>
        `;

        // Event listeners
        if (this.options.onClick) {
            card.onclick = (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    this.options.onClick(this.project);
                }
            };
        }

        if (this.options.showActions) {
            const editBtn = card.querySelector('[data-action="edit"]');
            const deleteBtn = card.querySelector('[data-action="delete"]');

            if (editBtn && this.options.onEdit) {
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.options.onEdit(this.project);
                };
            }

            if (deleteBtn && this.options.onDelete) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.options.onDelete(this.project);
                };
            }
        }

        return card;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaskCard, ProjectCard };
}
