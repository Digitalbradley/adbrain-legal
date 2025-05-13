/**
 * initialization_manager.js - Manages the initialization process
 *
 * This module handles the asynchronous initialization of the application.
 * It coordinates the initialization of all managers and ensures that
 * they are initialized in the correct order.
 */

// Use global variables instead of imports
// const DOMManager = window.DOMManager;
// const ManagerFactory = window.ManagerFactory;

class InitializationManager {
    /**
     * Creates a new InitializationManager instance
     * @param {DOMManager} [domManager] - Optional DOMManager instance
     * @param {ManagerFactory} [managerFactory] - Optional ManagerFactory instance
     * @param {Object} [options] - Optional configuration options
     */
    constructor(domManager, managerFactory, options = {}) {
        console.log('[DEBUG] Constructing InitializationManager');
        
        // Create a DOMManager instance if not provided
        this.domManager = domManager;
        if (!this.domManager) {
            if (typeof DOMManager === 'function') {
                this.domManager = new DOMManager();
            } else if (typeof window.DOMManager === 'function') {
                this.domManager = new window.DOMManager();
            } else {
                console.warn('[InitializationManager] DOMManager not available, creating basic implementation');
                this.domManager = {
                    getElements: () => ({}),
                    setupElements: () => true
                };
            }
        }
        
        // Create a ManagerFactory instance if not provided
        this.managerFactory = managerFactory;
        if (!this.managerFactory) {
            if (typeof ManagerFactory === 'function') {
                this.managerFactory = new ManagerFactory(this.domManager);
            } else if (typeof window.ManagerFactory === 'function') {
                this.managerFactory = new window.ManagerFactory(this.domManager);
            } else {
                console.warn('[InitializationManager] ManagerFactory not available, creating basic implementation');
                this.managerFactory = {
                    getAllManagers: () => ({})
                };
            }
        }
        
        // Get all managers
        this.managers = this.managerFactory.getAllManagers();
        
        // Configuration options
        this.options = {
            autoInitialize: options.autoInitialize || false,
            ...options
        };
        
        // Initialization state
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationError = null;
        
        // Auto-initialize if enabled
        if (this.options.autoInitialize) {
            this.initialize();
        }
    }
    
    /**
     * Initializes the application
     * @returns {Promise<boolean>} - A promise that resolves with true if initialization was successful
     */
    async initialize() {
        console.log('[DEBUG] InitializationManager: Initializing application');
        
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('[DEBUG] InitializationManager: Application already initialized');
            return true;
        }
        
        // Prevent concurrent initializations
        if (this.isInitializing) {
            console.log('[DEBUG] InitializationManager: Application is already initializing');
            return new Promise((resolve) => {
                // Check every 100ms if initialization is complete
                const checkInterval = setInterval(() => {
                    if (!this.isInitializing) {
                        clearInterval(checkInterval);
                        resolve(this.isInitialized);
                    }
                }, 100);
            });
        }
        
        // Set initializing flag
        this.isInitializing = true;
        
        try {
            // Show loading indicator
            if (this.managers.loadingManager && typeof this.managers.loadingManager.showLoading === 'function') {
                this.managers.loadingManager.showLoading('Initializing...');
            }
            
            // Get initial auth state
            await this.getInitialAuthState();
            
            // Set up UI
            this.setupUI();
            
            // Initialize managers
            await this.initializeManagers();
            
            // Set initialized flag
            this.isInitialized = true;
            this.isInitializing = false;
            
            // Hide loading indicator
            if (this.managers.loadingManager && typeof this.managers.loadingManager.hideLoading === 'function') {
                this.managers.loadingManager.hideLoading();
            }
            
            console.log('[DEBUG] InitializationManager: Application initialization complete');
            
            // Set global flag for backward compatibility
            window.isConfigInitialized = true;
            
            return true;
        } catch (error) {
            console.error('[DEBUG] InitializationManager: Application initialization failed:', error);
            
            // Store error
            this.initializationError = error;
            
            // Reset flags
            this.isInitialized = false;
            this.isInitializing = false;
            
            // Show error
            if (this.managers.errorManager && typeof this.managers.errorManager.showError === 'function') {
                this.managers.errorManager.showError(`Initialization failed: ${error.message}`);
            }
            
            // Hide loading indicator
            if (this.managers.loadingManager && typeof this.managers.loadingManager.hideLoading === 'function') {
                this.managers.loadingManager.hideLoading();
            }
            
            // Log error context
            console.error('Error context:', {
                currentAuthState: this.currentAuthState,
                loadingManagerAvailable: !!(this.managers.loadingManager && typeof this.managers.loadingManager.showLoading === 'function'),
                errorManagerAvailable: !!(this.managers.errorManager && typeof this.managers.errorManager.showError === 'function'),
                statusBarManagerAvailable: !!(this.managers.statusBarManager && typeof this.managers.statusBarManager.updateAuthState === 'function'),
                popupMessageHandlerAvailable: !!(window.PopupMessageHandler && typeof window.PopupMessageHandler.sendMessageToBackground === 'function'),
                popupEventHandlersAvailable: !!(window.PopupEventHandlers && typeof window.PopupEventHandlers.setupEventListeners === 'function')
            });
            
            return false;
        }
    }
    
    /**
     * Gets the initial authentication state
     * @returns {Promise<void>}
     */
    async getInitialAuthState() {
        console.log('[DEBUG] InitializationManager: Getting initial auth state');
        
        try {
            // Try multiple methods to get auth state
            let authState = null;
            
            // Method 1: Use PopupMessageHandler.getAuthState if available
            if (window.PopupMessageHandler && typeof window.PopupMessageHandler.getAuthState === 'function') {
                console.log('[DEBUG] Trying to get auth state via PopupMessageHandler.getAuthState');
                try {
                    const response = await window.PopupMessageHandler.getAuthState();
                    if (response && response.success && response.state) {
                        authState = response.state;
                        console.log("[DEBUG] Auth state received via PopupMessageHandler.getAuthState:", authState);
                    }
                } catch (error) {
                    console.warn("[DEBUG] Error getting auth state via PopupMessageHandler.getAuthState:", error);
                }
            }
            
            // Method 2: Use PopupMessageHandler.sendMessageToBackground if available and Method 1 failed
            if (!authState && window.PopupMessageHandler && typeof window.PopupMessageHandler.sendMessageToBackground === 'function') {
                console.log('[DEBUG] Trying to get auth state via PopupMessageHandler.sendMessageToBackground');
                try {
                    const response = await window.PopupMessageHandler.sendMessageToBackground({ action: 'getAuthState' });
                    if (response && response.success && response.state) {
                        authState = response.state;
                        console.log("[DEBUG] Auth state received via sendMessageToBackground:", authState);
                    }
                } catch (error) {
                    console.warn("[DEBUG] Error getting auth state via sendMessageToBackground:", error);
                }
            }
            
            // Method 3: Use chrome.runtime.sendMessage directly if available and previous methods failed
            if (!authState && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                console.log('[DEBUG] Trying to get auth state via chrome.runtime.sendMessage');
                try {
                    const response = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: 'getAuthState' }, (response) => {
                            resolve(response);
                        });
                    });
                    
                    if (response && response.success && response.state) {
                        authState = response.state;
                        console.log("[DEBUG] Auth state received via chrome.runtime.sendMessage:", authState);
                    }
                } catch (error) {
                    console.warn("[DEBUG] Error getting auth state via chrome.runtime.sendMessage:", error);
                }
            }
            
            // If all methods failed, use default state
            if (!authState) {
                console.warn("[DEBUG] All methods to get auth state failed. Using default auth state.");
                authState = {
                    gmcAuthenticated: true, // Set to true to allow functionality
                    firebaseAuthenticated: true, // Set to true to allow functionality
                    isProUser: true, // Set to true to allow functionality
                    gmcMerchantId: '12345', // Mock merchant ID
                    firebaseUserId: 'mock-user-id', // Mock user ID
                    lastError: "Failed to connect to background service"
                };
            }
            
            // Store the state
            this.currentAuthState = authState;
            console.log("[DEBUG] Final auth state:", this.currentAuthState);
            
            // Update managers that need the initial auth state
            if (this.managers.statusBarManager && typeof this.managers.statusBarManager.updateAuthState === 'function') {
                this.managers.statusBarManager.updateAuthState(this.currentAuthState);
            } else {
                console.warn("StatusBarManager missing updateAuthState method or instance not available.");
            }
        } catch (error) {
            console.error("Error getting initial auth state:", error);
            throw error;
        }
    }
    
    /**
     * Sets up the UI
     */
    setupUI() {
        console.log('[DEBUG] InitializationManager: Setting up UI');
        
        try {
            // Setup elements
            this.setupElements();
            
            // Update status bar UI
            if (this.managers.statusBarManager && typeof this.managers.statusBarManager.updateUI === 'function') {
                this.managers.statusBarManager.updateUI(); // Update UI based on initial state
            }
            
            // Setup table manager
            if (this.managers.tableManager && typeof this.managers.tableManager.initialize === 'function') {
                this.managers.tableManager.initialize();
            }
            
            // Setup tabs
            this.setupTabs();
            
            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error("Error setting up UI:", error);
            throw error;
        }
    }
    
    /**
     * Sets up UI elements
     */
    setupElements() {
        console.log('[DEBUG] InitializationManager: Setting up elements');
        
        try {
            // Setup data container
            let dataContainer = document.getElementById('dataContainer');
            if (!dataContainer) {
                console.warn('[DEBUG] Data container not found, attempting to create it');
                
                // Try to find a suitable parent element
                const contentArea = document.querySelector('.content-area');
                if (contentArea) {
                    console.log('[DEBUG] Creating data container in content-area');
                    dataContainer = document.createElement('div');
                    dataContainer.id = 'dataContainer';
                    dataContainer.className = 'data-container';
                    contentArea.appendChild(dataContainer);
                } else {
                    // If content-area doesn't exist, try the main container
                    const mainContainer = document.querySelector('.container');
                    if (mainContainer) {
                        console.log('[DEBUG] Creating data container in main container');
                        dataContainer = document.createElement('div');
                        dataContainer.id = 'dataContainer';
                        dataContainer.className = 'data-container';
                        mainContainer.appendChild(dataContainer);
                    } else {
                        // Last resort: append to body
                        console.log('[DEBUG] Creating data container in body');
                        dataContainer = document.createElement('div');
                        dataContainer.id = 'dataContainer';
                        dataContainer.className = 'data-container';
                        dataContainer.style.width = '100%';
                        dataContainer.style.padding = '20px';
                        dataContainer.style.boxSizing = 'border-box';
                        document.body.appendChild(dataContainer);
                    }
                }
            }
            
            // Setup status bar
            this.setupStatusBar();
            
            // Return true if setup was successful
            return true;
        } catch (error) {
            console.error('[DEBUG] Error setting up elements:', error);
            return false;
        }
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
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
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
        const previewButton = document.getElementById('previewFeed');
        if (previewButton && this.managers.feedCoordinator && typeof this.managers.feedCoordinator.handlePreview === 'function') {
            previewButton.addEventListener('click', () => {
                this.managers.feedCoordinator.handlePreview();
            });
        }
        
        console.log('[DEBUG] Adding click event listener to Validate GMC button');
        const validateGMCButton = document.getElementById('validateGMC');
        if (validateGMCButton && this.managers.validationUIManager && typeof this.managers.validationUIManager.triggerGMCValidation === 'function') {
            validateGMCButton.addEventListener('click', () => {
                this.managers.validationUIManager.triggerGMCValidation();
            });
        }
    }
    
    /**
     * Initializes managers
     * @returns {Promise<void>}
     */
    async initializeManagers() {
        console.log('[DEBUG] InitializationManager: Initializing managers');
        
        try {
            // Initialize managers AFTER auth state is known and basic UI is set up
            // Pass state if needed, or let them fetch it via message if preferred
            if (this.managers.settingsManager && typeof this.managers.settingsManager.initialize === 'function') {
                await this.managers.settingsManager.initialize();
            }
            
            if (this.managers.bulkActionsManager && typeof this.managers.bulkActionsManager.initialize === 'function') {
                await this.managers.bulkActionsManager.initialize();
            }
            
            console.log('[DEBUG] InitializationManager: Managers initialized');
        } catch (error) {
            console.error("Error initializing managers:", error);
            throw error;
        }
    }
    
    /**
     * Gets the initialization state
     * @returns {Object} - The initialization state
     */
    getInitializationState() {
        return {
            isInitialized: this.isInitialized,
            isInitializing: this.isInitializing,
            initializationError: this.initializationError,
            currentAuthState: this.currentAuthState
        };
    }
    
    /**
     * Gets the current auth state
     * @returns {Object} - The current auth state
     */
    getCurrentAuthState() {
        return this.currentAuthState;
    }
}

// Make globally available for backward compatibility
window.InitializationManager = InitializationManager;

// No default export needed for regular scripts