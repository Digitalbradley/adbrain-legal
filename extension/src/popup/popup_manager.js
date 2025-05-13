/**
 * popup_manager.js - Manages the popup lifecycle
 *
 * This module handles the initialization and coordination of the popup.
 * It uses the DOMManager for element access and manages the lifecycle
 * of various manager instances.
 */

import DOMManager from './dom_manager.js';

class PopupManager {
    /**
     * Creates a new PopupManager instance
     * @param {DOMManager} [domManager] - Optional DOMManager instance
     */
    constructor(domManager) {
        console.log('[DEBUG] Constructing PopupManager');
        
        // Create a DOMManager instance if not provided
        this.domManager = domManager || new DOMManager();
        this.elements = this.domManager.getAllElements();
        
        // Check if application is initialized
        if (!window.isConfigInitialized) {
            console.warn("Application not initialized. Attempting to initialize now...");
            if (typeof initializeApplication === 'function') {
                initializeApplication();
            } else {
                console.error("Application initialization function not found. Some features may not work correctly.");
            }
        }
        
        // Placeholders for managers
        this.monitor = this.createMonitoringSystem();
        this.loadingManager = this.createLoadingManager();
        this.errorManager = this.createErrorManager();
        
        this.validationResults = {};
        this.activeValidationPanel = null;
        this.currentAuthState = null; // Store the latest auth state received from background
        
        // Create a shared managers object with all required dependencies
        this.managers = {
            loadingManager: this.loadingManager,
            errorManager: this.errorManager,
            monitor: this.monitor,
            statusBarManager: null, // Placeholder
            searchManager: null,    // Placeholder
            validationUIManager: null, // Placeholder
            feedCoordinator: null,   // Placeholder
            settingsManager: null,   // Placeholder
            bulkActionsManager: null, // Placeholder
            customRuleValidator: null // Placeholder
        };
        
        // Initialize managers
        this.initializeManagers();
        
        // Start async initialization
        this.initializePopup();
    }
    
    /**
     * Creates a simple MonitoringSystem if not defined elsewhere
     * @returns {Object} - A MonitoringSystem instance
     */
    createMonitoringSystem() {
        if (typeof MonitoringSystem !== 'undefined') {
            return new MonitoringSystem();
        }
        
        // Simple placeholder implementation
        return {
            logOperation: (op, status, details) => console.log(`[Monitor] ${op}: ${status}`, details),
            logError: (err, context) => console.error(`[Monitor] Error in ${context}:`, err)
        };
    }
    
    /**
     * Creates a simple LoadingManager
     * @returns {Object} - A LoadingManager instance
     */
    createLoadingManager() {
        return {
            showLoading: (msg) => { 
                console.log('Loading:', msg); 
                document.body.classList.add('is-loading'); 
            },
            hideLoading: () => { 
                console.log('Hide Loading'); 
                document.body.classList.remove('is-loading'); 
            }
        };
    }
    
    /**
     * Creates a simple ErrorManager
     * @returns {Object} - An ErrorManager instance
     */
    createErrorManager() {
        return {
            showError: (msg) => { 
                console.error("Error:", msg); 
                alert(`Error: ${msg}`); 
            },
            showSuccess: (msg, duration) => { 
                console.log("Success:", msg); 
                // TODO: Implement temporary success message
            }
        };
    }
    
    /**
     * Initializes all manager instances
     */
    initializeManagers() {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        
        // Add AuthManager based on feature flags
        this.initializeAuthManager(useFeatureFlags);
        
        // Add GMCApi based on feature flags
        this.initializeGMCApi(useFeatureFlags);
        
        // Add GMCValidator based on feature flags
        this.initializeGMCValidator(useFeatureFlags);
        
        // Instantiate managers that DON'T need auth state immediately
        this.initializeStatusBarManager();
        this.initializeSearchManager();
        
        // Instantiate managers that might need other managers
        this.initializeValidationUIManager();
        this.initializeFeedCoordinator();
        this.initializeSettingsManager();
        this.initializeBulkActionsManager();
        
        // Set cross-references between managers
        this.setupCrossReferences();
    }
    
    /**
     * Initializes the AuthManager
     * @param {boolean} useFeatureFlags - Whether to use feature flags
     */
    initializeAuthManager(useFeatureFlags) {
        if (useFeatureFlags && window.FEATURES.USE_MOCK_AUTH && typeof AuthManager !== 'undefined') {
            console.log('Using mock AuthManager based on feature flag');
            this.managers.authManager = new AuthManager();
        } else if (typeof AuthManager !== 'undefined') {
            console.log('Using AuthManager (feature flags not available or mock disabled)');
            this.managers.authManager = new AuthManager();
        } else {
            console.error('AuthManager not available');
            this.managers.authManager = {
                getAuthState: () => ({ gmcAuthenticated: false, firebaseAuthenticated: false, isProUser: false })
            };
        }
    }
    
    /**
     * Initializes the GMCApi
     * @param {boolean} useFeatureFlags - Whether to use feature flags
     */
    initializeGMCApi(useFeatureFlags) {
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCApi !== 'undefined') {
            console.log('Using mock GMCApi based on feature flag');
            this.managers.gmcApi = new GMCApi();
        } else if (typeof GMCApi !== 'undefined') {
            console.log('Using GMCApi (feature flags not available or mock disabled)');
            this.managers.gmcApi = new GMCApi();
        } else {
            console.error('GMCApi not available');
            this.managers.gmcApi = {
                isAuthenticated: false,
                authenticate: () => Promise.resolve({ success: false })
            };
        }
    }
    
    /**
     * Initializes the GMCValidator
     * @param {boolean} useFeatureFlags - Whether to use feature flags
     */
    initializeGMCValidator(useFeatureFlags) {
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCValidator !== 'undefined') {
            console.log('Using mock GMCValidator based on feature flag');
            this.managers.gmcValidator = new GMCValidator(this.managers.gmcApi);
        } else if (typeof GMCValidator !== 'undefined') {
            console.log('Using GMCValidator (feature flags not available or mock disabled)');
            this.managers.gmcValidator = new GMCValidator(this.managers.gmcApi);
        } else {
            console.log('Creating simple GMCValidator mock');
            this.managers.gmcValidator = {
                validate: async (feedData) => {
                    console.log('Simple GMCValidator mock: validate called with', feedData);
                    return {
                        isValid: true,
                        totalProducts: feedData.length,
                        validProducts: feedData.length,
                        issues: []
                    };
                }
            };
        }
    }
    
    /**
     * Initializes the StatusBarManager
     */
    initializeStatusBarManager() {
        if (typeof StatusBarManager !== 'undefined') {
            this.statusBarManager = new StatusBarManager(
                null, // Pass null initially for authManager dependency
                this.elements.verifyGMCButton,
                this.elements.validateGMCButton,
                this.elements.logoutButton
            );
            this.managers.statusBarManager = this.statusBarManager; // Add to shared object
        } else { 
            console.error("StatusBarManager class not found!"); 
        }
    }
    
    /**
     * Initializes the SearchManager
     */
    initializeSearchManager() {
        if (typeof SearchManager !== 'undefined') {
            this.searchManager = new SearchManager(
                { 
                    searchInput: this.elements.searchInput, 
                    searchColumnSelect: this.elements.searchColumnSelect, 
                    searchTypeSelect: this.elements.searchTypeSelect, 
                    clearSearchBtn: this.elements.clearSearchBtn, 
                    tableContainer: this.elements.previewContentContainer, 
                    statusElement: this.elements.searchStatus 
                },
                this.managers
            );
            this.managers.searchManager = this.searchManager;
        } else { 
            console.error("SearchManager class not found!"); 
        }
    }
    
    /**
     * Initializes the ValidationUIManager
     */
    initializeValidationUIManager() {
        if (typeof ValidationUIManager !== 'undefined') {
            console.log('[DEBUG] Initializing ValidationUIManager');
            this.validationUIManager = new ValidationUIManager(
                { 
                    validationTab: this.elements.validationTab, 
                    historyTableBody: this.elements.historyTableBody, 
                    feedPreviewContainer: this.elements.previewContentContainer 
                },
                this.managers,
                this.validationResults
            );
            this.managers.validationUIManager = this.validationUIManager;
            console.log('[DEBUG] ValidationUIManager initialized and added to managers');
        } else { 
            console.error("ValidationUIManager class not found!"); 
        }
    }
    
    /**
     * Initializes the FeedCoordinator
     */
    initializeFeedCoordinator() {
        if (typeof FeedCoordinator !== 'undefined') {
            console.log('[DEBUG] Initializing FeedCoordinator');
            
            // Make sure we have valid DOM elements before initializing
            if (!this.elements.fileInput) console.error("fileInput element is null or undefined");
            if (!this.elements.previewButton) console.error("previewButton element is null or undefined");
            if (!this.elements.previewContentContainer) console.error("previewContentContainer element is null or undefined");
            
            this.feedCoordinator = new FeedCoordinator(
                { 
                    fileInput: this.elements.fileInput, 
                    previewButton: this.elements.previewButton, 
                    previewContentContainer: this.elements.previewContentContainer 
                },
                this.managers
            );
            this.managers.feedCoordinator = this.feedCoordinator;
            // For backward compatibility, also set feedManager
            this.managers.feedManager = this.feedCoordinator;
            console.log('[DEBUG] FeedCoordinator initialized and added to managers (as both feedCoordinator and feedManager)');
        } else {
            console.error("FeedCoordinator class not found!");
        }
    }
    
    /**
     * Initializes the SettingsManager
     */
    initializeSettingsManager() {
        if (typeof SettingsManager !== 'undefined') {
            this.settingsManager = new SettingsManager(
                { /* elements */ }, // Finds elements by ID internally
                this.managers
            );
            this.managers.settingsManager = this.settingsManager;
        } else { 
            console.error("SettingsManager class not found!"); 
        }
    }
    
    /**
     * Initializes the BulkActionsManager
     */
    initializeBulkActionsManager() {
        if (typeof BulkActionsManager !== 'undefined') {
            this.bulkActionsManager = new BulkActionsManager(
                { /* elements */ }, // Finds elements by ID internally
                this.managers
            );
            this.managers.bulkActionsManager = this.bulkActionsManager;
        } else { 
            console.error("BulkActionsManager class not found!"); 
        }
    }
    
    /**
     * Sets up cross-references between managers
     */
    setupCrossReferences() {
        if (this.validationUIManager && this.feedCoordinator) {
            console.log('[DEBUG] Setting cross-references between managers');
            this.validationUIManager.managers.feedManager = this.feedCoordinator;
            console.log('[DEBUG] Set feedCoordinator reference in validationUIManager');
            
            // Also ensure FeedCoordinator has reference to ValidationUIManager
            if (this.feedCoordinator.managers) {
                this.feedCoordinator.managers.validationUIManager = this.validationUIManager;
                console.log('[DEBUG] Set validationUIManager reference in feedCoordinator');
                console.log('[DEBUG] Cross-references set successfully');
            } else {
                console.error('[DEBUG] FeedCoordinator.managers is undefined or null');
            }
        } else {
            console.error('[DEBUG] Cannot set cross-references: validationUIManager or feedCoordinator is missing');
            console.log('[DEBUG] validationUIManager:', this.validationUIManager);
            console.log('[DEBUG] feedCoordinator:', this.feedCoordinator);
        }
    }
    
    /**
     * Asynchronously initializes the popup, gets auth state, and sets up UI.
     */
    async initializePopup() {
        console.log('Initializing Popup asynchronously...');
        if (this.loadingManager && typeof this.loadingManager.showLoading === 'function') {
            this.loadingManager.showLoading('Initializing...');
        }
        try {
            // Get initial auth state from background
            const response = await this.sendMessageToBackground({ action: 'getAuthState' });
            if (!response || !response.success || !response.state) {
                // Attempt to gracefully handle failure to get state
                console.error("Failed to get initial authentication state from background service. Proceeding with limited functionality.");
                this.currentAuthState = { 
                    gmcAuthenticated: false, 
                    firebaseAuthenticated: false, 
                    isProUser: false, 
                    gmcMerchantId: null, 
                    firebaseUserId: null, 
                    lastError: "Failed to connect" 
                }; // Default/fallback state
                this.errorManager.showError("Could not retrieve login status. Some features may be unavailable.");
            } else {
                this.currentAuthState = response.state; // Store the state object
                console.log("Initial Auth State Received:", this.currentAuthState);
            }

            // Update managers that need the initial auth state
            if (this.statusBarManager && typeof this.statusBarManager.updateAuthState === 'function') {
                this.statusBarManager.updateAuthState(this.currentAuthState);
            } else {
                console.warn("StatusBarManager missing updateAuthState method or instance not available.");
            }

            // Setup UI elements
            this.setupElements();
            if (this.statusBarManager && typeof this.statusBarManager.updateUI === 'function') {
                this.statusBarManager.updateUI(); // Update UI based on initial state
            }

            // Setup remaining UI components and listeners
            if (this.tableManager && typeof this.tableManager.initialize === 'function') {
                this.tableManager.initialize();
            }
            this.setupTabs(); // Setup tabs AFTER initial auth state is known
            this.setupEventListeners();

            // Initialize managers AFTER auth state is known and basic UI is set up
            // Pass state if needed, or let them fetch it via message if preferred
            if (this.settingsManager && typeof this.settingsManager.initialize === 'function') {
                await this.settingsManager.initialize();
            }
            if (this.bulkActionsManager && typeof this.bulkActionsManager.initialize === 'function') {
                await this.bulkActionsManager.initialize();
            }

            if (this.loadingManager && typeof this.loadingManager.hideLoading === 'function') {
                this.loadingManager.hideLoading();
            }
            console.log('Popup initialization complete.');

        } catch (error) {
            console.error('Popup initialization failed:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                toString: error.toString()
            });
            
            // Log more context about what was happening
            console.error('Error context:', {
                currentAuthState: this.currentAuthState,
                loadingManagerAvailable: !!(this.loadingManager && typeof this.loadingManager.showLoading === 'function'),
                errorManagerAvailable: !!(this.errorManager && typeof this.errorManager.showError === 'function'),
                statusBarManagerAvailable: !!(this.statusBarManager && typeof this.statusBarManager.updateAuthState === 'function'),
                popupMessageHandlerAvailable: !!(window.PopupMessageHandler && typeof window.PopupMessageHandler.sendMessageToBackground === 'function'),
                popupEventHandlersAvailable: !!(window.PopupEventHandlers && typeof window.PopupEventHandlers.setupEventListeners === 'function')
            });
            
            if (this.errorManager && typeof this.errorManager.showError === 'function') {
                this.errorManager.showError(`Initialization failed: ${error.message}`);
            } else {
                alert(`Error: Initialization failed: ${error.message}`);
            }
            
            if (this.loadingManager && typeof this.loadingManager.hideLoading === 'function') {
                this.loadingManager.hideLoading();
            }
        }
    }
    
    /**
     * Sends a message to the background script
     * @param {Object} message - The message to send
     * @returns {Promise<Object>} - A promise that resolves with the response
     */
    async sendMessageToBackground(message) {
        console.log('[DEBUG] Sending message to background:', message);
        
        // Use PopupMessageHandler if available
        if (window.PopupMessageHandler && typeof window.PopupMessageHandler.sendMessageToBackground === 'function') {
            return window.PopupMessageHandler.sendMessageToBackground(message);
        }
        
        // Fallback implementation
        return new Promise((resolve, reject) => {
            try {
                // Check if chrome.runtime is available (it won't be in test environments)
                if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                    console.error('[DEBUG] Chrome runtime not available. This is expected in test environments.');
                    
                    // Return a mock response for test environments
                    setTimeout(() => {
                        const mockResponse = this._getMockResponse(message);
                        console.log('[DEBUG] Returning mock response for test environment:', mockResponse);
                        resolve(mockResponse);
                    }, 100);
                    return;
                }
                
                // Normal chrome.runtime.sendMessage flow for extension environment
                chrome.runtime.sendMessage(message, (response) => {
                    // Check for chrome runtime errors
                    if (chrome.runtime.lastError) {
                        console.error('[DEBUG] Chrome runtime error:', chrome.runtime.lastError);
                        reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
                        return;
                    }
                    
                    // Check if response is undefined or null
                    if (!response) {
                        console.warn('[DEBUG] No response received from background script');
                        resolve({ success: false, error: 'No response received from background script' });
                        return;
                    }
                    
                    console.log('[DEBUG] Received response from background:', response);
                    resolve(response);
                });
            } catch (error) {
                console.error('[DEBUG] Error sending message to background:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Internal method to generate mock responses for test environments
     * @private
     * @param {Object} message - The message that was sent
     * @returns {Object} - A mock response object
     */
    _getMockResponse(message) {
        if (!message || !message.action) {
            return { success: false, error: 'Invalid message format' };
        }
        
        // Generate different mock responses based on the action
        switch (message.action) {
            case 'getAuthState':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: null,
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            case 'authenticateGmc':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: true,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: 'test-merchant-id',
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            case 'signInWithFirebase':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: true,
                        isProUser: true,
                        gmcMerchantId: null,
                        firebaseUserId: 'test-user-id',
                        lastError: null
                    }
                };
                
            case 'signOut':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: null,
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            default:
                return {
                    success: false,
                    error: `Mock response not implemented for action: ${message.action}`
                };
        }
    }
    
    /**
     * Sets up UI elements
     */
    setupElements() {
        console.log('Setting up elements');
        
        // Setup data container
        const dataContainer = document.getElementById('dataContainer');
        if (!dataContainer) {
            console.error('Data container not found');
        }
        
        // Setup status bar
        this.setupStatusBar();
        
        // Return true if setup was successful
        return true;
    }
    
    /**
     * Sets up the status bar
     */
    setupStatusBar() {
        console.log('Status bar setup complete.');
    }
    
    /**
     * Sets up tabs
     */
    setupTabs() {
        console.log('[DEBUG] Setting up tabs');
        
        // Get tab buttons and panels
        const tabButtons = this.elements.tabButtons;
        const tabPanels = this.elements.tabPanels;
        
        if (!tabButtons || !tabPanels) {
            console.error('Tab buttons or panels not found');
            return;
        }
        
        // Set up tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Deactivate all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Activate the selected tab
                button.classList.add('active');
                const panel = document.getElementById(`${tabName}-tab`);
                if (panel) {
                    panel.classList.add('active');
                }
            });
        });
    }
    
    /**
     * Sets up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Use PopupEventHandlers if available
        if (window.PopupEventHandlers && typeof window.PopupEventHandlers.setupEventListeners === 'function') {
            window.PopupEventHandlers.setupEventListeners();
            return;
        }
        
        // Fallback implementation
        console.log('[DEBUG] Adding direct event listener to Preview Feed button as backup');
        if (this.elements.previewButton) {
            this.elements.previewButton.addEventListener('click', () => {
                if (this.feedCoordinator && typeof this.feedCoordinator.handlePreview === 'function') {
                    this.feedCoordinator.handlePreview();
                }
            });
        }
        
        console.log('[DEBUG] Adding click event listener to Validate GMC button');
        if (this.elements.validateGMCButton) {
            this.elements.validateGMCButton.addEventListener('click', () => {
                if (this.validationUIManager && typeof this.validationUIManager.triggerGMCValidation === 'function') {
                    this.validationUIManager.triggerGMCValidation();
                }
            });
        }
    }
}

// Make globally available for backward compatibility
window.PopupManager = PopupManager;

// Export for ES modules
export default PopupManager;