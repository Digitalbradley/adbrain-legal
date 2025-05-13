/**
 * UI Mocks Implementation
 *
 * This module provides mock implementations of various UI-related manager classes
 * for testing and development purposes.
 */

/**
 * Mock StatusBarManager class
 */
class MockStatusBarManager {
    /**
     * Creates a new mock StatusBarManager instance
     */
    constructor() {
        console.log("Mock StatusBarManager created");
    }
    
    /**
     * Updates the status bar based on authentication state
     */
    updateAuthState() {
        console.log("Mock StatusBarManager: updateAuthState called");
    }
    
    /**
     * Updates the UI elements of the status bar
     */
    updateUI() {
        console.log("Mock StatusBarManager: updateUI called");
    }
}

/**
 * Mock SearchManager class
 */
class MockSearchManager {
    /**
     * Creates a new mock SearchManager instance
     */
    constructor() {
        console.log("Mock SearchManager created");
    }
}

/**
 * Mock ValidationUIManager class
 */
class MockValidationUIManager {
    /**
     * Creates a new mock ValidationUIManager instance
     * @param {Object} elements - UI elements
     * @param {Object} managers - Manager instances
     */
    constructor(elements, managers) {
        console.log("Mock ValidationUIManager created");
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Ensure required managers exist to prevent errors
        if (!this.managers.feedManager) {
            console.log("Adding mock FeedManager to ValidationUIManager");
            this.managers.feedManager = new MockFeedManager();
        }
        if (!this.managers.authManager) {
            console.log("Adding mock AuthManager to ValidationUIManager");
            this.managers.authManager = new MockAuthManager();
        }
        if (!this.managers.errorManager) {
            console.log("Adding mock ErrorManager to ValidationUIManager");
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
        
        this.validationResults = {};
        this.offerIdToValidatorRowIndexMap = {};
    }
    
    /**
     * Triggers GMC validation
     * @returns {Promise<void>} A promise that resolves when validation is complete
     */
    triggerGMCValidation() {
        console.log("Mock ValidationUIManager: triggerGMCValidation called");
        return Promise.resolve();
    }
    
    /**
     * Loads validation history from Firestore
     * @returns {Promise<void>} A promise that resolves when history is loaded
     */
    loadValidationHistoryFromFirestore() {
        console.log("Mock ValidationUIManager: loadValidationHistoryFromFirestore called");
        return Promise.resolve();
    }
    
    /**
     * Marks an issue as fixed
     * @returns {Promise<void>} A promise that resolves when the issue is marked as fixed
     */
    markIssueAsFixed() {
        console.log("Mock ValidationUIManager: markIssueAsFixed called");
        return Promise.resolve();
    }
}

/**
 * Mock FeedManager class
 */
class MockFeedManager {
    /**
     * Creates a new mock FeedManager instance
     * @param {Object} elements - UI elements
     * @param {Object} managers - Manager instances
     */
    constructor(elements, managers) {
        console.log("Mock FeedManager created");
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Ensure required managers exist to prevent errors
        if (!this.managers.loadingManager) {
            this.managers.loadingManager = {
                showLoading: (msg) => console.log('Loading:', msg),
                hideLoading: () => console.log('Hide Loading')
            };
        }
        if (!this.managers.errorManager) {
            this.managers.errorManager = {
                showError: (msg) => alert(`Error: ${msg}`),
                showSuccess: (msg) => console.log(`Success: ${msg}`)
            };
        }
        if (!this.managers.searchManager) {
            this.managers.searchManager = new MockSearchManager();
        }
        if (!this.managers.validationUIManager) {
            this.managers.validationUIManager = { markIssueAsFixed: () => {} };
        }
        
        this.offerIdToRowIndexMap = {};
    }
    
    /**
     * Initializes the floating scroll bar
     */
    initFloatingScrollBar() {
        console.log("Mock FeedManager: initFloatingScrollBar called");
    }
    
    /**
     * Handles feed preview
     */
    handlePreview() {
        console.log("Mock FeedManager: handlePreview called");
    }
    
    /**
     * Gets table data for the feed
     * @returns {Array} The table data
     */
    getTableData() {
        console.log("Mock FeedManager: getTableData called");
        return [
            {
                id: 'PROD001',
                title: 'Advanced Portable Speakers',
                description: 'Built to last, this portable speakers combines ultra-fast processing with user-friendly features.',
                price: '449.56 USD',
                image_link: 'https://example.com/images/prod001.jpg',
                link: 'https://example.com/products/prod001'
            }
        ];
    }
    
    /**
     * Gets corrected table data
     * @returns {Array} The corrected table data
     */
    getCorrectedTableData() {
        console.log("Mock FeedManager: getCorrectedTableData called");
        return this.getTableData();
    }
    
    /**
     * Gets applied corrections
     * @returns {Array} The applied corrections
     */
    getAppliedCorrections() {
        console.log("Mock FeedManager: getAppliedCorrections called");
        return [];
    }
}

/**
 * Mock AuthManager class
 */
class MockAuthManager {
    constructor() {
        console.log("Mock AuthManager created");
        this.isAuthenticated = true;
        this.isPro = false;
    }
    
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
    
    isProUser() {
        return this.isPro;
    }
}

/**
 * Mock SettingsManager class
 */
class MockSettingsManager {
    constructor(elements, managers) {
        console.log("Mock SettingsManager created");
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Ensure authManager exists to prevent the error
        if (!this.managers.authManager) {
            console.log("Adding mock AuthManager to SettingsManager");
            this.managers.authManager = new MockAuthManager();
        }
        
        this.isPro = false;
        
        // Get references to specific settings elements
        this.elements.enableScheduleToggle = document.getElementById('enableSchedule');
        this.elements.scheduleOptionsDiv = document.getElementById('scheduleOptions');
        this.elements.scheduleFrequencySelect = document.getElementById('scheduleFrequency');
        this.elements.weeklyOptionsDiv = document.getElementById('weeklyOptions');
        this.elements.scheduleDayOfWeekSelect = document.getElementById('scheduleDayOfWeek');
        this.elements.scheduleTimeSelect = document.getElementById('scheduleTime');
        this.elements.enableEmailNotificationsToggle = document.getElementById('enableEmailNotifications');
        this.elements.saveScheduleButton = document.getElementById('saveSchedule');
        this.elements.scheduleUpgradePrompt = document.getElementById('scheduleUpgradePrompt');
    }
    
    initialize() {
        console.log("Mock SettingsManager: initialize called");
        return Promise.resolve();
    }
    
    applyFeatureGating() {
        console.log("Mock SettingsManager: applyFeatureGating called");
        return Promise.resolve();
    }
    
    loadSettings() {
        console.log("Mock SettingsManager: loadSettings called");
        return Promise.resolve();
    }
    
    loadCustomRules() {
        console.log("Mock SettingsManager: loadCustomRules called");
        return Promise.resolve();
    }
}

/**
 * Mock BulkActionsManager class
 */
class MockBulkActionsManager {
    /**
     * Creates a new mock BulkActionsManager instance
     * @param {Object} elements - UI elements
     * @param {Object} managers - Manager instances
     */
    constructor(elements, managers) {
        console.log("Mock BulkActionsManager created");
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Ensure required managers exist to prevent errors
        if (!this.managers.authManager) {
            this.managers.authManager = new MockAuthManager();
        }
        if (!this.managers.feedManager) {
            this.managers.feedManager = new MockFeedManager();
        }
    }
    
    /**
     * Initializes the bulk actions manager
     * @returns {Promise<void>} A promise that resolves when initialization is complete
     */
    initialize() {
        console.log("Mock BulkActionsManager: initialize called");
        return Promise.resolve();
    }
    
    /**
     * Applies feature gating based on user status
     * @returns {Promise<void>} A promise that resolves when feature gating is applied
     */
    applyFeatureGating() {
        console.log("Mock BulkActionsManager: applyFeatureGating called");
        return Promise.resolve();
    }
    
    /**
     * Loads correction templates
     * @returns {Promise<void>} A promise that resolves when templates are loaded
     */
    loadTemplates() {
        console.log("Mock BulkActionsManager: loadTemplates called");
        return Promise.resolve();
    }
}

/**
 * Initializes mock UI manager implementations in the window object.
 * This includes StatusBarManager, SearchManager, ValidationUIManager,
 * FeedManager, SettingsManager, and BulkActionsManager.
 */
function initializeUIMocks() {
    console.log("Initializing UI Mocks...");
    
    // Create mock StatusBarManager class if it doesn't exist
    if (typeof window.StatusBarManager === 'undefined') {
        console.log("Creating mock StatusBarManager class");
        window.StatusBarManager = MockStatusBarManager;
    }
    
    // Create mock SearchManager class if it doesn't exist
    if (typeof window.SearchManager === 'undefined') {
        console.log("Creating mock SearchManager class");
        window.SearchManager = MockSearchManager;
    }
    
    // Create mock ValidationUIManager class if it doesn't exist
    if (typeof window.ValidationUIManager === 'undefined') {
        console.log("Creating mock ValidationUIManager class");
        window.ValidationUIManager = MockValidationUIManager;
    }
    
    // Create mock FeedManager class if it doesn't exist
    if (typeof window.FeedManager === 'undefined') {
        console.log("Creating mock FeedManager class");
        window.FeedManager = MockFeedManager;
    }
    
    // Create mock SettingsManager if it doesn't exist or create an enhanced version if it does
    console.log("Creating SettingsManager class");
    const originalSettingsManager = window.SettingsManager;
    
    if (originalSettingsManager) {
        console.log("Original SettingsManager found, creating enhanced version");
        // Create a new class that extends the original one
        class EnhancedMockSettingsManager extends originalSettingsManager {
            constructor(elements, managers) {
                super(elements, managers);
                console.log("Enhanced Mock SettingsManager created");
                
                // Add any additional initialization here
                this.elements = elements || {};
                this.managers = managers || {};
                
                // Ensure authManager exists to prevent the error
                if (!this.managers.authManager) {
                    console.log("Adding mock AuthManager to Enhanced SettingsManager");
                    this.managers.authManager = new MockAuthManager();
                }
                
                this.isPro = true; // Override to enable pro features
            }
            
            // Add or override methods as needed
            initialize() {
                console.log("Enhanced Mock SettingsManager: initialize called");
                // Call the original method if it exists
                if (super.initialize) {
                    return super.initialize();
                }
                return Promise.resolve();
            }
        }
        
        window.SettingsManager = EnhancedMockSettingsManager;
    } else {
        // Use the basic mock if the original doesn't exist
        console.log("No original SettingsManager found, using basic mock");
        window.SettingsManager = MockSettingsManager;
    }
    
    // Create mock BulkActionsManager class if it doesn't exist
    if (typeof window.BulkActionsManager === 'undefined') {
        console.log("Creating mock BulkActionsManager class");
        window.BulkActionsManager = MockBulkActionsManager;
    }
}

// For backward compatibility, also make function available globally
window.initializeUIMocks = initializeUIMocks;

// No default export needed for regular scripts