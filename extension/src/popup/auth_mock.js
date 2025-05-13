/**
 * Auth Mock Implementation
 * 
 * This module provides a mock implementation of the AuthManager class
 * for testing and development purposes.
 */

/**
 * Initializes a mock AuthManager implementation in the window object
 */
function initializeAuthMock(options = {}) {
    // Default options
    const defaultOptions = {
        simulateAuthError: false,
        simulateFirebaseError: false,
        simulateNetworkError: false
    };
    
    // Merge provided options with defaults
    const mockOptions = { ...defaultOptions, ...options };
    
    console.log("Initializing Auth Mock with options:", mockOptions);
    console.log("Initializing Auth Mock...");
    
    // Create mock AuthManager class if it doesn't exist
    if (typeof AuthManager === 'undefined') {
        console.log("Creating mock AuthManager class");
        window.AuthManager = class AuthManager {
            /**
             * Creates a new mock AuthManager instance
             */
            constructor() {
                console.log("Mock AuthManager created");
                
                // Use options to simulate different error conditions
                this.gmcAuthenticated = !mockOptions.simulateAuthError;
                this.firebaseAuthenticated = !mockOptions.simulateFirebaseError;
                this.isProUser = true; // Can be changed for testing pro/free features
                this.gmcMerchantId = mockOptions.simulateAuthError ? null : 'MOCK-123456';
                this.firebaseUserId = mockOptions.simulateFirebaseError ? null : 'mock-user-id';
                this.simulateNetworkError = mockOptions.simulateNetworkError;
            }
            
            /**
             * Initializes the auth manager
             * @returns {Promise<boolean>} A promise that resolves to true
             */
            init() {
                try {
                    console.log("Mock AuthManager: init called");
                    
                    if (this.simulateNetworkError) {
                        console.error("Mock AuthManager: Simulating network error");
                        return Promise.reject(new Error("Network error: Unable to connect to authentication server"));
                    }
                    
                    if (!this.gmcAuthenticated) {
                        console.error("Mock AuthManager: Simulating GMC authentication error");
                        return Promise.reject(new Error("Authentication error: Unable to authenticate with Google Merchant Center"));
                    }
                    
                    if (!this.firebaseAuthenticated) {
                        console.error("Mock AuthManager: Simulating Firebase authentication error");
                        return Promise.reject(new Error("Authentication error: Unable to authenticate with Firebase"));
                    }
                    
                    return Promise.resolve(true);
                } catch (error) {
                    console.error("Mock AuthManager: init error", error);
                    return Promise.reject(error);
                }
            }
            
            /**
             * Returns the current authentication state
             * @returns {Object} The authentication state
             */
            getAuthState() {
                try {
                    return {
                        gmcAuthenticated: this.gmcAuthenticated,
                        firebaseAuthenticated: this.firebaseAuthenticated,
                        isProUser: this.isProUser,
                        gmcMerchantId: this.gmcMerchantId,
                        firebaseUserId: this.firebaseUserId
                    };
                } catch (error) {
                    console.error("Mock AuthManager: getAuthState error", error);
                    return {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: null,
                        firebaseUserId: null
                    };
                }
            }
            
            /**
             * Simulates signing in with Firebase
             * @returns {Promise<Object>} A promise that resolves to a success object
             */
            signInWithFirebase() {
                try {
                    console.log("Mock AuthManager: signInWithFirebase called");
                    this.firebaseAuthenticated = true;
                    return Promise.resolve({ success: true });
                } catch (error) {
                    console.error("Mock AuthManager: signInWithFirebase error", error);
                    return Promise.reject(error);
                }
            }
            
            /**
             * Simulates signing out from Firebase
             * @returns {Promise<Object>} A promise that resolves to a success object
             */
            signOutFirebase() {
                try {
                    console.log("Mock AuthManager: signOutFirebase called");
                    this.firebaseAuthenticated = false;
                    return Promise.resolve({ success: true });
                } catch (error) {
                    console.error("Mock AuthManager: signOutFirebase error", error);
                    return Promise.reject(error);
                }
            }
            
            /**
             * Checks if the user has Pro status
             * @returns {Promise<boolean>} A promise that resolves to the Pro status
             */
            checkProStatus() { 
                try {
                    console.log("Mock AuthManager: checkProStatus called");
                    return Promise.resolve(this.isProUser); 
                } catch (error) {
                    console.error("Mock AuthManager: checkProStatus error", error);
                    return Promise.reject(error);
                }
            }
        };
    }
}

// Make function available globally
window.initializeAuthMock = initializeAuthMock;

// Add helper functions to simulate different error conditions
window.simulateAuthError = function() {
    initializeAuthMock({ simulateAuthError: true });
};

window.simulateFirebaseError = function() {
    initializeAuthMock({ simulateFirebaseError: true });
};

window.simulateNetworkError = function() {
    initializeAuthMock({ simulateNetworkError: true });
};

// Reset to normal behavior
window.resetAuthMock = function() {
    initializeAuthMock();
};