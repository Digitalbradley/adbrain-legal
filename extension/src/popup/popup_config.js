/**
 * Popup Configuration
 * 
 * This module provides configuration settings and feature flags for the popup UI.
 * It allows for easy toggling of features and mock implementations.
 */

/**
 * Feature flags for controlling functionality
 * @type {Object}
 */
const FEATURES = {
    // Mock implementations
    USE_MOCK_FIREBASE: true,
    USE_MOCK_GMC_API: true,
    USE_MOCK_AUTH: true,
    USE_MOCK_UI_MANAGERS: true,
    
    // UI features
    USE_SIMPLIFIED_UI: false,
    ENABLE_VALIDATION_HISTORY: true,
    ENABLE_BULK_ACTIONS: true,
    ENABLE_CUSTOM_RULES: true,
    
    // Pro features (these would normally be controlled by subscription status)
    SIMULATE_PRO_USER: true,
    
    // Debugging
    VERBOSE_LOGGING: true,
    SHOW_MOCK_INDICATORS: true
};

/**
 * Environment configuration
 * @type {Object}
 */
const ENV_CONFIG = {
    // Firebase configuration (mock values)
    FIREBASE_CONFIG: {
        apiKey: "mock-api-key",
        authDomain: "mock-auth-domain.firebaseapp.com",
        projectId: "mock-project-id",
        storageBucket: "mock-storage-bucket.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef1234567890"
    },
    
    // API endpoints
    GMC_API_ENDPOINT: "https://merchants.googleapis.com/v1beta",
    
    // Validation settings
    VALIDATION_HISTORY_LIMIT: 25,
    MAX_ISSUES_PER_VALIDATION: 200,
    
    // UI settings
    DEFAULT_PAGE_SIZE: 100,
    DEBOUNCE_DELAY: 300 // ms
};

/**
 * Initializes the configuration and applies feature flags
 */
function initializeConfig() {
    console.log("Initializing popup configuration...");
    
    // Make configuration available globally
    window.FEATURES = FEATURES;
    window.ENV_CONFIG = ENV_CONFIG;
    
    // Apply feature flags to the UI
    applyFeatureFlags();
    
    // Initialize mocks based on feature flags
    initializeMocks();
    
    console.log("Popup configuration initialized.");
}

/**
 * Applies feature flags to the UI by showing/hiding elements
 */
function applyFeatureFlags() {
    console.log("Applying feature flags to UI...");
    
    // Show/hide Pro features based on SIMULATE_PRO_USER flag
    const proFeatures = document.querySelectorAll('.pro-feature-section');
    const proFeatureBadges = document.querySelectorAll('.pro-feature-badge');
    const upgradePrompts = document.querySelectorAll('.feature-upgrade-prompt');
    
    if (FEATURES.SIMULATE_PRO_USER) {
        // Show Pro features and hide upgrade prompts
        proFeatures.forEach(element => element.classList.remove('pro-disabled'));
        proFeatureBadges.forEach(badge => badge.style.display = 'none');
        upgradePrompts.forEach(prompt => prompt.style.display = 'none');
    } else {
        // Hide Pro features and show upgrade prompts
        proFeatures.forEach(element => element.classList.add('pro-disabled'));
        proFeatureBadges.forEach(badge => badge.style.display = 'inline-block');
        upgradePrompts.forEach(prompt => prompt.style.display = 'block');
    }
    
    // Show/hide validation history tab based on ENABLE_VALIDATION_HISTORY flag
    const validationTab = document.querySelector('.tab-button[data-tab="validation"]');
    if (validationTab) {
        validationTab.style.display = FEATURES.ENABLE_VALIDATION_HISTORY ? 'block' : 'none';
    }
    
    // Show/hide bulk actions section based on ENABLE_BULK_ACTIONS flag
    const bulkActionsSection = document.getElementById('bulkActionsSection');
    if (bulkActionsSection) {
        bulkActionsSection.style.display = FEATURES.ENABLE_BULK_ACTIONS ? 'block' : 'none';
    }
    
    // Show/hide custom rules section based on ENABLE_CUSTOM_RULES flag
    const customRulesSection = document.getElementById('customRulesSection');
    if (customRulesSection) {
        customRulesSection.style.display = FEATURES.ENABLE_CUSTOM_RULES ? 'block' : 'none';
    }
    
    // Add mock indicators if enabled
    if (FEATURES.SHOW_MOCK_INDICATORS) {
        addMockIndicators();
    }
}

/**
 * Adds visual indicators for mock implementations
 */
function addMockIndicators() {
    // Use the loading indicator module if available
    if (window.LoadingIndicator && typeof window.LoadingIndicator.createMockIndicator === 'function') {
        window.LoadingIndicator.createMockIndicator();
    } else {
        // Fallback if module not available
        const mockIndicator = document.createElement('div');
        mockIndicator.className = 'mock-indicator';
        mockIndicator.textContent = 'MOCK MODE';
        document.body.appendChild(mockIndicator);
    }
}

/**
 * Initializes mock implementations based on feature flags
 */
function initializeMocks() {
    console.log("Initializing mocks based on feature flags...");
    
    // Delegate to the centralized mock initialization function in popup_init.js
    if (typeof initializeMockImplementations === 'function') {
        initializeMockImplementations();
    } else {
        console.warn("Mock initialization function not found. Will attempt to initialize mocks later.");
        
        // Set a flag to indicate that mocks need to be initialized
        window.mocksNeedInitialization = true;
    }
}

// Make functions available globally
window.initializeConfig = initializeConfig;
window.applyFeatureFlags = applyFeatureFlags;