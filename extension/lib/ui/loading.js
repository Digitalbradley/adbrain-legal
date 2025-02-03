class LoadingManager {
    constructor() {
        this.loadingOverlay = null;
        this.loadingMessage = null;
    }

    showLoading(message = 'Loading...') {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'loading-overlay';
            
            this.loadingMessage = document.createElement('div');
            this.loadingMessage.className = 'loading-message';
            this.loadingOverlay.appendChild(this.loadingMessage);
        }
        
        this.loadingMessage.textContent = message;
        document.body.appendChild(this.loadingOverlay);
    }

    updateLoading(message) {
        if (this.loadingMessage) {
            this.loadingMessage.textContent = message;
        }
    }

    hideLoading() {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
    }
}

// Make it globally available
window.LoadingManager = LoadingManager;
