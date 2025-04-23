/**
 * Popup Initialization Script
 *
 * This script initializes the configuration and ensures all dependencies are loaded
 * before the PopupManager is instantiated.
 */

// Global initialization flag to prevent duplicate initialization
window.isConfigInitialized = false;

/**
 * Initialize the application
 * This function is called before PopupManager is instantiated
 */
function initializeApplication() {
    console.log("Initializing application...");
    
    // Initialize configuration if not already initialized
    if (!window.isConfigInitialized && typeof initializeConfig === 'function') {
        console.log("Initializing configuration...");
        try {
            initializeConfig();
            window.isConfigInitialized = true;
        } catch (error) {
            console.error("Error initializing configuration:", error);
        }
    } else if (window.isConfigInitialized) {
        console.log("Configuration already initialized, skipping.");
    } else {
        console.error("Configuration module not loaded. Some features may not work correctly.");
    }
    
    // Initialize mock implementations if needed
    initializeMockImplementations();
    
    console.log("Application initialization complete.");
}

/**
 * Initialize mock implementations if needed
 */
function initializeMockImplementations() {
    console.log("Checking for mock implementations...");
    
    // Only initialize mocks if feature flags indicate they should be used
    const useFeatureFlags = typeof window.FEATURES !== 'undefined';
    
    // Initialize Firebase mock if needed
    if ((useFeatureFlags && window.FEATURES.USE_MOCK_FIREBASE) || !useFeatureFlags) {
        if (typeof firebase === 'undefined' && typeof initializeFirebaseMock === 'function') {
            console.log("Initializing Firebase mock implementation...");
            try {
                initializeFirebaseMock();
            } catch (error) {
                console.error("Error initializing Firebase mock:", error);
            }
        }
    }
    
    // Initialize GMC mock implementations if needed
    if ((useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API) || !useFeatureFlags) {
        if ((typeof GMCApi === 'undefined' || typeof GMCValidator === 'undefined') &&
            typeof initializeGMCMock === 'function') {
            console.log("Initializing GMC mock implementations...");
            try {
                initializeGMCMock();
            } catch (error) {
                console.error("Error initializing GMC mock:", error);
            }
        }
    }
    
    // Initialize Auth mock implementation if needed
    if ((useFeatureFlags && window.FEATURES.USE_MOCK_AUTH) || !useFeatureFlags) {
        if (typeof AuthManager === 'undefined' && typeof initializeAuthMock === 'function') {
            console.log("Initializing Auth mock implementation...");
            try {
                initializeAuthMock();
            } catch (error) {
                console.error("Error initializing Auth mock:", error);
            }
        }
    }
    
    // Initialize UI-related mock implementations if needed
    if ((useFeatureFlags && window.FEATURES.USE_MOCK_UI_MANAGERS) || !useFeatureFlags) {
        if ((typeof StatusBarManager === 'undefined' ||
            typeof SearchManager === 'undefined' ||
            typeof ValidationUIManager === 'undefined' ||
            typeof FeedManager === 'undefined' ||
            typeof BulkActionsManager === 'undefined') &&
            typeof initializeUIMocks === 'function') {
            console.log("Initializing UI mock implementations...");
            try {
                initializeUIMocks();
            } catch (error) {
                console.error("Error initializing UI mocks:", error);
            }
        }
    }
}

// Make functions available globally
window.initializeApplication = initializeApplication;

// Call initialization function when the script loads
initializeApplication();