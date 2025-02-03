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
}

// Make it globally available
window.ErrorManager = ErrorManager;
