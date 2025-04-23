/**
 * Auth Mock Implementation
 * 
 * This module provides a mock implementation of the AuthManager class
 * for testing and development purposes.
 */

/**
 * Initializes a mock AuthManager implementation in the window object
 */
function initializeAuthMock() {
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
                this.gmcAuthenticated = true;
                this.firebaseAuthenticated = true;
                this.isProUser = true;
                this.gmcMerchantId = 'MOCK-123456';
                this.firebaseUserId = 'mock-user-id';
            }
            
            /**
             * Initializes the auth manager
             * @returns {Promise<boolean>} A promise that resolves to true
             */
            init() { 
                try {
                    console.log("Mock AuthManager: init called");
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