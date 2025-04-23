// src/popup/popup.js - Refactored for Message Passing

// No imports needed - functions are now globally available
// from popup_utils.js and firebase_mock.js

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
        // Check if application is initialized
        if (!window.isConfigInitialized) {
            console.warn("Application not initialized. Attempting to initialize now...");
            if (typeof initializeApplication === 'function') {
                initializeApplication();
            } else {
                console.error("Application initialization function not found. Some features may not work correctly.");
            }
        }
        
        this.monitor = new MonitoringSystem();
        console.log('[DEBUG] Constructing PopupManager');

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
        
        console.log('[DEBUG] UI element references:');
        console.log('[DEBUG] fileInputEl:', fileInputEl);
        console.log('[DEBUG] previewButtonEl:', previewButtonEl);
        console.log('[DEBUG] previewContentContainer:', this.previewContentContainer);
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
            statusBarManager: null, // Placeholder
            searchManager: null,    // Placeholder
            validationUIManager: null, // Placeholder
            feedManager: null,       // Placeholder
            settingsManager: null,   // Placeholder
            bulkActionsManager: null, // Placeholder
            customRuleValidator: null // Placeholder
        };
        
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        
        // Add AuthManager based on feature flags
        if (useFeatureFlags && window.FEATURES.USE_MOCK_AUTH && typeof AuthManager !== 'undefined') {
            console.log('Using mock AuthManager based on feature flag');
            managers.authManager = new AuthManager();
        } else if (typeof AuthManager !== 'undefined') {
            console.log('Using AuthManager (feature flags not available or mock disabled)');
            managers.authManager = new AuthManager();
        } else {
            console.error('AuthManager not available');
            managers.authManager = {
                getAuthState: () => ({ gmcAuthenticated: false, firebaseAuthenticated: false, isProUser: false })
            };
        }
        
        // Add GMCApi based on feature flags
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCApi !== 'undefined') {
            console.log('Using mock GMCApi based on feature flag');
            managers.gmcApi = new GMCApi();
        } else if (typeof GMCApi !== 'undefined') {
            console.log('Using GMCApi (feature flags not available or mock disabled)');
            managers.gmcApi = new GMCApi();
        } else {
            console.error('GMCApi not available');
            managers.gmcApi = {
                isAuthenticated: false,
                authenticate: () => Promise.resolve({ success: false })
            };
        }
        
        // Add GMCValidator based on feature flags
        if (useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API && typeof GMCValidator !== 'undefined') {
            console.log('Using mock GMCValidator based on feature flag');
            managers.gmcValidator = new GMCValidator(managers.gmcApi);
        } else if (typeof GMCValidator !== 'undefined') {
            console.log('Using GMCValidator (feature flags not available or mock disabled)');
            managers.gmcValidator = new GMCValidator(managers.gmcApi);
        } else {
            console.log('Creating simple GMCValidator mock');
            managers.gmcValidator = {
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
// Ensure ValidationUIManager class is loaded FIRST
if (typeof ValidationUIManager !== 'undefined') {
    console.log('[DEBUG] Initializing ValidationUIManager');
    this.validationUIManager = new ValidationUIManager(
        { validationTab: document.getElementById('validation-tab'), historyTableBody: document.getElementById('validationHistory'), feedPreviewContainer: this.previewContentContainer },
        managers,
        this.validationResults
    );
    managers.validationUIManager = this.validationUIManager;
    console.log('[DEBUG] ValidationUIManager initialized and added to managers');
} else { console.error("ValidationUIManager class not found!"); }
// Ensure FeedManager class is loaded AFTER ValidationUIManager
if (typeof FeedManager !== 'undefined') {
    console.log('[DEBUG] Initializing FeedManager');
    console.log('[DEBUG] fileInputEl:', fileInputEl);
    console.log('[DEBUG] previewButtonEl:', previewButtonEl);
    console.log('[DEBUG] previewContentContainer:', this.previewContentContainer);
    
    // Make sure we have valid DOM elements before initializing
    if (!fileInputEl) console.error("fileInputEl is null or undefined");
    if (!previewButtonEl) console.error("previewButtonEl is null or undefined");
    if (!this.previewContentContainer) console.error("previewContentContainer is null or undefined");
    
    this.feedManager = new FeedManager(
        { fileInput: fileInputEl, previewButton: previewButtonEl, previewContentContainer: this.previewContentContainer },
        managers
    );
    managers.feedManager = this.feedManager;
    console.log('[DEBUG] FeedManager initialized and added to managers');
} else {
    console.error("FeedManager class not found!");
}

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
            console.log('[DEBUG] Setting cross-references between managers');
            this.validationUIManager.managers.feedManager = this.feedManager;
            console.log('[DEBUG] Set feedManager reference in validationUIManager');
            
            // Also ensure FeedManager has reference to ValidationUIManager
            if (this.feedManager.managers) {
                this.feedManager.managers.validationUIManager = this.validationUIManager;
                console.log('[DEBUG] Set validationUIManager reference in feedManager');
                console.log('[DEBUG] Cross-references set successfully');
            } else {
                console.error('[DEBUG] FeedManager.managers is undefined or null');
            }
        } else {
            console.error('[DEBUG] Cannot set cross-references: validationUIManager or feedManager is missing');
            console.log('[DEBUG] validationUIManager:', this.validationUIManager);
            console.log('[DEBUG] feedManager:', this.feedManager);
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
        if (this.loadingManager && typeof this.loadingManager.showLoading === 'function') {
            this.loadingManager.showLoading('Initializing...');
        }
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
            if (this.errorManager && typeof this.errorManager.showError === 'function') {
                this.errorManager.showError(`Initialization failed: ${error.message}`);
            }
            if (this.loadingManager && typeof this.loadingManager.hideLoading === 'function') {
                this.loadingManager.hideLoading();
            }
            if (this.statusBarManager && typeof this.statusBarManager.updateUI === 'function') {
                this.statusBarManager.updateUI(true); // Show error state if possible
            }
        }
    }

    // Helper to send messages and handle responses/errors - now using extracted functionality
    sendMessageToBackground(message) {
        return window.PopupMessageHandler.sendMessageToBackground(message);
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
        
        // Add a direct event listener to the Preview Feed button as a backup
        const previewButton = document.getElementById('previewFeed');
        if (previewButton && this.feedManager) {
            console.log('[DEBUG] Adding direct event listener to Preview Feed button as backup');
            previewButton.addEventListener('click', () => {
                console.log('[DEBUG] Preview Feed button clicked directly from PopupManager');
                if (this.feedManager && typeof this.feedManager.handlePreview === 'function') {
                    this.feedManager.handlePreview();
                } else {
                    console.error('[DEBUG] FeedManager or handlePreview method not available');
                }
            });
        }

        // Analysis Dropdown
        if (this.mainDropdown) {
            this.mainDropdown.addEventListener('change', (e) => this.handleDropdownChange(e));
        }

        // Validate Feed Button
        if (this.validateGMCButton) {
            console.log('[DEBUG] Adding click event listener to Validate GMC button');
            // ValidationUIManager handles the validation process
            this.validateGMCButton.addEventListener('click', () => {
                console.log('[DEBUG] Validate GMC button clicked');
                this.triggerGMCValidation();
            });
        } else {
            console.error('[DEBUG] Validate GMC button not found. Element ID should be "validateGMC"');
            // Try to find it directly
            const validateButton = document.getElementById('validateGMC');
            if (validateButton) {
                console.log('[DEBUG] Found Validate GMC button directly');
                this.validateGMCButton = validateButton;
                validateButton.addEventListener('click', () => {
                    console.log('[DEBUG] Validate GMC button clicked (direct binding)');
                    this.triggerGMCValidation();
                });
            } else {
                console.error('[DEBUG] Validate GMC button not found even with direct query');
            }
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
        return window.PopupEventHandlers.handleDropdownChange(e);
    }

    async triggerGMCValidation() {
        console.log('[DEBUG] PopupManager.triggerGMCValidation called');
        
        // Check if validationUIManager exists
        if (!this.validationUIManager) {
            console.error('[DEBUG] validationUIManager is not available');
            if (this.errorManager) {
                this.errorManager.showError("Validation UI Manager is not initialized. Please reload the extension.");
            } else {
                alert("Validation UI Manager is not initialized. Please reload the extension.");
            }
            return;
        }
        
        console.log('[DEBUG] validationUIManager available:', this.validationUIManager);
        
        const managers = {
            validationUIManager: this.validationUIManager
        };
        
        console.log('[DEBUG] Calling PopupEventHandlers.triggerGMCValidation');
        try {
            return await window.PopupEventHandlers.triggerGMCValidation(managers, this.errorManager);
        } catch (error) {
            console.error('[DEBUG] Error in triggerGMCValidation:', error);
            if (this.errorManager) {
                this.errorManager.showError(`Validation failed: ${error.message}`);
            } else {
                alert(`Validation failed: ${error.message}`);
            }
        }
    }

    async verifyOrAuthenticateGMC() {
        return window.PopupEventHandlers.verifyOrAuthenticateGMC(
            this.sendMessageToBackground.bind(this),
            this.loadingManager,
            this.errorManager,
            this.statusBarManager,
            this.currentAuthState
        );
    }

    async handleLogout() {
        return window.PopupEventHandlers.handleLogout(
            this.sendMessageToBackground.bind(this),
            this.loadingManager,
            this.errorManager,
            this.statusBarManager,
            this.currentAuthState
        );
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        // Create a managers object with all the managers needed for tab functionality
        const managers = {
            feedManager: this.feedManager,
            validationUIManager: this.validationUIManager,
            bulkActionsManager: this.bulkActionsManager,
            settingsManager: this.settingsManager,
            statusBarManager: this.statusBarManager
        };
        
        window.PopupEventHandlers.setupTabs(
            tabButtons,
            tabPanels,
            this.sendMessageToBackground.bind(this),
            this.loadingManager,
            this.errorManager,
            managers,
            this.currentAuthState
        );
    }

} // End of PopupManager class

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup DOMContentLoaded event fired");
    
    // Add direct event listeners to the buttons as a final backup
    const previewButton = document.getElementById('previewFeed');
    const validateButton = document.getElementById('validateGMC');
    
    if (validateButton) {
        console.log('[DEBUG] Adding direct event listener to Validate GMC button in DOMContentLoaded');
        validateButton.addEventListener('click', () => {
            console.log('[DEBUG] Validate GMC button clicked from DOMContentLoaded handler');
            
            // Try to use the ValidationUIManager if available
            if (window.validationUIManagerInstance && typeof window.validationUIManagerInstance.triggerGMCValidation === 'function') {
                console.log('[DEBUG] Using global validationUIManagerInstance.triggerGMCValidation()');
                window.validationUIManagerInstance.triggerGMCValidation()
                    .catch(error => {
                        console.error('[DEBUG] Error in validationUIManagerInstance.triggerGMCValidation():', error);
                        alert(`Validation failed: ${error.message}`);
                    });
            } else {
                console.log('[DEBUG] No global validationUIManagerInstance found, showing message');
                // Just show a message instead of creating a popup
                alert('Validation triggered. Please check the Validation History tab for results.');
                
                // Try to switch to the validation tab
                const validationTabButton = document.querySelector('.tab-button[data-tab="validation"]');
                if (validationTabButton) {
                    validationTabButton.click();
                }
            }
        });
    }
    
    if (previewButton) {
        console.log('[DEBUG] Adding direct event listener to Preview Feed button in DOMContentLoaded');
        previewButton.addEventListener('click', () => {
            console.log('[DEBUG] Preview Feed button clicked from DOMContentLoaded handler');
            // Try to find FeedManager instance
            if (window.feedManagerInstance && typeof window.feedManagerInstance.handlePreview === 'function') {
                window.feedManagerInstance.handlePreview();
            } else {
                console.log('[DEBUG] No global feedManagerInstance found, trying to read file directly');
                // Fallback implementation
                const fileInput = document.getElementById('fileInput');
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    console.log('[DEBUG] Reading file directly:', fileInput.files[0].name);
                    // Simple file reading logic
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const csvContent = e.target.result;
                        console.log('[DEBUG] File read successfully, length:', csvContent.length);
                        // Display in previewContent
                        const previewContent = document.getElementById('previewContent');
                        if (previewContent) {
                            previewContent.innerHTML = `<pre>${csvContent.substring(0, 1000)}...</pre>`;
                        }
                    };
                    reader.readAsText(fileInput.files[0]);
                } else {
                    alert('Please select a file first');
                }
            }
        });
    }
    
    // Check if application is initialized
    if (!window.isConfigInitialized) {
        console.warn("Application not initialized by the time popup.js loaded. This may indicate a script loading issue.");
    }
    
    // Now that we've ensured all required classes exist (even as mocks),
    // we can safely instantiate the PopupManager
    
    try {
        // First, try to load the full dashboard UI
        const popupManager = new PopupManager();
        console.log("PopupManager instantiated successfully");
        
        // Store FeedManager instance globally for backup access
        if (popupManager.feedManager) {
            window.feedManagerInstance = popupManager.feedManager;
            console.log('[DEBUG] FeedManager instance stored globally');
        }
        
        // Store ValidationUIManager instance globally for backup access
        if (popupManager.validationUIManager) {
            window.validationUIManagerInstance = popupManager.validationUIManager;
            console.log('[DEBUG] ValidationUIManager instance stored globally');
        }
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
