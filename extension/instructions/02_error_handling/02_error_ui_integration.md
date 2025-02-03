# Error UI Integration Implementation

## Overview
This module implements the user interface components for displaying errors, warnings, and resolution steps to users.

## Implementation Steps

### 1. Error UI Component Class
class ErrorUIManager {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.container = document.getElementById('error-container');
        this.errorList = document.getElementById('error-list');
        this.statsContainer = document.getElementById('error-stats');
        
        // Subscribe to error updates
        this.unsubscribe = this.errorHandler.subscribe(error => {
            this.handleErrorUpdate(error);
        });

        // Initialize UI
        this.initializeUI();
    }

    initializeUI() {
        this.renderErrorContainer();
        this.updateErrorStats();
        this.setupEventListeners();
    }

    renderErrorContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'error-container';
            document.body.appendChild(this.container);
        }
    }
}


### 2. Error Display Methods
class ErrorUIManager {
    createErrorElement(error) {
        const errorElement = document.createElement('div');
        errorElement.className = `error-item ${error.level} ${error.resolved ? 'resolved' : ''}`;
        errorElement.id = `error-${error.id}`;
        
        errorElement.innerHTML = `
            <div class="error-header">
                <span class="error-type">${error.type}</span>
                <span class="error-timestamp">${this.formatTimestamp(error.timestamp)}</span>
            </div>
            <div class="error-message">${error.message}</div>
            <div class="error-resolution">
                <h4>Resolution Steps:</h4>
                <ol>
                    ${error.resolutionSteps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            <div class="error-actions">
                <button class="resolve-btn" ${error.resolved ? 'disabled' : ''}>
                    ${error.resolved ? 'Resolved' : 'Mark as Resolved'}
                </button>
                <button class="details-btn">Toggle Details</button>
            </div>
        `;

        return errorElement;
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    updateErrorStats() {
        const stats = this.errorHandler.getErrorStats();
        this.statsContainer.innerHTML = `
            <div class="error-stats">
                <div class="stat-item">
                    <span class="stat-label">Active Errors:</span>
                    <span class="stat-value">${stats.active}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Errors:</span>
                    <span class="stat-value">${stats.total}</span>
                </div>
            </div>
        `;
    }
}



### 3. Event **Handlers**
class ErrorUIManager {
    setupEventListeners() {
        this.container.addEventListener('click', (event) => {
            const target = event.target;
            
            if (target.classList.contains('resolve-btn')) {
                const errorId = this.getErrorIdFromElement(target);
                this.handleResolveClick(errorId);
            }
            
            if (target.classList.contains('details-btn')) {
                const errorElement = target.closest('.error-item');
                this.toggleErrorDetails(errorElement);
            }
        });
    }

    handleResolveClick(errorId) {
        this.errorHandler.resolveError(errorId);
        const errorElement = document.getElementById(`error-${errorId}`);
        if (errorElement) {
            errorElement.classList.add('resolved');
            const resolveBtn = errorElement.querySelector('.resolve-btn');
            resolveBtn.textContent = 'Resolved';
            resolveBtn.disabled = true;
        }
    }

    toggleErrorDetails(errorElement) {
        errorElement.classList.toggle('show-details');
    }

    getErrorIdFromElement(element) {
        const errorElement = element.closest('.error-item');
        return errorElement.id.replace('error-', '');
    }
}


### 4. Error Update Handler
class ErrorUIManager {
    handleErrorUpdate(error) {
        if (error.type === 'clear_resolved') {
            this.removeResolvedErrors();
            return;
        }

        const existingError = document.getElementById(`error-${error.id}`);
        if (existingError) {
            existingError.replaceWith(this.createErrorElement(error));
        } else {
            this.errorList.appendChild(this.createErrorElement(error));
        }

        this.updateErrorStats();
        this.animateNewError(error.id);
    }

    removeResolvedErrors() {
        const resolvedErrors = this.errorList.querySelectorAll('.error-item.resolved');
        resolvedErrors.forEach(element => {
            element.addEventListener('animationend', () => {
                element.remove();
            });
            element.classList.add('fade-out');
        });
    }

    animateNewError(errorId) {
        const errorElement = document.getElementById(`error-${errorId}`);
        if (errorElement) {
            errorElement.classList.add('fade-in');
            errorElement.addEventListener('animationend', () => {
                errorElement.classList.remove('fade-in');
            });
        }
    }
}


### 5. Usage Example
// Initialize Error UI
const errorHandler = new ErrorHandler();
const errorUI = new ErrorUIManager(errorHandler);

// Add test error
errorHandler.addError(
    errorHandler.errorTypes.VALIDATION,
    'Invalid product price format',
    errorHandler.errorLevels.WARNING,
    { 
        subType: 'invalidFormat',
        field: 'price',
        value: 'abc123'
    }
);

// Clean up on page unload
window.addEventListener('unload', () => {
    errorUI.unsubscribe();
});


## Required CSS
.error-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.error-item {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.error-item.critical {
    border-left: 4px solid #dc3545;
}

.error-item.warning {
    border-left: 4px solid #ffc107;
}

.error-item.info {
    border-left: 4px solid #17a2b8;
}

.error-item.resolved {
    opacity: 0.7;
    background: #f8f9fa;
}

.error-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.error-type {
    font-weight: bold;
    text-transform: uppercase;
}

.error-resolution {
    display: none;
    margin-top: 1rem;
}

.error-item.show-details .error-resolution {
    display: block;
}

.error-actions {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
}

/* Animations */
.fade-in {
    animation: fadeIn 0.3s ease-in;
}

.fade-out {
    animation: fadeOut 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
}


