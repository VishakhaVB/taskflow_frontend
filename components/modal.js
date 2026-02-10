/**
 * Modal Component
 * Reusable modal structure
 */

class Modal {
    constructor(title, content, options = {}) {
        this.title = title;
        this.content = content;
        this.options = {
            showCloseButton: true,
            closeOnOverlayClick: true,
            ...options
        };
        this.overlay = null;
        this.modal = null;
    }

    create() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <div class="modal-title">${this.title}</div>
            ${this.options.showCloseButton ? '<button class="close-btn" data-modal-close>×</button>' : ''}
        `;
        
        // Modal body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof this.content === 'string') {
            body.innerHTML = this.content;
        } else {
            body.appendChild(this.content);
        }
        
        this.modal.appendChild(header);
        this.modal.appendChild(body);
        this.overlay.appendChild(this.modal);
        
        // Event listeners
        if (this.options.showCloseButton) {
            const closeBtn = header.querySelector('[data-modal-close]');
            closeBtn.onclick = () => this.close();
        }
        
        if (this.options.closeOnOverlayClick) {
            this.overlay.onclick = (e) => {
                if (e.target === this.overlay) this.close();
            };
        }
        
        return this.overlay;
    }

    open() {
        if (!this.overlay) {
            this.create();
        }
        document.body.appendChild(this.overlay);
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.overlay.classList.add('open');
        });
    }

    close() {
        if (this.overlay) {
            this.overlay.classList.remove('open');
            setTimeout(() => {
                this.overlay.remove();
            }, 300);
        }
    }

    setContent(content) {
        const body = this.modal.querySelector('.modal-body');
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else {
                body.innerHTML = '';
                body.appendChild(content);
            }
        }
    }

    setTitle(title) {
        const titleEl = this.modal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.innerText = title;
        }
    }
}

// Quick modal functions
function showModal(title, content, options = {}) {
    const modal = new Modal(title, content, options);
    modal.open();
    return modal;
}

function confirmDialog(message, onConfirm, onCancel) {
    const content = `
        <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-main);">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn-secondary" data-cancel>Cancel</button>
            <button class="btn-primary" data-confirm>Confirm</button>
        </div>
    `;
    
    const modal = new Modal('Confirm Action', content, {
        closeOnOverlayClick: false
    });
    modal.open();
    
    setTimeout(() => {
        const confirmBtn = document.querySelector('[data-confirm]');
        const cancelBtn = document.querySelector('[data-cancel]');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                modal.close();
                if (onConfirm) onConfirm();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                modal.close();
                if (onCancel) onCancel();
            };
        }
    }, 100);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal, showModal, confirmDialog };
}
