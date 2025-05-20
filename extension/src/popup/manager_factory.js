/**
 * manager_factory.js - Creates and initializes manager instances
 *
 * This module handles the creation and initialization of manager instances
 * with proper dependency injection. It ensures that managers are created
 * in the correct order and that dependencies are properly set up.
 */

// Use global DOMManager
// No need to import it since it's already available globally

class ManagerFactory {
    /**
     * Creates a new ManagerFactory instance
     * @param {DOMManager} [domManager] - Optional DOMManager instance
     * @param {Object} [options] - Optional configuration options
     * @param {boolean} [options.useMocks=false] - Whether to use mock implementations
     */
    constructor(domManager, options = {}) {
        console.log('[DEBUG] Constructing ManagerFactory');
        
        // Create a DOMManager instance if not provided
        this.domManager = domManager || new DOMManager();
        this.elements = this.domManager.getAllElements();
        
        // Configuration options
        this.options = {
            useMocks: options.useMocks || false,
            ...options
        };
        
        // Store manager instances
        this.managers = {};
        
        // Initialize basic managers
        this.initializeBasicManagers();
        
        // Initialize dependent managers
        this.initializeDependentManagers();
        
        // Set up cross-references
        this.setupCrossReferences();
    }
    
    /**
     * Initializes basic managers that don't depend on other managers
     */
    initializeBasicManagers() {
        console.log('[DEBUG] ManagerFactory: Initializing basic managers');
        
        // Create MonitoringSystem
        this.managers.monitor = this.createMonitoringSystem();
        
        // Create LoadingManager
        this.managers.loadingManager = this.createLoadingManager();
        
        // Create ErrorManager
        this.managers.errorManager = this.createErrorManager();
        
        // Create AuthManager
        this.managers.authManager = this.createAuthManager();
        
        // Create GMCApi
        this.managers.gmcApi = this.createGMCApi();
        
        // Create GMCValidator
        this.managers.gmcValidator = this.createGMCValidator();
        
        // Create StatusBarManager
        this.managers.statusBarManager = this.createStatusBarManager();
        
        // Create SearchManager
        this.managers.searchManager = this.createSearchManager();
    }
    
    /**
     * Initializes managers that depend on other managers
     */
    initializeDependentManagers() {
        console.log('[DEBUG] ManagerFactory: Initializing dependent managers');
        
        // Create FeedErrorUIManager
        this.managers.feedErrorUIManager = this.createFeedErrorUIManager();
        
        // Create ValidationUIManager
        this.managers.validationUIManager = this.createValidationUIManager();
        
        // Create FeedCoordinator
        this.managers.feedCoordinator = this.createFeedCoordinator();
        
        // For backward compatibility, also set feedManager
        this.managers.feedManager = this.managers.feedCoordinator;
        
        // Create SettingsManager
        this.managers.settingsManager = this.createSettingsManager();
        
        // Create BulkActionsManager
        this.managers.bulkActionsManager = this.createBulkActionsManager();
    }
    
    /**
     * Sets up cross-references between managers
     */
    setupCrossReferences() {
        console.log('[DEBUG] ManagerFactory: Setting up cross-references');
        
        // Set up cross-references between managers
        if (this.managers.validationUIManager && this.managers.feedCoordinator) {
            console.log('[DEBUG] Setting cross-references between managers');
            
            // Ensure ValidationUIManager has reference to FeedCoordinator
            if (this.managers.validationUIManager.managers) {
                this.managers.validationUIManager.managers.feedManager = this.managers.feedCoordinator;
                console.log('[DEBUG] Set feedCoordinator reference in validationUIManager');
                
                // Set FeedErrorUIManager reference in ValidationUIManager
                if (this.managers.feedErrorUIManager) {
                    this.managers.validationUIManager.managers.feedErrorUIManager = this.managers.feedErrorUIManager;
                    console.log('[DEBUG] Set feedErrorUIManager reference in validationUIManager');
                }
            }
            
            // Ensure FeedCoordinator has reference to ValidationUIManager
            if (this.managers.feedCoordinator.managers) {
                this.managers.feedCoordinator.managers.validationUIManager = this.managers.validationUIManager;
                console.log('[DEBUG] Set validationUIManager reference in feedCoordinator');
                
                // Set FeedErrorUIManager reference in FeedCoordinator
                if (this.managers.feedErrorUIManager) {
                    this.managers.feedCoordinator.managers.feedErrorUIManager = this.managers.feedErrorUIManager;
                    console.log('[DEBUG] Set feedErrorUIManager reference in feedCoordinator');
                }
                
                console.log('[DEBUG] Cross-references set successfully');
            } else {
                console.error('[DEBUG] FeedCoordinator.managers is undefined or null');
            }
        } else {
            console.error('[DEBUG] Cannot set cross-references: validationUIManager or feedCoordinator is missing');
            console.log('[DEBUG] validationUIManager:', this.managers.validationUIManager);
            console.log('[DEBUG] feedCoordinator:', this.managers.feedCoordinator);
        }
    }
    
    /**
     * Creates a MonitoringSystem instance
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
     * Creates a LoadingManager instance
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
     * Creates an ErrorManager instance
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
            },
            showWarning: (msg, duration) => {
                console.warn("Warning:", msg);
                alert(`Warning: ${msg}`);
                // TODO: Implement temporary warning message with duration
            }
        };
    }
    
    /**
     * Creates an AuthManager instance
     * @returns {Object} - An AuthManager instance
     */
    createAuthManager() {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        
        if (useFeatureFlags && window.FEATURES.USE_MOCK_AUTH && typeof AuthManager !== 'undefined') {
            console.log('Using mock AuthManager based on feature flag');
            return new AuthManager();
        } else if (typeof AuthManager !== 'undefined') {
            console.log('Using AuthManager (feature flags not available or mock disabled)');
            return new AuthManager();
        } else {
            console.warn('[ManagerFactory] AuthManager not available, using mock implementation');
            return {
                isAuthenticated: true,
                isPro: true,
                isUserAuthenticated: () => true,
                isProUser: () => true,
                authenticate: () => Promise.resolve(true),
                getAuthState: () => ({
                    gmcAuthenticated: true,
                    firebaseAuthenticated: true,
                    isProUser: true,
                    gmcMerchantId: '12345',
                    firebaseUserId: 'mock-user-id'
                }),
                logout: () => Promise.resolve(true),
                checkAuthStatus: () => Promise.resolve({
                    gmcAuthenticated: true,
                    firebaseAuthenticated: true,
                    isProUser: true
                })
            };
        }
    }
    
    /**
     * Creates a GMCApi instance
     * @returns {Object} - A GMCApi instance
     */
    createGMCApi() {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCApi !== 'undefined') {
            console.log('Using mock GMCApi based on feature flag');
            return new GMCApi();
        } else if (typeof GMCApi !== 'undefined') {
            console.log('Using GMCApi (feature flags not available or mock disabled)');
            return new GMCApi();
        } else {
            console.warn('[ManagerFactory] GMCApi not available, using mock implementation');
            return {
                isAuthenticated: true,
                authenticate: () => Promise.resolve({ success: true }),
                validate: (data) => Promise.resolve({
                    isValid: true,
                    totalProducts: data.length,
                    validProducts: data.length,
                    issues: []
                }),
                getAuthUrl: () => 'https://example.com/auth',
                checkAuthStatus: () => Promise.resolve({ isAuthenticated: true }),
                getMerchantId: () => Promise.resolve('12345'),
                getAccountInfo: () => Promise.resolve({
                    merchantId: '12345',
                    merchantName: 'Mock Merchant',
                    websiteUrl: 'https://example.com'
                })
            };
        }
    }
    
    /**
     * Creates a GMCValidator instance
     * @returns {Object} - A GMCValidator instance
     */
    createGMCValidator() {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCValidator !== 'undefined') {
            console.log('Using mock GMCValidator based on feature flag');
            return new GMCValidator(this.managers.gmcApi);
        } else if (typeof GMCValidator !== 'undefined') {
            console.log('Using GMCValidator (feature flags not available or mock disabled)');
            return new GMCValidator(this.managers.gmcApi);
        } else {
            console.log('Creating simple GMCValidator mock');
            return {
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
     * Creates a StatusBarManager instance
     * @returns {Object} - A StatusBarManager instance
     */
    createStatusBarManager() {
        if (typeof StatusBarManager !== 'undefined') {
            return new StatusBarManager(
                null, // Pass null initially for authManager dependency
                this.elements.verifyGMCButton,
                this.elements.validateGMCButton,
                this.elements.logoutButton
            );
        } else { 
            console.error("StatusBarManager class not found!"); 
            return null;
        }
    }
    
    /**
     * Creates a SearchManager instance
     * @returns {Object} - A SearchManager instance
     */
    createSearchManager() {
        if (typeof SearchManager !== 'undefined') {
            return new SearchManager(
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
        } else { 
            console.error("SearchManager class not found!"); 
            return null;
        }
    }
    
    /**
     * Creates a ValidationUIManager instance
     * @returns {Object} - A ValidationUIManager instance
     */
    createValidationUIManager() {
        if (typeof ValidationUIManager !== 'undefined') {
            console.log('[DEBUG] Initializing ValidationUIManager');
            const validationResults = {};
            return new ValidationUIManager(
                { 
                    validationTab: this.elements.validationTab, 
                    historyTableBody: this.elements.historyTableBody, 
                    feedPreviewContainer: this.elements.previewContentContainer 
                },
                this.managers,
                validationResults
            );
        } else { 
            console.error("ValidationUIManager class not found!"); 
            return null;
        }
    }
    
    /**
     * Creates a FeedCoordinator instance
     * @returns {Object} - A FeedCoordinator instance
     */
    createFeedCoordinator() {
        if (typeof FeedCoordinator !== 'undefined') {
            console.log('[DEBUG] Initializing FeedCoordinator');
            
            // Make sure we have valid DOM elements before initializing
            if (!this.elements.fileInput) console.error("fileInput element is null or undefined");
            if (!this.elements.previewButton) console.error("previewButton element is null or undefined");
            if (!this.elements.previewContentContainer) console.error("previewContentContainer element is null or undefined");
            
            return new FeedCoordinator(
                { 
                    fileInput: this.elements.fileInput, 
                    previewButton: this.elements.previewButton, 
                    previewContentContainer: this.elements.previewContentContainer 
                },
                this.managers
            );
        } else {
            console.error("FeedCoordinator class not found!");
            return null;
        }
    }
    
    /**
     * Creates a SettingsManager instance
     * @returns {Object} - A SettingsManager instance
     */
    createSettingsManager() {
        if (typeof SettingsManager !== 'undefined') {
            return new SettingsManager(
                { /* elements */ }, // Finds elements by ID internally
                this.managers
            );
        } else { 
            console.error("SettingsManager class not found!"); 
            return null;
        }
    }
    
    /**
     * Creates a FeedErrorUIManager instance
     * @returns {Object} - A FeedErrorUIManager instance
     */
    createFeedErrorUIManager() {
        if (typeof FeedErrorUIManager !== 'undefined') {
            console.log('[DEBUG] Initializing FeedErrorUIManager');
            
            // Check if the required elements exist
            const feedStatusArea = this.elements.feedStatusArea;
            const feedStatusContent = this.elements.feedStatusContent;
            
            console.log('[DEBUG] FeedErrorUIManager elements:', {
                feedStatusArea: !!feedStatusArea,
                feedStatusContent: !!feedStatusContent
            });
            
            if (!feedStatusArea) {
                console.warn('[DEBUG] feedStatusArea element not found, using document.getElementById');
                this.elements.feedStatusArea = document.getElementById('feedStatusArea');
            }
            
            if (!feedStatusContent) {
                console.warn('[DEBUG] feedStatusContent element not found, using document.getElementById');
                this.elements.feedStatusContent = document.getElementById('feedStatusContent');
            }
            
            // Create the FeedErrorUIManager with the elements
            const manager = new FeedErrorUIManager(
                {
                    feedStatusArea: this.elements.feedStatusArea,
                    feedStatusContent: this.elements.feedStatusContent
                },
                this.managers
            );
            
            console.log('[DEBUG] FeedErrorUIManager created successfully');
            return manager;
        } else {
            console.log("FeedErrorUIManager class not found, skipping initialization");
            return null;
        }
    }
    
    /**
     * Creates a BulkActionsManager instance
     * @returns {Object} - A BulkActionsManager instance
     */
    createBulkActionsManager() {
        if (typeof BulkActionsManager !== 'undefined') {
            return new BulkActionsManager(
                { /* elements */ }, // Finds elements by ID internally
                this.managers
            );
        } else { 
            console.error("BulkActionsManager class not found!"); 
            return null;
        }
    }
    
    /**
     * Gets all managers as an object
     * @returns {Object} - An object containing all managers
     */
    getAllManagers() {
        return this.managers;
    }
    
    /**
     * Gets a specific manager
     * @param {string} name - The name of the manager to get
     * @returns {Object|null} - The manager or null if not found
     */
    get(name) {
        if (!this.managers[name]) {
            console.warn(`[ManagerFactory] Manager "${name}" not found in managers collection`);
        }
        return this.managers[name] || null;
    }
}

// Make globally available for backward compatibility
window.ManagerFactory = ManagerFactory;

// No default export needed for regular scripts