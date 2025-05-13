/**
 * Status Manager Module
 *
 * Responsible for updating the dedicated "Feed Status" UI area.
 * Provides methods for displaying different types of status messages (info, warning, error, success).
 */
class StatusManager {
    /**
     * @param {object} options - Configuration options
     * @param {string} options.statusContentId - ID of the DOM element to use for status messages (default: 'feedStatusContent')
     */
    constructor(options = {}) {
        this.statusContentId = options.statusContentId || 'feedStatusContent';
        this.statusContent = null;
        
        // Initialize the status content element
        this.initStatusContent();
        
        console.log('[StatusManager] Initialized');
    }

    /**
     * Initializes or refreshes the status content element reference
     * @returns {HTMLElement|null} - The status content element or null if not found
     */
    initStatusContent() {
        this.statusContent = document.getElementById(this.statusContentId);
        console.log('[DEBUG] Status content element initialized:', this.statusContent);
        
        // If not found, try again after a short delay to ensure DOM is fully loaded
        if (!this.statusContent) {
            setTimeout(() => {
                this.statusContent = document.getElementById(this.statusContentId);
                console.log('[DEBUG] Status content element after delay:', this.statusContent);
            }, 500);
        }
        
        return this.statusContent;
    }

    /**
     * Updates the status area with a new message
     * @param {string} message - The message to display
     * @param {string} type - The type of message ('info', 'warning', 'error', 'success', or 'clear')
     */
    updateStatus(message, type = 'info') {
        if (!this.statusContent) {
            console.error('[DEBUG] Status content element not found');
            this.initStatusContent();
            if (!this.statusContent) {
                console.error('[DEBUG] Status content element still not found after initialization');
                return;
            }
        }
        
        console.log('[DEBUG] Updating status:', message, type);
        
        // Clear existing content
        if (type === 'clear') {
            this.statusContent.innerHTML = '';
            return;
        }
        
        // Create status message element
        const statusElement = document.createElement('div');
        
        // Set class based on type
        switch (type) {
            case 'warning':
                statusElement.className = 'status-warning';
                break;
            case 'error':
                statusElement.className = 'status-error';
                break;
            case 'success':
                statusElement.className = 'status-success';
                break;
            default:
                statusElement.className = 'status-message';
        }
        
        statusElement.textContent = message;
        
        // Add to status content
        this.statusContent.appendChild(statusElement);
    }

    /**
     * Clears all status messages
     */
    clearStatus() {
        this.updateStatus('clear', 'clear');
    }

    /**
     * Adds an info message to the status area
     * @param {string} message - The message to display
     */
    addInfo(message) {
        this.updateStatus(message, 'info');
    }

    /**
     * Adds a warning message to the status area
     * @param {string} message - The message to display
     */
    addWarning(message) {
        this.updateStatus(message, 'warning');
    }

    /**
     * Adds an error message to the status area
     * @param {string} message - The message to display
     */
    addError(message) {
        this.updateStatus(message, 'error');
    }

    /**
     * Adds a success message to the status area
     * @param {string} message - The message to display
     */
    addSuccess(message) {
        this.updateStatus(message, 'success');
    }
}

// Make globally available
window.StatusManager = StatusManager;