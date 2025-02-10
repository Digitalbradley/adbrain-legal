class LoadingManager {
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay';
        
        this.content = document.createElement('div');
        this.content.className = 'loading-content';
        
        this.spinner = document.createElement('div');
        this.spinner.className = 'loading-spinner';
        
        this.text = document.createElement('div');
        this.text.className = 'loading-text';
        
        this.content.appendChild(this.spinner);
        this.content.appendChild(this.text);
        this.overlay.appendChild(this.content);
        
        document.body.appendChild(this.overlay);
    }

    showLoading(message = 'Loading...') {
        this.text.textContent = message;
        this.overlay.style.display = 'flex';
    }

    updateLoadingText(message) {
        this.text.textContent = message;
    }

    hideLoading() {
        this.overlay.style.display = 'none';
    }
}

window.LoadingManager = LoadingManager;
