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
    const minRequired = isDescription ? 90 : 25;

    countDisplay.textContent = `${charCount}/${maxLength}`;

    // Color the count red if under minimum
    if (charCount < minRequired) {
        countDisplay.style.color = '#dc3545'; // Red
    } else if (charCount > maxLength) {
        countDisplay.style.color = '#dc3545'; // Red
    } else {
        countDisplay.style.color = '#28a745'; // Green
    }
};

class MonitoringSystem {
    constructor() {
        this.currentVersion = '1.0.0';
        this.startTime = new Date();

        // Initialize storage for metrics
        this.metrics = {
            operations: [],
            errors: [],
            featureUsage: {}
        };
    }

    logOperation(operation, status, details = {}) {
        const entry = {
            timestamp: new Date(),
            operation,
            status,
            details,
            version: this.currentVersion
        };

        console.log(`[Monitor] ${operation}:`, status);
        this.metrics.operations.push(entry);

        // Track feature usage
        this.metrics.featureUsage[operation] =
            (this.metrics.featureUsage[operation] || 0) + 1;
    }

    logError(error, context) {
        const entry = {
            timestamp: new Date(),
            context,
            error: error.message,
            stack: error.stack,
            version: this.currentVersion
        };

        console.error(`[Monitor] Error in ${context}:`, error);
        this.metrics.errors.push(entry);
    }
}

class PopupManager {
    constructor() {
        // Add monitoring system
        this.monitor = new MonitoringSystem();

        console.log('Constructing PopupManager'); // Changed log message

        // Initialize managers with monitoring
        // For now, use basic placeholders if classes aren't defined/loaded
        this.tableManager = { initialize: () => console.log('TableManager placeholder init') };
        this.loadingManager = { showLoading: (msg) => console.log('Loading:', msg), hideLoading: () => console.log('Hide Loading') };
        this.errorManager = { showError: (msg) => alert(`Error: ${msg}`), showSuccess: (msg) => alert(`Success: ${msg}`) };

        this.gmcApi = new GMCApi(); // Instantiate GMCApi
        this.gmcValidator = new GMCValidator(this.gmcApi);
        this.feedAnalyzer = { analyzeFeed: (data) => { console.log('FeedAnalyzer placeholder analyze'); return { issues: [], totalProducts: data.length }; } };

        // Initialize validation results storage
        this.validationResults = {};
        this.activeValidationPanel = null; // Track the floating panel

        // --- Get UI element references ---
        const fileInputEl = document.getElementById('fileInput');
        const previewButtonEl = document.getElementById('previewFeed');
        this.previewContentContainer = document.getElementById('previewContent');
        this.exportButton = document.getElementById('exportFeed');
        this.verifyGMCButton = document.getElementById('verifyGMCConnection');
        this.validateGMCButton = document.getElementById('validateGMC');
        this.logoutButton = document.getElementById('logoutButton');
        this.mainDropdown = document.getElementById('analysisDropdown');
        const searchInputEl = document.getElementById('searchInput');
        const searchColumnSelectEl = document.getElementById('searchColumn');
        const searchTypeSelectEl = document.getElementById('searchType');
        const clearSearchBtnEl = document.getElementById('clearSearchBtn');
        const searchStatusEl = document.querySelector('.search-status');

        // --- Instantiate Managers ---

        // Instantiate managers that don't depend on the shared 'managers' object first
        this.statusBarManager = new StatusBarManager(
            this.gmcApi, // Direct dependency
            this.verifyGMCButton,
            this.validateGMCButton,
            this.logoutButton
        );

        this.searchManager = new SearchManager(
            { // Elements
                searchInput: searchInputEl,
                searchColumnSelect: searchColumnSelectEl,
                searchTypeSelect: searchTypeSelectEl,
                clearSearchBtn: clearSearchBtnEl,
                tableContainer: this.previewContentContainer,
                statusElement: searchStatusEl
            }
        );

        // Create a shared managers object including already instantiated managers
        const managers = {
            loadingManager: this.loadingManager,
            errorManager: this.errorManager,
            monitor: this.monitor,
            gmcApi: this.gmcApi,
            gmcValidator: this.gmcValidator,
            statusBarManager: this.statusBarManager, // Include instance
            searchManager: this.searchManager,     // Include instance
            // Placeholders for managers created below
            validationUIManager: null,
            feedManager: null
        };

        // Instantiate remaining managers, passing the shared 'managers' object
        this.validationUIManager = new ValidationUIManager(
            { // Elements
                validationTab: document.getElementById('validation-tab'),
                historyTableBody: document.getElementById('validationHistory'),
                feedPreviewContainer: this.previewContentContainer
            },
            managers, // Pass the shared managers object (feedManager is null here)
            this.validationResults
        );

        this.feedManager = new FeedManager(
            { // Elements
                fileInput: fileInputEl,
                previewButton: previewButtonEl,
                previewContentContainer: this.previewContentContainer
            },
            managers // Pass the shared managers object (validationUIManager is null here)
        );

        // --- Set Cross-References AFTER Instantiation ---
        // Now explicitly set the references on the instances' internal managers object
        managers.validationUIManager = this.validationUIManager;
        managers.feedManager = this.feedManager;
        // Ensure each manager's internal 'managers' object has the references it needs
        this.validationUIManager.managers.feedManager = this.feedManager; // Give VUIManager a ref to FeedManager
        // FeedManager already received the 'managers' object which now includes validationUIManager

        // Start async initialization
        this.initializePopup();
    }

    /**
     * Asynchronously initializes the popup, including API and UI setup.
     */
    async initializePopup() {
        console.log('Initializing Popup asynchronously...');
        this.loadingManager.showLoading('Initializing...');
        try {
            // Initialize GMCApi to load stored credentials
            await this.gmcApi.initialize();
            console.log('GMCApi initialized. Authenticated:', this.gmcApi.isAuthenticated);

            // Setup UI elements that might depend on auth state
            this.setupElements();
            // StatusBarManager constructor already called setupStatusBar()
            this.statusBarManager.updateUI(); // Update status bar content based on auth state

            // Setup remaining UI components and listeners
            this.tableManager.initialize();
            // this.setupScrollSync(); // Removed - Functionality moved or obsolete
            this.setupTabs(); // Call tab setup logic
            // this.initializeSearch(); // Removed - Functionality moved to SearchManager
            this.setupEventListeners(); // Setup listeners after elements are ready

            this.loadingManager.hideLoading();
            console.log('Popup initialization complete.');

        } catch (error) {
            console.error('Popup initialization failed:', error);
            this.errorManager.showError(`Initialization failed: ${error.message}`);
            this.loadingManager.hideLoading();
            // Update status bar to show error state
            this.statusBarManager.updateUI(true); // Use manager
        }
    }

    // Removed old initialize() method

    setupElements() {
        console.log('Setting up elements');

        this.dataContainer = document.querySelector('.data-container');

        // Checks for fileInput, previewButton, mainDropdown removed - Handled by respective managers
        if (!this.exportButton) console.error('Export button not found');
        if (!this.dataContainer) console.error('Data container not found');
        // Note: verifyGMCButton, validateGMCButton, logoutButton are handled by StatusBarManager
        // Note: searchInput, searchColumn, searchType, clearSearchBtn are handled by SearchManager
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        // File Input & Preview Button listeners removed - handled by FeedManager

        // Export Button listener explicitly removed
        // if (this.exportButton) {
        //     this.exportButton.addEventListener('click', () => this.handleExport()); // This line caused the error
        // }

        // Analysis Dropdown (if exists)
        if (this.mainDropdown) {
            // Removed redundant inner if check
            this.mainDropdown.addEventListener('change', (e) => this.handleDropdownChange(e));
        } // Closing brace for the mainDropdown check

        // Verify GMC Connection Button listener removed - Handled by StatusBarManager
        // if (this.verifyGMCButton) { ... }

        // Validate Feed Button
        if (this.validateGMCButton) {
            // Call the new handler which delegates to ValidationUIManager
            this.validateGMCButton.addEventListener('click', () => this.triggerGMCValidation());
        } else {
            console.warn('Validate GMC button not found.');
        }

        // Logout Button listener removed - Handled by StatusBarManager
        // if (this.logoutButton) { ... }
    } // ADDED MISSING CLOSING BRACE for setupEventListeners method

    // Removed duplicated listener blocks that were here

    // handlePreview method removed - logic moved to FeedManager
    // readFileAsText method removed (lines 254-279) - logic moved to FeedManager
    // parseCSV method removed (lines 281-315) - logic moved to FeedManager
    // displayPreview method removed (lines 317-365) - logic moved to FeedManager
    // handleExport method removed (lines 660-700) - logic moved to FeedManager
    // getFeedDataFromTable method removed (lines 702-735) - logic moved to FeedManager
    // sanitizeText helper removed (lines 918-934) - logic moved to FeedManager
    // createEditableCell method removed (lines 936-982) - logic moved to FeedManager

    handleDropdownChange(e) {
        const selectedValue = e.target.value;

        if (selectedValue === 'analyze-feed') {
                this.analyzeFeed();
        }
    }

    // analyzeFeed method removed (lines 269-408) - Logic moved/obsolete
    // displayAnalysisReport method removed (lines 410-490) - Logic moved to ValidationUIManager
    // generateIssuesList method removed (lines 492-526) - Logic moved to ValidationUIManager
    // setupAnalysisInteractivity method removed (lines 528-545) - Logic moved to ValidationUIManager
    // scrollToTableRow method removed (lines 547-568) - Logic moved to ValidationUIManager

    // Old verifyOrAuthenticateGMC method removed (lines 740-776)
    // Old handleLogout method removed (lines 781-797)
    // Old updateStatusBarUI method removed (lines 803-839)

    // --- Existing methods continue below ---
    // showValidationProgress method removed (lines 560-575) - logic moved to ValidationUIManager
    // validateWithGMC method removed (lines 577-637) - logic moved to ValidationUIManager
    // showValidationResults method removed (lines 639-684) - logic moved to ValidationUIManager
    // formatValidationIssues method removed (lines 686-718) - logic moved to ValidationUIManager
    // checkErrors method removed (lines 721-723) - Pro feature placeholder
    // viewSummary method removed (lines 725-727) - Pro feature placeholder
    // debounce helper removed (lines 730-733) - Should be global or imported
    // setupScrollSync method removed (lines 734-791) - Should be handled by specific UI component if needed
    // updateStatus method removed (lines 795-807) - Should be handled by StatusBarManager or ErrorManager
    // setupTabs method removed (lines 809-831) - Should be handled by a dedicated TabManager or similar
    // handleViewDetails method removed (lines 833-849) - logic moved to ValidationUIManager
    // showFeedPreview method removed (lines 851-860) - Should be handled by FeedManager/TabManager
    // setupRowNavigation method removed (lines 862-872) - logic moved to ValidationUIManager
    // navigateToRow method removed (lines 874-899) - logic moved to ValidationUIManager
    // monitorFieldChanges method removed (lines 901-943) - logic moved to ValidationUIManager
    // handleFieldEdit method removed (lines 945-969) - logic moved to ValidationUIManager
    // validateFieldContent method removed (lines 971-978) - logic moved to ValidationUIManager
    // createValidationDetails method removed (lines 980-1035) - logic moved to ValidationUIManager
    // groupIssuesByRow helper removed (lines 1038-1047) - logic moved to ValidationUIManager
    // countIssuesByType helper removed (lines 1049-1059) - logic moved to ValidationUIManager
    // countRowsWithBothIssues helper removed (lines 1061-1066) - logic moved to ValidationUIManager
    // formatIssuesList helper removed (lines 1068-1089) - logic moved to ValidationUIManager
    // makeDraggable helper removed (lines 1092-1126) - logic moved to ValidationUIManager
    // handleValidateClick method removed (lines 1128-1146) - logic moved to ValidationUIManager
    // createValidationPanel method removed (lines 1148-1227) - logic moved to ValidationUIManager
    // getCurrentFeedData method removed (lines 1229-1236) - Delegated to FeedManager
    // updateValidationHistory method removed (lines 1238-1280) - logic moved to ValidationUIManager
    // updateValidationPanelIssues method removed (lines 1283-1339) - logic moved to ValidationUIManager
    // updateFilterCounts method removed (lines 1341-1368) - logic moved to ValidationUIManager
    // initializeSearch method removed (lines 1371-1402) - logic moved to SearchManager
    // --- Search methods removed comment is now accurate ---

    /**
     * Triggers the GMC validation process via the ValidationUIManager.
     */
    async triggerGMCValidation() {
        // Ensure the manager exists before calling
        if (this.validationUIManager) {
            // The ValidationUIManager's method handles loading, auth check, data fetching, validation, and display
            await this.validationUIManager.triggerGMCValidation();
        } else {
            console.error("ValidationUIManager not initialized. Cannot trigger GMC validation.");
            this.errorManager.showError("Validation UI is not ready. Please reload the extension.");
        }
    }

    /**
     * Verifies GMC connection status or initiates authentication if needed.
     */
    async verifyOrAuthenticateGMC() {
        this.loadingManager.showLoading('Checking GMC Connection...');
        try {
            let message = '';
            // Re-initialize to be sure we have the latest stored state
            await this.gmcApi.initialize();

            if (this.gmcApi.isAuthenticated) {
                // Optional: Could make a quick test call like fetchMerchantInfo again
                // to ensure the token is still valid, but chrome.identity handles refresh.
                console.log('Already authenticated. Merchant ID:', this.gmcApi.merchantId);
                message = `Already connected to GMC (Merchant ID: ${this.gmcApi.merchantId})`;
                this.errorManager.showSuccess(message, 3000);
                this.updateStatusBarUI(); // Ensure UI is up-to-date
            } else {
                console.log('Not authenticated, attempting to authenticate...');
                const success = await this.gmcApi.authenticate();
                if (success) {
                    message = `Successfully connected to GMC (Merchant ID: ${this.gmcApi.merchantId})`;
                    this.errorManager.showSuccess(message, 3000);
                    this.statusBarManager.updateUI(); // Update UI after successful auth
                } else {
                    // Should not be reached if authenticate throws on error
                    message = 'Authentication failed. Please try again.';
                    this.errorManager.showError(message);
                    this.updateStatusBarUI(true); // Update UI to reflect error state
                }
            }
        } catch (error) {
            console.error('GMC connection/authentication failed:', error);
            let errorMessage = 'Could not connect to GMC.';
            if (error.message && error.message.includes('No merchant account found')) {
                errorMessage = 'Connection failed: No Google Merchant Center account found or accessible.';
            } else if (error.message) {
                errorMessage = `Connection failed: ${error.message}`;
            }
            this.errorManager.showError(errorMessage);
            this.statusBarManager.updateUI(true); // Update UI to reflect error state
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    /**
     * Handles the logout process.
     */
    async handleLogout() {
        console.log('Logout button clicked');
        this.loadingManager.showLoading('Logging out...');
        try {
            await this.gmcApi.logout();
            this.errorManager.showSuccess('Successfully logged out.', 2000);
            this.statusBarManager.updateUI(); // Update UI to logged-out state
            // Optional: Disable buttons that require auth? (Handled in updateStatusBarUI)
            // Optional: Redirect to login.html?
            // Consider closing the tab instead if opened from login.html
            // window.close(); // Or chrome.tabs.remove(tabId); if you have the tab ID
        } catch (error) {
            console.error('Logout failed:', error);
            this.errorManager.showError(`Logout failed: ${error.message}`);
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    // updateStatusBarUI method removed - logic moved to StatusBarManager

    /**
     * Sets up event listeners for tab buttons to switch between panels.
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        if (!tabButtons.length || !tabPanels.length) {
            console.warn("Tab buttons or panels not found, skipping tab setup.");
            return;
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                if (!targetTab) return;

                console.log('Tab clicked:', targetTab);

                // Deactivate all
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                // Activate clicked button and corresponding panel
                button.classList.add('active');
                const panelId = `${targetTab}-tab`;
                const targetPanel = document.getElementById(panelId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    console.log('Activated panel:', panelId);
                    
                    // If switching to feed tab, reinitialize the floating scroll bar
                    if (targetTab === 'feed' && this.feedManager) {
                        // Use setTimeout to ensure the panel is visible before initializing
                        setTimeout(() => {
                            this.feedManager.initFloatingScrollBar();
                        }, 100);
                    }
                } else {
                    console.warn(`Panel with ID "${panelId}" not found.`);
                }
            });
        });

        // Ensure initial state is correct (first tab active)
        if (!document.querySelector('.tab-button.active')) {
             tabButtons[0]?.classList.add('active');
        }
         if (!document.querySelector('.tab-panel.active')) {
             tabPanels[0]?.classList.add('active');
        }
        
        // Initialize floating scroll bar for the initial active tab if it's the feed tab
        if (document.querySelector('.tab-button.active[data-tab="feed"]') && this.feedManager) {
            setTimeout(() => {
                this.feedManager.initFloatingScrollBar();
            }, 100);
        }
    }

} // End of PopupManager class

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
