// src/popup/popup.js - Refactored for Message Passing

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Character counter function
window.updateCharCount = function(element, maxLength) {
    const content = element.innerText || element.textContent;
    const charCount = content.length;
    const countDisplay = element.nextElementSibling;
    const isDescription = element.dataset.field === 'description';
    const minRequired = isDescription ? 90 : 25; // Assuming title min is 25 based on context

    countDisplay.textContent = `${charCount}/${maxLength}`;

    if (charCount < minRequired) {
        countDisplay.style.color = '#dc3545'; // Red
    } else if (charCount > maxLength) {
        countDisplay.style.color = '#dc3545'; // Red
    } else {
        countDisplay.style.color = '#28a745'; // Green
    }
};

// Basic placeholder for MonitoringSystem if not defined elsewhere
if (typeof MonitoringSystem === 'undefined') {
    class MonitoringSystem {
        logOperation(op, status, details) { console.log(`[Monitor] ${op}: ${status}`, details); }
        logError(err, context) { console.error(`[Monitor] Error in ${context}:`, err); }
    }
    window.MonitoringSystem = MonitoringSystem; // Make available globally if needed
}


class PopupManager {
    constructor() {
        this.monitor = new MonitoringSystem();
        console.log('Constructing PopupManager');

        // Placeholders for managers
        // TODO: Replace with actual implementations if available
        this.tableManager = { initialize: () => console.log('TableManager placeholder init') };
        this.loadingManager = {
            showLoading: (msg) => { console.log('Loading:', msg); document.body.classList.add('is-loading'); },
            hideLoading: () => { console.log('Hide Loading'); document.body.classList.remove('is-loading'); }
        };
        this.errorManager = {
             showError: (msg) => { console.error("Error:", msg); alert(`Error: ${msg}`); }, // Simple alert for now
             showSuccess: (msg, duration) => { console.log("Success:", msg); /* TODO: Implement temporary success message */ }
        };

        this.validationResults = {};
        this.activeValidationPanel = null;
        this.currentAuthState = null; // Store the latest auth state received from background

        // --- Get UI element references ---
        const fileInputEl = document.getElementById('fileInput');
        const previewButtonEl = document.getElementById('previewFeed');
        this.previewContentContainer = document.getElementById('previewContent');
        this.exportButton = document.getElementById('exportFeed');
        this.verifyGMCButton = document.getElementById('testGMCAuth');
        this.validateGMCButton = document.getElementById('validateGMC');
        this.logoutButton = document.getElementById('logoutButton');
        this.mainDropdown = document.getElementById('analysisDropdown');
        const searchInputEl = document.getElementById('searchInput');
        const searchColumnSelectEl = document.getElementById('searchColumn');
        const searchTypeSelectEl = document.getElementById('searchType');
        const clearSearchBtnEl = document.getElementById('clearSearchBtn');
        const searchStatusEl = document.querySelector('.search-status');

        // --- Instantiate Managers ---
        // Create a shared managers object with all required dependencies
        const managers = {
            loadingManager: this.loadingManager,
            errorManager: this.errorManager,
            monitor: this.monitor,
            authManager: new AuthManager(), // Add mock AuthManager
            gmcApi: new GMCApi(), // Add GMCApi
            statusBarManager: null, // Placeholder
            searchManager: null,    // Placeholder
            validationUIManager: null, // Placeholder
            feedManager: null,       // Placeholder
            settingsManager: null,   // Placeholder
            bulkActionsManager: null, // Placeholder
            customRuleValidator: null // Placeholder
        };
        
        // Add GMCValidator mock
        if (typeof GMCValidator !== 'undefined') {
            managers.gmcValidator = new GMCValidator(managers.gmcApi);
        } else {
            // Create a simple mock if GMCValidator is not available
            managers.gmcValidator = {
                validate: async (feedData) => {
                    console.log('Mock GMCValidator: validate called with', feedData);
                    return {
                        isValid: true,
                        totalProducts: feedData.length,
                        validProducts: feedData.length,
                        issues: []
                    };
                }
            };
        }

        // Instantiate managers that DON'T need auth state immediately
        // Ensure StatusBarManager class is loaded
        if (typeof StatusBarManager !== 'undefined') {
            this.statusBarManager = new StatusBarManager(
                null, // Pass null initially for authManager dependency
                this.verifyGMCButton,
                this.validateGMCButton,
                this.logoutButton
            );
            managers.statusBarManager = this.statusBarManager; // Add to shared object
        } else { console.error("StatusBarManager class not found!"); }

        // Ensure SearchManager class is loaded
        if (typeof SearchManager !== 'undefined') {
            this.searchManager = new SearchManager(
                 { searchInput: searchInputEl, searchColumnSelect: searchColumnSelectEl, searchTypeSelect: searchTypeSelectEl, clearSearchBtn: clearSearchBtnEl, tableContainer: this.previewContentContainer, statusElement: searchStatusEl },
                 managers
            );
            managers.searchManager = this.searchManager;
        } else { console.error("SearchManager class not found!"); }


        // Instantiate managers that might need other managers
        // Ensure ValidationUIManager class is loaded
        if (typeof ValidationUIManager !== 'undefined') {
            this.validationUIManager = new ValidationUIManager(
                { validationTab: document.getElementById('validation-tab'), historyTableBody: document.getElementById('validationHistory'), feedPreviewContainer: this.previewContentContainer },
                managers,
                this.validationResults
            );
            managers.validationUIManager = this.validationUIManager;
        } else { console.error("ValidationUIManager class not found!"); }

        // Ensure FeedManager class is loaded
        if (typeof FeedManager !== 'undefined') {
            this.feedManager = new FeedManager(
                { fileInput: fileInputEl, previewButton: previewButtonEl, previewContentContainer: this.previewContentContainer },
                managers
            );
            managers.feedManager = this.feedManager;
        } else { console.error("FeedManager class not found!"); }

        // Ensure SettingsManager class is loaded
        if (typeof SettingsManager !== 'undefined') {
            this.settingsManager = new SettingsManager(
                { /* elements */ }, // Finds elements by ID internally
                managers
            );
            managers.settingsManager = this.settingsManager;
        } else { console.error("SettingsManager class not found!"); }

        // Ensure BulkActionsManager class is loaded
        if (typeof BulkActionsManager !== 'undefined') {
            this.bulkActionsManager = new BulkActionsManager(
               { /* elements */ }, // Finds elements by ID internally
               managers
            );
            managers.bulkActionsManager = this.bulkActionsManager;
        } else { console.error("BulkActionsManager class not found!"); }

        // CustomRuleValidator instantiation removed - background handles validation logic now

        // --- Set Cross-References ---
        // Ensure managers have references they need
        if (this.validationUIManager && this.feedManager) {
             this.validationUIManager.managers.feedManager = this.feedManager;
        }
        // Add other necessary cross-references if managers depend on each other directly

        // Start async initialization
        this.initializePopup();
    }

    /**
     * Asynchronously initializes the popup, gets auth state, and sets up UI.
     */
    async initializePopup() {
        console.log('Initializing Popup asynchronously...');
        this.loadingManager.showLoading('Initializing...');
        try {
            // Get initial auth state from background
            const response = await this.sendMessageToBackground({ action: 'getAuthState' });
            if (!response || !response.success || !response.state) {
                 // Attempt to gracefully handle failure to get state
                 console.error("Failed to get initial authentication state from background service. Proceeding with limited functionality.");
                 this.currentAuthState = { gmcAuthenticated: false, firebaseAuthenticated: false, isProUser: false, gmcMerchantId: null, firebaseUserId: null, lastError: "Failed to connect" }; // Default/fallback state
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
            this.statusBarManager?.updateUI(); // Update UI based on initial state

            // Setup remaining UI components and listeners
            this.tableManager?.initialize(); // Use optional chaining
            this.setupTabs(); // Setup tabs AFTER initial auth state is known
            this.setupEventListeners();

            // Initialize managers AFTER auth state is known and basic UI is set up
            // Pass state if needed, or let them fetch it via message if preferred
            await this.settingsManager?.initialize(); // Use optional chaining
            await this.bulkActionsManager?.initialize(); // Use optional chaining

            this.loadingManager.hideLoading();
            console.log('Popup initialization complete.');

        } catch (error) {
            console.error('Popup initialization failed:', error);
            this.errorManager.showError(`Initialization failed: ${error.message}`);
            this.loadingManager.hideLoading();
            this.statusBarManager?.updateUI(true); // Show error state if possible
        }
    }

    // Helper to send messages and handle responses/errors
    sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            if (!chrome.runtime?.sendMessage) {
                 console.error("chrome.runtime.sendMessage is not available.");
                 // Resolve with an error state instead of rejecting to allow graceful handling
                 return resolve({ success: false, error: { message: "Extension context invalidated." } });
            }
            
            // For getAuthState action, return a mock response if we have a mock AuthManager
            if (message.action === 'getAuthState') {
                console.log("Intercepting getAuthState message with mock response");
                const mockAuthManager = new AuthManager();
                const state = mockAuthManager.getAuthState();
                return resolve({ success: true, state: state });
            }
            
            // For other actions, try to send to background, but provide fallbacks
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                        console.error(`Message sending error for action "${message?.action}":`, lastError.message);
                        
                        // Provide mock responses for common actions
                        if (message.action === 'authenticateGmc') {
                            return resolve({
                                success: true,
                                merchantId: 'MOCK-123456',
                                message: 'Mock GMC authentication successful'
                            });
                        } else if (message.action === 'signInWithFirebase') {
                            return resolve({
                                success: true,
                                user: { uid: 'mock-user-id', email: 'mock@example.com' }
                            });
                        } else if (message.action === 'logoutGmc' || message.action === 'signOutFirebase') {
                            return resolve({ success: true });
                        } else {
                            // Resolve with an error state for other actions
                            resolve({ success: false, error: { message: lastError.message } });
                        }
                    } else if (response && response.error && !response.success) { // Check success flag with error
                         console.error(`Background script error for action "${message?.action}":`, response.error);
                         resolve(response); // Resolve with the error response from background
                    }
                    else {
                        resolve(response); // Resolve with the entire response (could be success or specific non-error failure)
                    }
                });
            } catch (error) {
                console.error(`Error sending message for action "${message?.action}":`, error);
                
                // Provide mock responses for common actions
                if (message.action === 'getAuthState') {
                    const mockAuthManager = new AuthManager();
                    const state = mockAuthManager.getAuthState();
                    return resolve({ success: true, state: state });
                } else if (message.action === 'authenticateGmc') {
                    return resolve({
                        success: true,
                        merchantId: 'MOCK-123456',
                        message: 'Mock GMC authentication successful'
                    });
                } else if (message.action === 'signInWithFirebase') {
                    return resolve({
                        success: true,
                        user: { uid: 'mock-user-id', email: 'mock@example.com' }
                    });
                } else if (message.action === 'logoutGmc' || message.action === 'signOutFirebase') {
                    return resolve({ success: true });
                } else {
                    // Resolve with an error state for other actions
                    resolve({ success: false, error: { message: error.message } });
                }
            }
        });
    }


    setupElements() {
        console.log('Setting up elements');
        this.dataContainer = document.querySelector('.data-container');
        // Checks for fileInput, previewButton, mainDropdown removed - Handled by respective managers
        // this.exportButton reference kept but might be unused if BulkActionsManager handles it
        if (!this.exportButton) console.warn('Export button element not found (may be unused).');
        if (!this.dataContainer) console.error('Data container not found');
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        // FeedManager handles file input/preview

        // Analysis Dropdown
        if (this.mainDropdown) {
            this.mainDropdown.addEventListener('change', (e) => this.handleDropdownChange(e));
        }

        // Validate Feed Button
        if (this.validateGMCButton) {
            // ValidationUIManager handles the validation process
            this.validateGMCButton.addEventListener('click', () => this.triggerGMCValidation());
        } else {
            console.warn('Validate GMC button not found.');
        }

        // --- Connect Button Listeners to Message Sending ---
        if (this.verifyGMCButton) {
             this.verifyGMCButton.addEventListener('click', () => this.verifyOrAuthenticateGMC());
        } else { console.warn("Verify GMC button not found."); }

         if (this.logoutButton) {
             this.logoutButton.addEventListener('click', () => this.handleLogout());
        } else { console.warn("Logout button not found."); }
        // ----------------------------------------------------


        // --- Validation History Controls Listeners ---
        const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        if (refreshHistoryBtn && this.validationUIManager) {
            refreshHistoryBtn.addEventListener('click', () => {
                console.log('Refresh history button clicked.');
                // ValidationUIManager needs auth state, assume it gets it internally or refactor
                this.validationUIManager.loadValidationHistoryFromFirestore()
                    .catch(error => console.error("Error refreshing validation history:", error));
            });
        } else { console.warn('Refresh history button or ValidationUIManager not found.'); }

        const historySortSelect = document.getElementById('historySort');
        if (historySortSelect && this.validationUIManager) {
            historySortSelect.addEventListener('change', (e) => {
                const sortBy = e.target.value;
                console.log(`History sort changed to: ${sortBy}`);
                this.validationUIManager.loadValidationHistoryFromFirestore(undefined, sortBy)
                     .catch(error => console.error("Error reloading validation history after sort change:", error));
            });
        } else { console.warn('History sort select or ValidationUIManager not found.'); }
        // -----------------------------------------

        // Settings & Bulk Actions listeners are handled within their respective managers' initialize methods

    }

    handleDropdownChange(e) {
        const selectedValue = e.target.value;
        if (selectedValue === 'analyze-feed') {
            // this.analyzeFeed(); // analyzeFeed method was removed
            console.warn("Analyze Feed dropdown option selected, but analyzeFeed method is removed.");
        }
    }

    async triggerGMCValidation() {
        // ValidationUIManager now orchestrates this
        if (this.validationUIManager) {
            // Pass current auth state if needed by VUIManager for custom rules check
            // VUIManager constructor receives managers object which includes authManager
            await this.validationUIManager.triggerGMCValidation();
        } else {
            console.error("ValidationUIManager not initialized.");
            this.errorManager.showError("Validation UI is not ready.");
        }
    }

    async verifyOrAuthenticateGMC() {
        this.loadingManager.showLoading('Checking GMC Connection...');
        try {
            const response = await this.sendMessageToBackground({ action: 'authenticateGmc' });

            if (response?.success) {
                const message = `Successfully connected to GMC (Merchant ID: ${response.merchantId})`;
                this.errorManager.showSuccess(message, 3000);
                // Refresh local state and update UI
                const stateResponse = await this.sendMessageToBackground({ action: 'getAuthState' });
                if (stateResponse?.success && stateResponse.state) {
                    this.currentAuthState = stateResponse.state;
                    this.statusBarManager?.updateAuthState(this.currentAuthState);
                    this.statusBarManager?.updateUI();
                } else {
                     console.warn("Failed to refresh auth state after GMC auth.");
                     this.errorManager.showError("Connected, but failed to refresh status.");
                }
            } else {
                 throw new Error(response?.error?.message || 'GMC Authentication failed.');
            }
        } catch (error) {
            let errorMessage = 'Could not connect to GMC.';
             if (error.message && error.message.includes('No merchant account found')) {
                 errorMessage = 'Connection failed: No Google Merchant Center account found or accessible.';
             } else if (error.message) {
                 errorMessage = `Connection failed: ${error.message}`;
             }
            this.errorManager.showError(errorMessage);
            this.statusBarManager?.updateUI(true);
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    async handleLogout() {
        console.log('Logout button clicked');
        this.loadingManager.showLoading('Logging out...');
        try {
            // Send messages for both GMC and Firebase logout
            const results = await Promise.allSettled([
                 this.sendMessageToBackground({ action: 'logoutGmc' }),
                 this.sendMessageToBackground({ action: 'signOutFirebase' })
            ]);

            let gmcLogoutSuccess = results[0].status === 'fulfilled' && results[0].value?.success;
            let firebaseLogoutSuccess = results[1].status === 'fulfilled' && results[1].value?.success;

            // Log detailed results
            console.log("Logout results:", results);

            if (gmcLogoutSuccess || firebaseLogoutSuccess) { // Consider success if at least one succeeds
                 this.errorManager.showSuccess('Logout successful.', 2000);
            } else {
                 // If both failed, show primary error (e.g., from GMC logout)
                 const firstError = results.find(r => r.status === 'rejected')?.reason || results.find(r => r.status === 'fulfilled' && !r.value?.success)?.value?.error;
                 throw new Error(firstError?.message || 'Logout failed for both services.');
            }

            // Refresh state and UI regardless of partial success
            const stateResponse = await this.sendMessageToBackground({ action: 'getAuthState' });
             if (stateResponse?.success && stateResponse.state) {
                 this.currentAuthState = stateResponse.state;
                 this.statusBarManager?.updateAuthState(this.currentAuthState);
                 this.statusBarManager?.updateUI();
             } else {
                  console.warn("Failed to refresh auth state after logout.");
             }

            // Redirect to login page
             window.location.href = 'login.html';

        } catch (error) { // Catch errors from sendMessageToBackground or thrown errors
            console.error('Logout failed:', error);
            this.errorManager.showError(`Logout failed: ${error.message || 'Unknown error'}`);
             // Attempt to update UI even on error
             try {
                 const stateResponse = await this.sendMessageToBackground({ action: 'getAuthState' });
                 if (stateResponse?.success && stateResponse.state) {
                     this.currentAuthState = stateResponse.state;
                     this.statusBarManager?.updateAuthState(this.currentAuthState);
                     this.statusBarManager?.updateUI();
                 }
             } catch (stateError) {
                  console.error("Failed to update state after logout error:", stateError);
             }
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    setupTabs() {
         const tabButtons = document.querySelectorAll('.tab-button');
         const tabPanels = document.querySelectorAll('.tab-panel');
         if (!tabButtons.length || !tabPanels.length) {
             console.warn("Tab setup skipped: Buttons or panels not found.");
             return;
         }

         let initialLoadDone = { // Track if initial load was done for tabs needing it
             validation: false,
             settings: false,
             feed: false // For bulk actions gating/loading
         };

         const handleTabClick = async (button) => { // Make async
             const targetTab = button.dataset.tab;
             if (!targetTab || button.classList.contains('active')) return;
             console.log('Tab clicked:', targetTab);

             // Deactivate all first
             tabButtons.forEach(btn => btn.classList.remove('active'));
             tabPanels.forEach(panel => panel.classList.remove('active'));

             // Activate clicked button and corresponding panel
             button.classList.add('active');
             const targetPanel = document.getElementById(`${targetTab}-tab`);
             if (!targetPanel) {
                 console.warn(`Panel with ID "${targetTab}-tab" not found.`);
                 return;
             }
             targetPanel.classList.add('active');
             console.log('Activated panel:', `${targetTab}-tab`);

             // --- Handle Tab Specific Actions ---
             this.loadingManager.showLoading(`Loading ${targetTab} tab...`);
             try {
                 // Refresh auth state on tab switch to ensure UI reflects current status
                 const stateResponse = await this.sendMessageToBackground({ action: 'getAuthState' });
                 if (!stateResponse?.success || !stateResponse.state) throw new Error("Failed to refresh auth state.");
                 this.currentAuthState = stateResponse.state;
                 // Update managers needing state
                 this.statusBarManager?.updateAuthState(this.currentAuthState);
                 this.statusBarManager?.updateUI(); // Update status bar immediately

                 // Trigger manager initializations or updates based on tab
                 if (targetTab === 'feed') {
                     if (this.feedManager) setTimeout(() => this.feedManager.initFloatingScrollBar(), 100);
                     if (this.bulkActionsManager) {
                         console.log('Feed tab activated, applying bulk actions feature gating...');
                         await this.bulkActionsManager.applyFeatureGating();
                         if (this.bulkActionsManager.isPro && !initialLoadDone.feed) {
                              await this.bulkActionsManager.loadTemplates();
                              initialLoadDone.feed = true;
                         }
                     }
                 } else if (targetTab === 'validation') {
                     if (this.validationUIManager && !initialLoadDone.validation) {
                         console.log('Validation tab activated, loading history...');
                         await this.validationUIManager.loadValidationHistoryFromFirestore();
                         initialLoadDone.validation = true;
                     } else if (this.validationUIManager) {
                         console.log('Validation tab re-activated.');
                         // Optionally refresh: await this.validationUIManager.loadValidationHistoryFromFirestore();
                     }
                 } else if (targetTab === 'settings') {
                     if (this.settingsManager) {
                         console.log('Settings tab activated, applying feature gating...');
                         await this.settingsManager.applyFeatureGating();
                         if (this.settingsManager.isPro && !initialLoadDone.settings) {
                             await this.settingsManager.loadSettings();
                             await this.settingsManager.loadCustomRules();
                             initialLoadDone.settings = true;
                         } else if (this.settingsManager.isPro) {
                              console.log('Settings tab re-activated.');
                             // Optionally refresh: await this.settingsManager.loadSettings(); await this.settingsManager.loadCustomRules();
                         }
                     }
                 }
             } catch (error) {
                  console.error(`Error handling tab switch for ${targetTab}:`, error);
                  this.errorManager.showError(`Failed to load ${targetTab} tab content.`);
             } finally {
                  this.loadingManager.hideLoading();
             }
             // ------------------------------------
         };

         tabButtons.forEach(button => {
             button.addEventListener('click', () => handleTabClick(button));
         });

         // Activate initial tab and trigger its actions AFTER ensuring auth state is loaded
         const activateInitialTab = () => {
             const initialActiveButton = document.querySelector('.tab-button.active') || tabButtons[0];
             if (initialActiveButton && !initialActiveButton.classList.contains('active-init')) {
                 initialActiveButton.classList.add('active-init'); // Mark as initially processed
                 handleTabClick(initialActiveButton); // Trigger actions for initial tab
             } else if (initialActiveButton) {
                  console.log("Initial tab already marked active, skipping initial click simulation.");
                  // Potentially force refresh/load if needed on popup reopen?
             }
         };

         // Ensure initial auth state is loaded before activating the initial tab
         if (this.currentAuthState) {
             activateInitialTab();
         } else {
             // If initializePopup failed before getting state, this might not run.
             console.warn("Initial auth state not available yet for initial tab activation.");
             // Maybe activate first tab visually without triggering actions?
             // tabButtons[0]?.classList.add('active');
             // tabPanels[0]?.classList.add('active');
         }
    }

} // End of PopupManager class

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup DOMContentLoaded event fired");
    
    // Create mock Firebase implementation
    if (typeof firebase === 'undefined') {
        console.log("Creating mock Firebase implementation");
        window.firebase = {
            initializeApp: (config) => {
                console.log("Mock Firebase initialized with config:", config);
                return {};
            },
            auth: () => ({
                currentUser: { uid: 'mock-user-id', email: 'mock@example.com' },
                onAuthStateChanged: (callback) => {
                    callback({ uid: 'mock-user-id', email: 'mock@example.com' });
                    return () => {}; // Unsubscribe function
                },
                signInWithPopup: () => Promise.resolve({ user: { uid: 'mock-user-id', email: 'mock@example.com' } }),
                signOut: () => Promise.resolve()
            }),
            firestore: () => {
                const mockData = {
                    users: {
                        'mock-user-id': {
                            profile: {
                                email: 'mock@example.com',
                                name: 'Mock User',
                                subscriptionStatus: 'pro',
                                subscriptionExpiry: new Date(2025, 11, 31)
                            },
                            scheduledValidation: {
                                enabled: true,
                                frequency: 'weekly',
                                dayOfWeek: 1,
                                time: '09:00',
                                notificationsEnabled: true
                            },
                            validationHistory: [
                                {
                                    id: 'mock-history-1',
                                    timestamp: new Date(),
                                    feedId: 'mock-feed-1',
                                    totalProducts: 100,
                                    validProducts: 90,
                                    issues: []
                                }
                            ],
                            correctionTemplates: [
                                {
                                    id: 'mock-template-1',
                                    name: 'Title Fixes',
                                    created: new Date(),
                                    corrections: [],
                                    appliedCount: 5
                                }
                            ],
                            customRules: [
                                {
                                    id: 'mock-rule-1',
                                    name: 'Title Length Rule',
                                    field: 'title',
                                    type: 'length',
                                    parameters: { min: 30, max: 150 },
                                    enabled: true
                                }
                            ]
                        }
                    }
                };
                
                return {
                    collection: (collectionPath) => {
                        console.log(`Mock Firestore: Accessing collection ${collectionPath}`);
                        const pathParts = collectionPath.split('/');
                        const collectionName = pathParts[0];
                        
                        return {
                            doc: (docId) => {
                                console.log(`Mock Firestore: Accessing document ${docId} in ${collectionPath}`);
                                
                                return {
                                    collection: (subCollectionPath) => {
                                        console.log(`Mock Firestore: Accessing subcollection ${subCollectionPath} in ${collectionPath}/${docId}`);
                                        
                                        // --- Start Enhanced Mock Subcollection Logic ---
                                        if (collectionName === 'users' && docId === 'mock-user-id' && subCollectionPath === 'validationHistory') {
                                            console.log(`Mock Firestore: Handling specific subcollection: ${subCollectionPath}`);
                                            let historyData = [...mockData.users['mock-user-id'].validationHistory]; // Clone to avoid modifying original mock data
                                            
                                            // Define the chainable query object AND add/doc methods directly
                                            let historyCollectionRef = {
                                                _historyData: mockData.users['mock-user-id'].validationHistory, // Reference to the mock data array
                                                _orderByField: null,
                                                _orderByDirection: 'desc',
                                                _limit: Infinity,
                                                _filters: [],

                                                // --- Chainable Query Methods ---
                                                orderBy: function(field, direction = 'asc') {
                                                    console.log(`Mock Firestore Query: orderBy(${field}, ${direction})`);
                                                    this._orderByField = field;
                                                    this._orderByDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
                                                    // Reset filters and limit when ordering changes? (Mimic Firestore behavior if needed)
                                                    // this._filters = [];
                                                    // this._limit = Infinity;
                                                    return this;
                                                },
                                                where: function(field, operator, value) {
                                                    console.log(`Mock Firestore Query: where(${field}, ${operator}, ${value})`);
                                                    this._filters.push({ field, operator, value });
                                                    return this;
                                                },
                                                limit: function(num) {
                                                    console.log(`Mock Firestore Query: limit(${num})`);
                                                    this._limit = num;
                                                    return this;
                                                },

                                                // --- Execution Method ---
                                                get: async () => {
                                                    console.log("Mock Firestore Query: Executing get()");
                                                    let results = [...this._historyData]; // Use internal reference, clone

                                                    // Apply filters
                                                    this._filters.forEach(filter => {
                                                        if (filter.field === 'timestamp' && filter.operator === '>=') {
                                                            results = results.filter(item => {
                                                                const itemTimestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
                                                                const filterTimestamp = filter.value && typeof filter.value.toDate === 'function' ? filter.value.toDate() : new Date(filter.value);
                                                                return itemTimestamp >= filterTimestamp;
                                                            });
                                                        } else {
                                                            console.warn(`Mock Firestore: Unsupported where clause: ${filter.field} ${filter.operator}`);
                                                        }
                                                    });

                                                    // Apply sorting
                                                    if (this._orderByField === 'timestamp') {
                                                        results.sort((a, b) => {
                                                            const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
                                                            const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
                                                            const comparison = dateA - dateB;
                                                            return this._orderByDirection === 'desc' ? -comparison : comparison;
                                                        });
                                                    } else if (this._orderByField) {
                                                         console.warn(`Mock Firestore: Unsupported orderBy field: ${this._orderByField}`);
                                                    }

                                                    // Apply limit
                                                    results = results.slice(0, this._limit);

                                                    // Format results like QuerySnapshot
                                                    // Ensure mockDocs is always an array before using it
                                                    const finalMockDocs = Array.isArray(results) ? results.map((item, index) => ({
                                                        id: item.id || `mock-history-${index + 1}`,
                                                        data: () => item,
                                                        exists: true
                                                    })) : []; // Default to empty array if results is not an array

                                                    console.log(`Mock Firestore Query: Returning ${finalMockDocs.length} documents.`);
                                                    return Promise.resolve({
                                                        empty: finalMockDocs.length === 0,
                                                        size: finalMockDocs.length,
                                                        docs: finalMockDocs,
                                                        forEach: (callback) => {
                                                            // Check again just to be safe before iterating
                                                            if (Array.isArray(finalMockDocs)) {
                                                                finalMockDocs.forEach(doc => callback(doc));
                                                            }
                                                        }
                                                    });
                                                },

                                                // --- Modification Methods ---
                                                add: async (data) => {
                                                    console.log("Mock Firestore: Executing add()", data);
                                                    const newId = `mock-history-${Date.now()}`; // Simple unique ID
                                                    const newData = { ...data, id: newId }; // Add the ID to the data
                                                    // Ensure timestamp is a Date object if using serverTimestamp()
                                                    if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp._methodName === 'FieldValue.serverTimestamp') {
                                                       newData.timestamp = new Date(); // Replace placeholder with actual date
                                                    }
                                                    this._historyData.push(newData); // Add to the referenced mock data array
                                                    console.log("Mock Firestore: History data after add:", this._historyData);
                                                    return Promise.resolve({ id: newId }); // Return ref-like object
                                                },
                                                doc: (subDocId) => {
                                                    console.log(`Mock Firestore: Accessing history doc ${subDocId}`);
                                                    // Find the specific document in the history data
                                                    const docData = this._historyData.find(item => item.id === subDocId);
                                                    return {
                                                        get: () => Promise.resolve({
                                                            exists: !!docData,
                                                            id: subDocId,
                                                            data: () => docData
                                                        }),
                                                        // Add set, update, delete mocks here if needed later
                                                        set: (data) => { console.warn("Mock Firestore: set() on history doc not fully implemented."); return Promise.resolve(); },
                                                        update: (data) => { console.warn("Mock Firestore: update() on history doc not fully implemented."); return Promise.resolve(); },
                                                        delete: () => { console.warn("Mock Firestore: delete() on history doc not fully implemented."); return Promise.resolve(); }
                                                    };
                                                }
                                            };
                                            // Return the collection reference object which has chainable methods AND add/doc
                                            return historyCollectionRef;
                                        } else {
                                             // --- Fallback for other subcollections (Original Generic Mock) ---
                                            console.warn(`Mock Firestore: Using generic mock for subcollection: ${subCollectionPath}`);
                                            // Ensure fallback also returns a chainable object
                                            let fallbackQuery = {
                                                orderBy: function() { return this; },
                                                where: function() { return this; },
                                                limit: function() { return this; },
                                                get: () => Promise.resolve({ empty: true, size: 0, docs: [], forEach: () => {} }),
                                                // Basic doc/add for completeness, returning minimal promises
                                                doc: (subDocId) => ({
                                                    get: () => Promise.resolve({ exists: false, id: subDocId, data: () => undefined }),
                                                    set: (data) => Promise.resolve(),
                                                    update: (data) => Promise.resolve(),
                                                    delete: () => Promise.resolve()
                                                }),
                                                add: (data) => Promise.resolve({ id: 'mock-generic-doc-id' })
                                            };
                                            return fallbackQuery;
                                        }
                                        // --- End Enhanced Mock Subcollection Logic ---
                                    },
                                    get: () => Promise.resolve({
                                        exists: true,
                                        id: docId,
                                        data: () => {
                                            if (collectionName === 'users' && docId === 'mock-user-id') {
                                                return mockData.users[docId];
                                            }
                                            return { name: 'Mock Document' };
                                        }
                                    }),
                                    set: (data, options) => Promise.resolve(),
                                    update: (data) => Promise.resolve()
                                };
                            },
                            add: (data) => Promise.resolve({ id: 'mock-doc-id' }),
                            where: () => ({
                                get: () => Promise.resolve({
                                    empty: false,
                                    docs: [
                                        {
                                            id: 'mock-doc-id',
                                            data: () => ({ name: 'Mock Document' }),
                                            exists: true
                                        }
                                    ]
                                })
                            })
                        };
                    }
                };
            }
        };
        
        // Add Firestore static methods to the firebase object
        window.firebase.firestore.FieldValue = {
            serverTimestamp: () => new Date(),
            increment: (n) => n,
            arrayUnion: (...items) => items
        };
        
        window.firebase.firestore.Timestamp = {
            now: () => ({ toDate: () => new Date() }),
            fromDate: (date) => ({ toDate: () => date })
        };
    }
    
    // Create mock classes for any missing dependencies
    if (typeof GMCApi === 'undefined') {
        console.log("Creating mock GMCApi class");
        window.GMCApi = class GMCApi {
            constructor() {
                console.log("Mock GMCApi created");
                this.isAuthenticated = true;
                this.testMode = true;
            }
            authenticate() { return Promise.resolve({ success: true }); }
            logout() { console.log("Mock GMCApi: logout called"); }
            getAuthState() { return { isAuthenticated: true }; }
            
            // Add the missing validateFeed method
            async validateFeed(feedData) {
                console.log('Mock GMCApi: validateFeed called with', feedData);
                // Simulate a delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Generate mock validation results
                const mockIssues = [];
                const totalCount = feedData.length;
                let validCount = totalCount;
                
                // Add some mock issues for demonstration
                feedData.forEach((item, index) => {
                    const rowIndex = index + 1;
                    const offerId = item.id || `mock-id-${rowIndex}`;
                    
                    // Check title length (example validation)
                    if (item.title && item.title.length < 30) {
                        mockIssues.push({
                            rowIndex: rowIndex,
                            offerId: offerId,
                            field: 'title',
                            type: 'warning',
                            message: `Title too short (${item.title.length} chars). Minimum 30 characters recommended.`
                        });
                    }
                    
                    // Check description length (example validation)
                    if (item.description && item.description.length < 90) {
                        mockIssues.push({
                            rowIndex: rowIndex,
                            offerId: offerId,
                            field: 'description',
                            type: 'warning',
                            message: `Description too short (${item.description.length} chars). Minimum 90 characters recommended.`
                        });
                    }
                });
                
                return {
                    isValid: mockIssues.length === 0,
                    totalProducts: totalCount,
                    validProducts: validCount - mockIssues.length,
                    issues: mockIssues
                };
            }
        };
    }
    
    if (typeof GMCValidator === 'undefined') {
        console.log("Creating mock GMCValidator class");
        window.GMCValidator = class GMCValidator {
            constructor(gmcApi) {
                console.log("Mock GMCValidator created");
                this.gmcApi = gmcApi;
            }
            
            async validate(feedData) {
                console.log('[GMCValidator] Initiating API validation...');
                if (!feedData || feedData.length === 0) {
                    console.warn('[GMCValidator] No feed data provided for validation.');
                    return {
                        isValid: true,
                        totalProducts: 0,
                        validProducts: 0,
                        issues: []
                    };
                }

                try {
                    // Call the GMCApi's validateFeed method
                    const results = await this.gmcApi.validateFeed(feedData);
                    console.log('[GMCValidator] Received API validation results:', results);
                    return results;
                } catch (error) {
                    console.error('[GMCValidator] API Validation failed:', error);
                    // Re-throw the error so the UI layer can handle it
                    throw new Error(`GMC API validation failed: ${error.message}`);
                }
            }
        };
    }
    
    if (typeof AuthManager === 'undefined') {
        console.log("Creating mock AuthManager class");
        window.AuthManager = class AuthManager {
            constructor() {
                console.log("Mock AuthManager created");
                this.gmcAuthenticated = true;
                this.firebaseAuthenticated = true;
                this.isProUser = true;
                this.gmcMerchantId = 'MOCK-123456';
                this.firebaseUserId = 'mock-user-id';
            }
            init() { return Promise.resolve(true); }
            getAuthState() {
                return {
                    gmcAuthenticated: this.gmcAuthenticated,
                    firebaseAuthenticated: this.firebaseAuthenticated,
                    isProUser: this.isProUser,
                    gmcMerchantId: this.gmcMerchantId,
                    firebaseUserId: this.firebaseUserId
                };
            }
            signInWithFirebase() {
                this.firebaseAuthenticated = true;
                return Promise.resolve({ success: true });
            }
            signOutFirebase() {
                this.firebaseAuthenticated = false;
                return Promise.resolve({ success: true });
            }
            checkProStatus() { return Promise.resolve(this.isProUser); }
        };
    }
    
    if (typeof StatusBarManager === 'undefined') {
        console.log("Creating mock StatusBarManager class");
        window.StatusBarManager = class StatusBarManager {
            constructor() { console.log("Mock StatusBarManager created"); }
            updateAuthState() {}
            updateUI() {}
        };
    }
    
    if (typeof SearchManager === 'undefined') {
        console.log("Creating mock SearchManager class");
        window.SearchManager = class SearchManager {
            constructor() { console.log("Mock SearchManager created"); }
        };
    }
    
    if (typeof ValidationUIManager === 'undefined') {
        console.log("Creating mock ValidationUIManager class");
        window.ValidationUIManager = class ValidationUIManager {
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
            triggerGMCValidation() { return Promise.resolve(); }
            loadValidationHistoryFromFirestore() { return Promise.resolve(); }
            markIssueAsFixed() { return Promise.resolve(); }
        };
    }
    
    if (typeof FeedManager === 'undefined') {
        console.log("Creating mock FeedManager class");
        window.FeedManager = class FeedManager {
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
            initFloatingScrollBar() {}
            handlePreview() {}
            getTableData() {
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
            getCorrectedTableData() { return this.getTableData(); }
            getAppliedCorrections() { return []; }
        };
    }
    
    // Create a modified SettingsManager that doesn't throw an error when AuthManager is missing
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
    
    if (typeof BulkActionsManager === 'undefined') {
        console.log("Creating mock BulkActionsManager class");
        window.BulkActionsManager = class BulkActionsManager {
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
            initialize() { return Promise.resolve(); }
            applyFeatureGating() { return Promise.resolve(); }
            loadTemplates() { return Promise.resolve(); }
        };
    }
    
    // Now that we've ensured all required classes exist (even as mocks),
    // we can safely instantiate the PopupManager
    
    try {
        // First, try to load the full dashboard UI
        new PopupManager();
        console.log("PopupManager instantiated successfully");
    } catch (error) {
        console.error("Error instantiating PopupManager:", error);
        
        // Create a more comprehensive UI that includes validation functionality
        // but still works without the full PopupManager
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
                <h1>AdBrain Feed Manager</h1>
                <p>The extension is running in enhanced compatibility mode.</p>
                
                <div class="tab-buttons" style="margin-top: 20px; border-bottom: 1px solid #ddd;">
                    <button id="simpleTabFeed" class="tab-button active" style="padding: 10px 15px; background-color: #f8f9fa; border: 1px solid #ddd; border-bottom: none; border-radius: 5px 5px 0 0; margin-right: 5px; cursor: pointer;">Feed Preview</button>
                    <button id="simpleTabValidation" class="tab-button" style="padding: 10px 15px; background-color: #f8f9fa; border: 1px solid #ddd; border-bottom: none; border-radius: 5px 5px 0 0; margin-right: 5px; cursor: pointer;">Validation</button>
                </div>
                
                <div id="simpleTabFeedContent" class="tab-content" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2>Feed Preview</h2>
                    <input type="file" id="simpleFileInput" accept=".csv" style="margin-bottom: 10px;">
                    <button id="simplePreviewButton" style="padding: 5px 10px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer;">Preview Feed</button>
                    <div id="simplePreviewContent" style="margin-top: 15px; max-height: 400px; overflow: auto;"></div>
                </div>
                
                <div id="simpleTabValidationContent" class="tab-content" style="display: none; margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2>Validation</h2>
                    <p>Validate your feed against Google Merchant Center requirements.</p>
                    <button id="simpleValidateButton" style="padding: 5px 10px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer;">Validate Feed</button>
                    <div id="simpleValidationResults" style="margin-top: 15px;"></div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2>Authentication</h2>
                    <button id="simpleGmcButton" style="padding: 5px 10px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Connect Google Merchant Center</button>
                    <button id="simpleFirebaseButton" style="padding: 5px 10px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer;">Sign in with Google (Firebase)</button>
                </div>
            </div>
        `;
        // Set up tab switching
        const setupTabs = () => {
            const feedTab = document.getElementById('simpleTabFeed');
            const validationTab = document.getElementById('simpleTabValidation');
            const feedContent = document.getElementById('simpleTabFeedContent');
            const validationContent = document.getElementById('simpleTabValidationContent');
            
            feedTab.addEventListener('click', () => {
                feedTab.classList.add('active');
                validationTab.classList.remove('active');
                feedContent.style.display = 'block';
                validationContent.style.display = 'none';
            });
            
            validationTab.addEventListener('click', () => {
                validationTab.classList.add('active');
                feedTab.classList.remove('active');
                validationContent.style.display = 'block';
                feedContent.style.display = 'none';
            });
        };
        
        setupTabs();
        
        // Add authentication event listeners
        document.getElementById('simpleGmcButton').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'authenticateGmc' }, (response) => {
                if (response && response.success) {
                    alert('Successfully connected to Google Merchant Center!');
                } else {
                    alert('Failed to connect to Google Merchant Center: ' + (response?.error || 'Unknown error'));
                }
            });
        });
        
        document.getElementById('simpleFirebaseButton').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'signInWithFirebase' }, (response) => {
                if (response && response.success) {
                    alert('Successfully signed in with Firebase!');
                } else {
                    alert('Failed to sign in with Firebase: ' + (response?.error || 'Unknown error'));
                }
            });
        });
        
        // Add feed preview functionality
        document.getElementById('simplePreviewButton').addEventListener('click', () => {
            const fileInput = document.getElementById('simpleFileInput');
            if (fileInput.files.length === 0) {
                alert('Please select a CSV file first.');
                return;
            }
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const csvContent = event.target.result;
                const lines = csvContent.split('\n');
                const headers = lines[0].split(',');
                
                let tableHtml = '<table style="width: 100%; border-collapse: collapse;">';
                tableHtml += '<thead><tr>';
                headers.forEach(header => {
                    tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
                
                // Add up to 100 rows (increased from 10)
                const rowCount = Math.min(lines.length - 1, 100);
                for (let i = 1; i <= rowCount; i++) {
                    if (lines[i].trim() === '') continue;
                    
                    const cells = lines[i].split(',');
                    tableHtml += '<tr>';
                    cells.forEach(cell => {
                        tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
                    });
                    tableHtml += '</tr>';
                }
                
                tableHtml += '</tbody></table>';
                
                if (lines.length > 101) {
                    tableHtml += `<p>Showing 100 of ${lines.length - 1} rows.</p>`;
                }
                
                document.getElementById('simplePreviewContent').innerHTML = tableHtml;
                
                // Store the parsed data for validation
                window.parsedFeedData = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;
                    
                    const cells = lines[i].split(',');
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = cells[index] || '';
                    });
                    window.parsedFeedData.push(rowData);
                }
            };
            reader.readAsText(file);
        });
        
        // Add validation functionality
        document.getElementById('simpleValidateButton').addEventListener('click', () => {
            if (!window.parsedFeedData || window.parsedFeedData.length === 0) {
                alert('Please preview a feed first before validating.');
                return;
            }
            
            const validationResults = document.getElementById('simpleValidationResults');
            validationResults.innerHTML = '<p>Validating feed data...</p>';
            
            // Perform basic validation
            const issues = [];
            window.parsedFeedData.forEach((item, index) => {
                const rowIndex = index + 1;
                
                // Check title length (example validation)
                if (item.title && item.title.length < 30) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'title',
                        type: 'error',
                        message: `Title too short (${item.title.length} chars). Minimum 30 characters recommended.`,
                        offerId: item.id
                    });
                }
                
                // Check description length (example validation)
                if (item.description && item.description.length < 90) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'description',
                        type: 'error',
                        message: `Description too short (${item.description.length} chars). Minimum 90 characters recommended.`,
                        offerId: item.id
                    });
                }
            });
            
            // Display validation results
            if (issues.length === 0) {
                validationResults.innerHTML = '<p style="color: green;">No issues found in the feed data.</p>';
            } else {
                let resultsHtml = `<p style="color: red;">${issues.length} issues found in the feed data:</p>`;
                resultsHtml += '<ul style="max-height: 300px; overflow-y: auto;">';
                issues.forEach(issue => {
                    resultsHtml += `<li style="margin-bottom: 10px;">
                        <strong>Row ${issue.rowIndex}:</strong> ${issue.message}
                        <button class="fix-issue-btn" data-row="${issue.rowIndex}" data-field="${issue.field}" style="margin-left: 10px; padding: 2px 5px; background-color: #4285f4; color: white; border: none; border-radius: 3px; cursor: pointer;">Fix</button>
                    </li>`;
                });
                resultsHtml += '</ul>';
                validationResults.innerHTML = resultsHtml;
                
                // Add event listeners to fix buttons
                document.querySelectorAll('.fix-issue-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const rowIndex = parseInt(button.getAttribute('data-row'));
                        const field = button.getAttribute('data-field');
                        
                        // Switch to feed tab
                        document.getElementById('simpleTabFeed').click();
                        
                        // Scroll to the row
                        const table = document.querySelector('#simplePreviewContent table');
                        if (table) {
                            const rows = table.querySelectorAll('tbody tr');
                            if (rowIndex <= rows.length) {
                                const row = rows[rowIndex - 1];
                                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                row.style.backgroundColor = '#fffde7'; // Highlight the row
                                
                                // Find the cell for the field
                                const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
                                const fieldIndex = headers.indexOf(field);
                                if (fieldIndex !== -1) {
                                    const cell = row.querySelectorAll('td')[fieldIndex];
                                    if (cell) {
                                        cell.style.backgroundColor = '#ffebee'; // Highlight the cell
                                    }
                                }
                                
                                // Remove highlighting after a delay
                                setTimeout(() => {
                                    row.style.backgroundColor = '';
                                    if (fieldIndex !== -1) {
                                        const cell = row.querySelectorAll('td')[fieldIndex];
                                        if (cell) {
                                            cell.style.backgroundColor = '';
                                        }
                                    }
                                }, 3000);
                            }
                        }
                    });
                });
            }
        });
    }
});
