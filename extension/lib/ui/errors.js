class ErrorManager {
    constructor() {
        this.errorContainer = null;
        this.setupErrorContainer();
    }

    setupErrorContainer() {
        console.log('[DEBUG] Setting up error container');
        
        // Remove any existing error container
        const existingContainer = document.querySelector('.error-container');
        if (existingContainer) {
            console.log('[DEBUG] Removing existing error container');
            existingContainer.remove();
        }
        
        this.errorContainer = document.createElement('div');
        this.errorContainer.className = 'error-container';
        
        // Add inline styles to ensure visibility
        this.errorContainer.style.position = 'fixed';
        this.errorContainer.style.top = '20px';
        this.errorContainer.style.left = '50%';
        this.errorContainer.style.transform = 'translateX(-50%)';
        this.errorContainer.style.zIndex = '9999';
        this.errorContainer.style.width = '80%';
        this.errorContainer.style.maxWidth = '600px';
        this.errorContainer.style.display = 'flex';
        this.errorContainer.style.flexDirection = 'column';
        this.errorContainer.style.gap = '10px';
        
        document.body.appendChild(this.errorContainer);
        console.log('[DEBUG] Error container created and appended to body');
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

    showWarning(message, duration = 5000) {
        console.log('[DEBUG] showWarning called with message:', message);
        
        // Ensure error container exists
        if (!this.errorContainer || !document.body.contains(this.errorContainer)) {
            console.log('[DEBUG] Error container not found, recreating it');
            this.setupErrorContainer();
        }
        
        const warningElement = document.createElement('div');
        warningElement.className = 'warning-message';
        warningElement.textContent = message;
        
        // Style directly on the element to ensure visibility
        warningElement.style.padding = '15px 20px';
        warningElement.style.borderRadius = '8px';
        warningElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        warningElement.style.marginBottom = '10px';
        warningElement.style.opacity = '1';
        warningElement.style.transition = 'opacity 0.3s, transform 0.3s';
        warningElement.style.position = 'relative';
        warningElement.style.overflow = 'hidden';
        warningElement.style.whiteSpace = 'pre-line';
        warningElement.style.backgroundColor = '#fff3cd';
        warningElement.style.color = '#856404';
        warningElement.style.borderLeft = '5px solid #ffc107';
        
        console.log('[DEBUG] Warning element created with styles');
        
        this.errorContainer.appendChild(warningElement);
        console.log('[DEBUG] Warning element appended to error container');
        
        // Add a close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '15px';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.opacity = '0.7';
        
        closeButton.addEventListener('click', () => {
            warningElement.classList.add('fade-out');
            setTimeout(() => {
                if (warningElement.parentNode === this.errorContainer) {
                    this.errorContainer.removeChild(warningElement);
                }
            }, 300);
        });
        
        warningElement.appendChild(closeButton);
        
        // Force the warning to be visible by adding it to the DOM in multiple ways
        document.body.appendChild(warningElement.cloneNode(true));
        
        setTimeout(() => {
            console.log('[DEBUG] Setting timeout to remove warning after', duration, 'ms');
            warningElement.classList.add('fade-out');
            setTimeout(() => {
                console.log('[DEBUG] Removing warning element');
                if (warningElement.parentNode === this.errorContainer) {
                    this.errorContainer.removeChild(warningElement);
                }
            }, 300);
        }, duration);
    }
}

// Make it globally available
window.ErrorManager = ErrorManager;
