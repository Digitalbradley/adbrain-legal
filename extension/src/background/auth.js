class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.token = null;
    }

    async initialize() {
        // Check for existing token
        try {
            const token = await chrome.storage.local.get('auth_token');
            if (token) {
                this.token = token;
                this.isAuthenticated = true;
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
        }
    }

    async authenticate() {
        try {
            const token = await this.getAuthToken();
            if (token) {
                this.token = token;
                this.isAuthenticated = true;
                await chrome.storage.local.set({ 'auth_token': token });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async getAuthToken() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(token);
            });
        });
    }
}

// Export for use in other files
window.AuthManager = AuthManager; 