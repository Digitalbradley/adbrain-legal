// src/background/background.js

console.log("Background script started.");

// We can't use importScripts with ES modules, so we'll create mock classes
// for the functionality we need

// Mock GMCApi class
class GMCApi {
    constructor() {
        console.log('Mock GMCApi created');
        this.isAuthenticated = false;
    }

    async authenticate() {
        console.log('Mock GMCApi: authenticate called');
        return { success: true, message: 'Mock authentication successful' };
    }

    logout() {
        console.log('Mock GMCApi: logout called');
        this.isAuthenticated = false;
    }

    getAuthState() {
        return { isAuthenticated: this.isAuthenticated };
    }
}

// Mock AuthManager class
class AuthManager {
    constructor(config) {
        console.log('Mock AuthManager created');
        this.gmcApi = config?.gmcApi;
        this.firebaseUser = null;
        this.gmcAuthenticated = this.gmcApi?.isAuthenticated || false;
        this.firebaseAuthenticated = false;
        this.isProUser = false;
    }

    async init() {
        console.log('Mock AuthManager: init called');
        return true;
    }

    getAuthState() {
        return {
            gmcAuthenticated: this.gmcAuthenticated,
            firebaseAuthenticated: this.firebaseAuthenticated,
            isProUser: this.isProUser,
            gmcMerchantId: null,
            firebaseUserId: this.firebaseUser?.uid || null
        };
    }

    async signInWithFirebase() {
        console.log('Mock AuthManager: signInWithFirebase called');
        this.firebaseAuthenticated = true;
        this.firebaseUser = { uid: 'mock-user-id' };
        return { success: true };
    }

    async signOutFirebase() {
        console.log('Mock AuthManager: signOutFirebase called');
        this.firebaseAuthenticated = false;
        this.firebaseUser = null;
        return { success: true };
    }

    async checkProStatus() {
        console.log('Mock AuthManager: checkProStatus called');
        this.isProUser = false; // Always false in mock
        return false;
    }
}

// Function to initialize the mock classes
function loadDependencies() {
    try {
        console.log('Creating mock classes for GMCApi and AuthManager');
        // Initialize app and managers after scripts are loaded
        initializeAppAndManagers();
        return true;
    } catch (error) {
        console.error('Error initializing mock classes:', error);
        return false;
    }
}

// --- Firebase Configuration (Commented out) ---
const firebaseConfig = {
  apiKey: "AIzaSyCjlVEut1di_i6SH9NFaqwG5ZjNBqK4wFc",
  authDomain: "adbrain-chrome-extension.firebaseapp.com",
  projectId: "adbrain-chrome-extension",
  storageBucket: "adbrain-chrome-extension.appspot.com",
  messagingSenderId: "623746138442",
  appId: "1:623746138442:web:a57f92b378a147dbd501b3",
  measurementId: "G-M035DCR63G"
};

// --- Global Variables ---
let gmcApiInstance = null;
let authManagerInstance = null;
let firebaseInitialized = false;

// --- Initialization Function ---
async function initializeAppAndManagers() {
    // Check if Firebase is already initialized
    if (!firebaseInitialized) {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.log('Firebase is not defined. Skipping Firebase initialization.');
                // Continue without Firebase for now
            } else {
                // Initialize Firebase app
                firebase.initializeApp(firebaseConfig);
                firebaseInitialized = true;
                console.log('Firebase app initialized.');
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Continue without Firebase for now
        }
    }

    try {
        // Check if GMCApi is available
        if (typeof GMCApi === 'undefined') {
            console.error('GMCApi is not defined. Cannot initialize managers.');
            return;
        }
        
        // Initialize GMCApi first
        gmcApiInstance = new GMCApi();
        console.log('GMCApi initialized.');
        
        // Check if AuthManager is available
        if (typeof AuthManager === 'undefined') {
            console.error('AuthManager is not defined. Cannot initialize authentication.');
            return;
        }
        
        // Initialize AuthManager with GMCApi
        authManagerInstance = new AuthManager({
            gmcApi: gmcApiInstance
        });
        
        // Initialize AuthManager if init method exists
        if (typeof authManagerInstance.init === 'function') {
            await authManagerInstance.init();
            console.log('AuthManager initialized.');
        } else {
            console.warn('AuthManager.init method not found. Skipping initialization.');
        }

        console.log('GMCApi and AuthManager setup complete.');
    } catch (error) {
        console.error('Error initializing managers:', error);
    }
}

// --- Event Listeners ---

// Call initialization function when extension is loaded
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    // Dependencies are already loaded at this point
});

// Message handler for communication with popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received message:", request);
    
    // Handle different message types
    if (request.action === 'getAuthState') {
        try {
            const authState = authManagerInstance && typeof authManagerInstance.getAuthState === 'function'
                ? authManagerInstance.getAuthState()
                : { gmcAuthenticated: false, firebaseAuthenticated: false };
            sendResponse({ success: true, authState });
        } catch (error) {
            console.error('Error getting auth state:', error);
            sendResponse({
                success: true,
                authState: { gmcAuthenticated: false, firebaseAuthenticated: false, error: error.message }
            });
        }
    }
    else if (request.action === 'authenticateGmc') {
        if (gmcApiInstance && typeof gmcApiInstance.authenticate === 'function') {
            try {
                gmcApiInstance.authenticate()
                    .then(result => {
                        sendResponse({ success: true, result });
                    })
                    .catch(error => {
                        console.error('GMC authentication error:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Indicates async response
            } catch (error) {
                console.error('Error calling authenticate:', error);
                sendResponse({ success: false, error: 'Error initiating authentication: ' + error.message });
            }
        } else {
            console.error('GMC API not initialized or authenticate method not available');
            sendResponse({ success: false, error: 'GMC API not initialized or authenticate method not available' });
        }
    }
    else if (request.action === 'logoutGmc') {
        if (gmcApiInstance && typeof gmcApiInstance.logout === 'function') {
            try {
                gmcApiInstance.logout();
                sendResponse({ success: true });
            } catch (error) {
                console.error('Error during GMC logout:', error);
                sendResponse({ success: false, error: 'Error during logout: ' + error.message });
            }
        } else {
            console.error('GMC API not initialized or logout method not available');
            sendResponse({ success: false, error: 'GMC API not initialized or logout method not available' });
        }
    }
    else if (request.action === 'signInWithFirebase') {
        if (authManagerInstance && typeof authManagerInstance.signInWithFirebase === 'function') {
            try {
                authManagerInstance.signInWithFirebase()
                    .then(result => {
                        sendResponse({ success: true, result });
                    })
                    .catch(error => {
                        console.error('Firebase sign-in error:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Indicates async response
            } catch (error) {
                console.error('Error initiating Firebase sign-in:', error);
                sendResponse({ success: false, error: 'Error initiating Firebase sign-in: ' + error.message });
            }
        } else {
            console.error('AuthManager not initialized or signInWithFirebase method not available');
            sendResponse({ success: false, error: 'AuthManager not initialized or signInWithFirebase method not available' });
        }
    }
    else if (request.action === 'signOutFirebase') {
        if (authManagerInstance && typeof authManagerInstance.signOutFirebase === 'function') {
            try {
                authManagerInstance.signOutFirebase()
                    .then(() => {
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        console.error('Firebase sign-out error:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Indicates async response
            } catch (error) {
                console.error('Error initiating Firebase sign-out:', error);
                sendResponse({ success: false, error: 'Error initiating Firebase sign-out: ' + error.message });
            }
        } else {
            console.error('AuthManager not initialized or signOutFirebase method not available');
            sendResponse({ success: false, error: 'AuthManager not initialized or signOutFirebase method not available' });
        }
    }
    else {
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    // Return false for synchronous responses, true was returned above for async ones
    return false;
});
// Initialize when the service worker starts
const dependenciesLoaded = loadDependencies();
if (dependenciesLoaded) {
    console.log("Dependencies loaded and initialization complete");
} else {
    console.error("Failed to load dependencies");
}

console.log("Background script loaded and listeners attached.");
