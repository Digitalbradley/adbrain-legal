class ErrorManager {
    constructor() {
        this.errorContainer = null;
        this.setupErrorContainer();
    }

    setupErrorContainer() {
        this.errorContainer = document.createElement('div');
        this.errorContainer.className = 'error-container';
        document.body.appendChild(this.errorContainer);
    }

    showError(message, duration = 5000) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        this.errorContainer.appendChild(errorElement);
        
        setTimeout(() => {
            errorElement.classList.add('fade-out');
            setTimeout(() => {
                if (errorElement.parentNode === this.errorContainer) {
                    this.errorContainer.removeChild(errorElement);
                }
            }, 300);
        }, duration);
    }

    removeError(errorElement) {
        errorElement.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (errorElement.parentNode === this.errorContainer) {
                this.errorContainer.removeChild(errorElement);
            }
        }, 300);
    }

    clearErrors() {
        while (this.errorContainer.firstChild) {
            this.errorContainer.removeChild(this.errorContainer.firstChild);
        }
    }

    showValidationError(field, message) {
        const element = document.querySelector(`.${field}-field`);
        if (element) {
            element.classList.add('validation-error');
            element.setAttribute('title', message);
            this.showError(message);
        }
    }

    showSuccess(message, duration = 3000) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: #28a745;
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        alert.textContent = message;
        document.body.appendChild(alert);
        
        // Fade in
        setTimeout(() => alert.style.opacity = '1', 10);
        
        // Remove after duration
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, duration);
    }
}

// Make it globally available
window.ErrorManager = ErrorManager;
