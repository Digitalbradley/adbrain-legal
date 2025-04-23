/**
 * UI Mocks Implementation
 * 
 * This module provides mock implementations of various UI-related manager classes
 * for testing and development purposes.
 */

/**
 * Initializes mock UI manager implementations in the window object.
 * This includes StatusBarManager, SearchManager, ValidationUIManager, 
 * FeedManager, SettingsManager, and BulkActionsManager.
 */
function initializeUIMocks() {
    console.log("Initializing UI Mocks...");
    
    // Create mock StatusBarManager class if it doesn't exist
    if (typeof StatusBarManager === 'undefined') {
        console.log("Creating mock StatusBarManager class");
        window.StatusBarManager = class StatusBarManager {
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
        };
    }
    
    // Create mock SearchManager class if it doesn't exist
    if (typeof SearchManager === 'undefined') {
        console.log("Creating mock SearchManager class");
        window.SearchManager = class SearchManager {
            /**
             * Creates a new mock SearchManager instance
             */
            constructor() { 
                console.log("Mock SearchManager created"); 
            }
        };
    }
    
    // Create mock ValidationUIManager class if it doesn't exist
    if (typeof ValidationUIManager === 'undefined') {
        console.log("Creating mock ValidationUIManager class");
        window.ValidationUIManager = class ValidationUIManager {
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
                    this.managers.feedManager = new FeedManager();
                }
                if (!this.managers.authManager) {
                    console.log("Adding mock AuthManager to ValidationUIManager");
                    this.managers.authManager = new AuthManager();
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
        };
    }
    
    // Create mock FeedManager class if it doesn't exist
    if (typeof FeedManager === 'undefined') {
        console.log("Creating mock FeedManager class");
        window.FeedManager = class FeedManager {
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
                    this.managers.searchManager = new SearchManager();
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
        };
    }
    
    // Create mock SettingsManager if it doesn't exist or modify existing one
    console.log("Creating modified SettingsManager class");
    const originalSettingsManager = window.SettingsManager;
    window.SettingsManager = function(elements, managers) {
        console.log("Modified SettingsManager created");
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Ensure authManager exists to prevent the error
        if (!this.managers.authManager) {
            console.log("Adding mock AuthManager to SettingsManager");
            this.managers.authManager = new AuthManager();
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
    };
    
    // Copy prototype methods from the original SettingsManager if it exists
    if (originalSettingsManager) {
        window.SettingsManager.prototype = originalSettingsManager.prototype;
    } else {
        // Add mock methods
        window.SettingsManager.prototype.initialize = function() {
            console.log("Mock SettingsManager: initialize called");
            return Promise.resolve();
        };
        window.SettingsManager.prototype.applyFeatureGating = function() {
            console.log("Mock SettingsManager: applyFeatureGating called");
            return Promise.resolve();
        };
        window.SettingsManager.prototype.loadSettings = function() {
            console.log("Mock SettingsManager: loadSettings called");
            return Promise.resolve();
        };
        window.SettingsManager.prototype.loadCustomRules = function() {
            console.log("Mock SettingsManager: loadCustomRules called");
            return Promise.resolve();
        };
    }
    
    // Create mock BulkActionsManager class if it doesn't exist
    if (typeof BulkActionsManager === 'undefined') {
        console.log("Creating mock BulkActionsManager class");
        window.BulkActionsManager = class BulkActionsManager {
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
                    this.managers.authManager = new AuthManager();
                }
                if (!this.managers.feedManager) {
                    this.managers.feedManager = new FeedManager();
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
        };
    }
}

// Make function available globally
window.initializeUIMocks = initializeUIMocks;