// src/popup/popup_event_handlers.js
// Contains extracted event handlers from popup.js

/**
 * Handles dropdown change events
 * @param {Event} e - The dropdown change event
 */
function handleDropdownChange(e) {
    const selectedValue = e.target.value;
    if (selectedValue === 'analyze-feed') {
        // analyzeFeed method was removed
        console.warn("Analyze Feed dropdown option selected, but analyzeFeed method is removed.");
    }
}

/**
 * Triggers GMC validation through the ValidationUIManager
 * @param {Object} managers - The managers object containing validationUIManager
 * @param {Object} errorManager - The error manager for showing errors
 * @returns {Promise<void>}
 */
async function triggerGMCValidation(managers, errorManager) {
    console.log('[DEBUG] PopupEventHandlers.triggerGMCValidation called');
    console.log('[DEBUG] managers:', managers);
    console.log('[DEBUG] errorManager:', errorManager);
    
    // ValidationUIManager now orchestrates this
    if (managers.validationUIManager) {
        console.log('[DEBUG] managers.validationUIManager exists:', managers.validationUIManager);
        
        try {
            // Pass current auth state if needed by VUIManager for custom rules check
            // VUIManager constructor receives managers object which includes authManager
            console.log('[DEBUG] Calling managers.validationUIManager.triggerGMCValidation()');
            await managers.validationUIManager.triggerGMCValidation();
            console.log('[DEBUG] managers.validationUIManager.triggerGMCValidation() completed successfully');
        } catch (error) {
            console.error('[DEBUG] Error in validationUIManager.triggerGMCValidation():', error);
            errorManager.showError(`Validation failed: ${error.message}`);
        }
    } else {
        console.error("[DEBUG] ValidationUIManager not initialized.");
        errorManager.showError("Validation UI is not ready.");
    }
}

/**
 * Verifies or authenticates with Google Merchant Center
 * @param {Function} sendMessageToBackground - Function to send messages to background
 * @param {Object} loadingManager - The loading manager
 * @param {Object} errorManager - The error manager
 * @param {Object} statusBarManager - The status bar manager
 * @param {Object} currentAuthState - Reference to the current auth state
 * @returns {Promise<void>}
 */
async function verifyOrAuthenticateGMC(sendMessageToBackground, loadingManager, errorManager, statusBarManager, currentAuthState) {
    loadingManager.showLoading('Checking GMC Connection...');
    try {
        const response = await sendMessageToBackground({ action: 'authenticateGmc' });

        if (response?.success) {
            const message = `Successfully connected to GMC (Merchant ID: ${response.merchantId})`;
            errorManager.showSuccess(message, 3000);
            // Refresh local state and update UI
            const stateResponse = await sendMessageToBackground({ action: 'getAuthState' });
            if (stateResponse?.success && stateResponse.state) {
                Object.assign(currentAuthState, stateResponse.state);
                statusBarManager?.updateAuthState(currentAuthState);
                statusBarManager?.updateUI();
            } else {
                console.warn("Failed to refresh auth state after GMC auth.");
                errorManager.showError("Connected, but failed to refresh status.");
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
        errorManager.showError(errorMessage);
        statusBarManager?.updateUI(true);
    } finally {
        loadingManager.hideLoading();
    }
}

/**
 * Handles logout from both GMC and Firebase
 * @param {Function} sendMessageToBackground - Function to send messages to background
 * @param {Object} loadingManager - The loading manager
 * @param {Object} errorManager - The error manager
 * @param {Object} statusBarManager - The status bar manager
 * @param {Object} currentAuthState - Reference to the current auth state
 * @returns {Promise<void>}
 */
async function handleLogout(sendMessageToBackground, loadingManager, errorManager, statusBarManager, currentAuthState) {
    console.log('Logout button clicked');
    loadingManager.showLoading('Logging out...');
    try {
        // Send messages for both GMC and Firebase logout
        const results = await Promise.allSettled([
            sendMessageToBackground({ action: 'logoutGmc' }),
            sendMessageToBackground({ action: 'signOutFirebase' })
        ]);

        let gmcLogoutSuccess = results[0].status === 'fulfilled' && results[0].value?.success;
        let firebaseLogoutSuccess = results[1].status === 'fulfilled' && results[1].value?.success;

        // Log detailed results
        console.log("Logout results:", results);

        if (gmcLogoutSuccess || firebaseLogoutSuccess) { // Consider success if at least one succeeds
            errorManager.showSuccess('Logout successful.', 2000);
        } else {
            // If both failed, show primary error (e.g., from GMC logout)
            const firstError = results.find(r => r.status === 'rejected')?.reason || results.find(r => r.status === 'fulfilled' && !r.value?.success)?.value?.error;
            throw new Error(firstError?.message || 'Logout failed for both services.');
        }

        // Refresh state and UI regardless of partial success
        const stateResponse = await sendMessageToBackground({ action: 'getAuthState' });
        if (stateResponse?.success && stateResponse.state) {
            Object.assign(currentAuthState, stateResponse.state);
            statusBarManager?.updateAuthState(currentAuthState);
            statusBarManager?.updateUI();
        } else {
            console.warn("Failed to refresh auth state after logout.");
        }

        // Redirect to login page
        window.location.href = 'login.html';

    } catch (error) { // Catch errors from sendMessageToBackground or thrown errors
        console.error('Logout failed:', error);
        errorManager.showError(`Logout failed: ${error.message || 'Unknown error'}`);
        // Attempt to update UI even on error
        try {
            const stateResponse = await sendMessageToBackground({ action: 'getAuthState' });
            if (stateResponse?.success && stateResponse.state) {
                Object.assign(currentAuthState, stateResponse.state);
                statusBarManager?.updateAuthState(currentAuthState);
                statusBarManager?.updateUI();
            }
        } catch (stateError) {
            console.error("Failed to update state after logout error:", stateError);
        }
    } finally {
        loadingManager.hideLoading();
    }
}

/**
 * Sets up tab functionality
 * @param {NodeListOf<Element>} tabButtons - The tab buttons
 * @param {NodeListOf<Element>} tabPanels - The tab panels
 * @param {Function} sendMessageToBackground - Function to send messages to background
 * @param {Object} loadingManager - The loading manager
 * @param {Object} errorManager - The error manager
 * @param {Object} managers - The managers object containing all manager instances
 * @param {Object} currentAuthState - Reference to the current auth state
 */
function setupTabs(tabButtons, tabPanels, sendMessageToBackground, loadingManager, errorManager, managers, currentAuthState) {
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
        loadingManager.showLoading(`Loading ${targetTab} tab...`);
        try {
            // Refresh auth state on tab switch to ensure UI reflects current status
            const stateResponse = await sendMessageToBackground({ action: 'getAuthState' });
            if (!stateResponse?.success || !stateResponse.state) throw new Error("Failed to refresh auth state.");
            Object.assign(currentAuthState, stateResponse.state);
            // Update managers needing state
            managers.statusBarManager?.updateAuthState(currentAuthState);
            managers.statusBarManager?.updateUI(); // Update status bar immediately

            // Trigger manager initializations or updates based on tab
            if (targetTab === 'feed') {
                if (managers.feedManager) setTimeout(() => managers.feedManager.initFloatingScrollBar(), 100);
                if (managers.bulkActionsManager) {
                    console.log('Feed tab activated, applying bulk actions feature gating...');
                    await managers.bulkActionsManager.applyFeatureGating();
                    if (managers.bulkActionsManager.isPro && !initialLoadDone.feed) {
                        await managers.bulkActionsManager.loadTemplates();
                        initialLoadDone.feed = true;
                    }
                }
            } else if (targetTab === 'validation') {
                if (managers.validationUIManager && !initialLoadDone.validation) {
                    console.log('Validation tab activated, loading history...');
                    await managers.validationUIManager.loadValidationHistoryFromFirestore();
                    initialLoadDone.validation = true;
                } else if (managers.validationUIManager) {
                    console.log('Validation tab re-activated.');
                    // Optionally refresh: await managers.validationUIManager.loadValidationHistoryFromFirestore();
                }
            } else if (targetTab === 'settings') {
                if (managers.settingsManager) {
                    console.log('Settings tab activated, applying feature gating...');
                    await managers.settingsManager.applyFeatureGating();
                    if (managers.settingsManager.isPro && !initialLoadDone.settings) {
                        await managers.settingsManager.loadSettings();
                        await managers.settingsManager.loadCustomRules();
                        initialLoadDone.settings = true;
                    } else if (managers.settingsManager.isPro) {
                        console.log('Settings tab re-activated.');
                        // Optionally refresh: await managers.settingsManager.loadSettings(); await managers.settingsManager.loadCustomRules();
                    }
                }
            }
        } catch (error) {
            console.error(`Error handling tab switch for ${targetTab}:`, error);
            errorManager.showError(`Failed to load ${targetTab} tab content.`);
        } finally {
            loadingManager.hideLoading();
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
    if (currentAuthState) {
        activateInitialTab();
    } else {
        // If initializePopup failed before getting state, this might not run.
        console.warn("Initial auth state not available yet for initial tab activation.");
        // Maybe activate first tab visually without triggering actions?
        // tabButtons[0]?.classList.add('active');
        // tabPanels[0]?.classList.add('active');
    }
}

// Make functions available globally
window.PopupEventHandlers = {
    handleDropdownChange,
    triggerGMCValidation,
    verifyOrAuthenticateGMC,
    handleLogout,
    setupTabs
};