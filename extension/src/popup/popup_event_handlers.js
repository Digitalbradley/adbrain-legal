/**
 * popup_event_handlers.js
 * 
 * This module contains event handlers for the popup UI.
 * It provides a standardized way to handle UI events and interact with the background script.
 */

// Create a PopupEventHandlers object to handle UI events
const PopupEventHandlers = {
    /**
     * Handles the change event for the analysis dropdown.
     * 
     * @param {Event} e - The change event
     */
    handleDropdownChange: function(e) {
        console.log('[DEBUG] Analysis dropdown changed:', e.target.value);
        
        const selectedValue = e.target.value;
        const previewContent = document.getElementById('previewContent');
        
        if (!previewContent) {
            console.error('[DEBUG] Preview content container not found');
            return;
        }
        
        // Clear any existing content
        previewContent.innerHTML = '';
        
        // Add a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = 'Loading analysis...';
        previewContent.appendChild(loadingIndicator);
        
        // Simulate analysis (in a real implementation, this would call the appropriate analysis function)
        setTimeout(() => {
            // Remove loading indicator
            previewContent.removeChild(loadingIndicator);
            
            // Add analysis result
            const resultElement = document.createElement('div');
            resultElement.className = 'analysis-result';
            resultElement.innerHTML = `<h3>Analysis: ${selectedValue}</h3><p>Analysis results would appear here.</p>`;
            previewContent.appendChild(resultElement);
        }, 1000);
    },
    
    /**
     * Triggers GMC validation.
     * 
     * @param {Object} managers - Object containing manager instances
     * @param {Object} errorManager - Error manager instance
     * @returns {Promise<Object>} - A promise that resolves with the validation result
     */
    triggerGMCValidation: async function(managers, errorManager) {
        console.log('[DEBUG] Triggering GMC validation');
        
        if (!managers || !managers.validationUIManager) {
            console.error('[DEBUG] ValidationUIManager not available');
            if (errorManager) {
                errorManager.showError("Validation UI Manager is not initialized. Please reload the extension.");
            } else {
                alert("Validation UI Manager is not initialized. Please reload the extension.");
            }
            return { success: false, error: 'ValidationUIManager not available' };
        }
        
        try {
            // Check if validationUIManager has the triggerGMCValidation method
            if (typeof managers.validationUIManager.triggerGMCValidation !== 'function') {
                console.error('[DEBUG] triggerGMCValidation method not available');
                if (errorManager) {
                    errorManager.showError("Validation method not available. Please reload the extension.");
                } else {
                    alert("Validation method not available. Please reload the extension.");
                }
                return { success: false, error: 'triggerGMCValidation method not available' };
            }
            
            // Call the triggerGMCValidation method
            const result = await managers.validationUIManager.triggerGMCValidation();
            console.log('[DEBUG] GMC validation result:', result);
            return result;
        } catch (error) {
            console.error('[DEBUG] Error triggering GMC validation:', error);
            if (errorManager) {
                errorManager.showError(`Validation failed: ${error.message}`);
            } else {
                alert(`Validation failed: ${error.message}`);
            }
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Verifies or authenticates with GMC.
     * 
     * @param {Function} sendMessageToBackground - Function to send messages to the background script
     * @param {Object} loadingManager - Loading manager instance
     * @param {Object} errorManager - Error manager instance
     * @param {Object} statusBarManager - Status bar manager instance
     * @param {Object} currentAuthState - Current authentication state
     * @returns {Promise<Object>} - A promise that resolves with the authentication result
     */
    verifyOrAuthenticateGMC: async function(sendMessageToBackground, loadingManager, errorManager, statusBarManager, currentAuthState) {
        console.log('[DEBUG] Verifying or authenticating with GMC');
        
        if (loadingManager) {
            loadingManager.showLoading('Connecting to Google Merchant Center...');
        }
        
        try {
            // Send message to background script
            const response = await sendMessageToBackground({ action: 'authenticateGmc' });
            
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            if (response && response.success) {
                console.log('[DEBUG] GMC authentication successful:', response);
                
                // Update auth state
                if (currentAuthState) {
                    currentAuthState.gmcAuthenticated = true;
                    currentAuthState.gmcMerchantId = response.merchantId || null;
                }
                
                // Update status bar
                if (statusBarManager && typeof statusBarManager.updateAuthState === 'function') {
                    statusBarManager.updateAuthState(currentAuthState);
                    statusBarManager.updateUI();
                }
                
                // Show success message
                if (errorManager && typeof errorManager.showSuccess === 'function') {
                    errorManager.showSuccess('Connected to Google Merchant Center successfully!');
                }
                
                return { success: true, merchantId: response.merchantId };
            } else {
                console.error('[DEBUG] GMC authentication failed:', response);
                
                // Show error message
                if (errorManager && typeof errorManager.showError === 'function') {
                    errorManager.showError(response && response.error ? response.error : 'Failed to connect to Google Merchant Center.');
                }
                
                return { success: false, error: response && response.error ? response.error : 'Unknown error' };
            }
        } catch (error) {
            console.error('[DEBUG] Error authenticating with GMC:', error);
            
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            // Show error message
            if (errorManager && typeof errorManager.showError === 'function') {
                errorManager.showError(`Error connecting to Google Merchant Center: ${error.message}`);
            }
            
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Handles logout.
     * 
     * @param {Function} sendMessageToBackground - Function to send messages to the background script
     * @param {Object} loadingManager - Loading manager instance
     * @param {Object} errorManager - Error manager instance
     * @param {Object} statusBarManager - Status bar manager instance
     * @param {Object} currentAuthState - Current authentication state
     * @returns {Promise<Object>} - A promise that resolves with the logout result
     */
    handleLogout: async function(sendMessageToBackground, loadingManager, errorManager, statusBarManager, currentAuthState) {
        console.log('[DEBUG] Handling logout');
        
        if (loadingManager) {
            loadingManager.showLoading('Signing out...');
        }
        
        try {
            // Send message to background script
            const response = await sendMessageToBackground({ action: 'signOut' });
            
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            if (response && response.success) {
                console.log('[DEBUG] Logout successful:', response);
                
                // Update auth state
                if (currentAuthState) {
                    currentAuthState.gmcAuthenticated = false;
                    currentAuthState.firebaseAuthenticated = false;
                    currentAuthState.isProUser = false;
                    currentAuthState.gmcMerchantId = null;
                    currentAuthState.firebaseUserId = null;
                }
                
                // Update status bar
                if (statusBarManager && typeof statusBarManager.updateAuthState === 'function') {
                    statusBarManager.updateAuthState(currentAuthState);
                    statusBarManager.updateUI();
                }
                
                // Show success message
                if (errorManager && typeof errorManager.showSuccess === 'function') {
                    errorManager.showSuccess('Signed out successfully!');
                }
                
                return { success: true };
            } else {
                console.error('[DEBUG] Logout failed:', response);
                
                // Show error message
                if (errorManager && typeof errorManager.showError === 'function') {
                    errorManager.showError(response && response.error ? response.error : 'Failed to sign out.');
                }
                
                return { success: false, error: response && response.error ? response.error : 'Unknown error' };
            }
        } catch (error) {
            console.error('[DEBUG] Error signing out:', error);
            
            if (loadingManager) {
                loadingManager.hideLoading();
            }
            
            // Show error message
            if (errorManager && typeof errorManager.showError === 'function') {
                errorManager.showError(`Error signing out: ${error.message}`);
            }
            
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Sets up tabs.
     * 
     * @param {NodeList} tabButtons - Tab buttons
     * @param {NodeList} tabPanels - Tab panels
     * @param {Function} sendMessageToBackground - Function to send messages to the background script
     * @param {Object} loadingManager - Loading manager instance
     * @param {Object} errorManager - Error manager instance
     * @param {Object} managers - Object containing manager instances
     * @param {Object} currentAuthState - Current authentication state
     */
    setupTabs: function(tabButtons, tabPanels, sendMessageToBackground, loadingManager, errorManager, managers, currentAuthState) {
        console.log('[DEBUG] Setting up tabs');
        
        if (!tabButtons || !tabPanels) {
            console.error('[DEBUG] Tab buttons or panels not found');
            return;
        }
        
        // Set up tab switching
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                if (!tabId) {
                    console.error('[DEBUG] Tab ID not found for button:', button);
                    return;
                }
                
                console.log('[DEBUG] Tab clicked:', tabId);
                
                // Remove active class from all buttons and panels
                tabButtons.forEach((btn) => btn.classList.remove('active'));
                tabPanels.forEach((panel) => panel.classList.remove('active'));
                
                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                const panel = document.getElementById(tabId);
                if (panel) {
                    panel.classList.add('active');
                } else {
                    console.error('[DEBUG] Tab panel not found for ID:', tabId);
                }
                
                // Handle special tab actions
                this.handleTabActivation(tabId, sendMessageToBackground, loadingManager, errorManager, managers, currentAuthState);
            });
        });
        
        // Activate the first tab by default
        if (tabButtons.length > 0) {
            const firstTabId = tabButtons[0].getAttribute('data-tab');
            if (firstTabId) {
                const firstPanel = document.getElementById(firstTabId);
                if (firstPanel) {
                    tabButtons[0].classList.add('active');
                    firstPanel.classList.add('active');
                    
                    // Handle special tab actions for the first tab
                    this.handleTabActivation(firstTabId, sendMessageToBackground, loadingManager, errorManager, managers, currentAuthState);
                }
            }
        }
    },
    
    /**
     * Handles tab activation.
     * 
     * @param {string} tabId - Tab ID
     * @param {Function} sendMessageToBackground - Function to send messages to the background script
     * @param {Object} loadingManager - Loading manager instance
     * @param {Object} errorManager - Error manager instance
     * @param {Object} managers - Object containing manager instances
     * @param {Object} currentAuthState - Current authentication state
     */
    handleTabActivation: function(tabId, sendMessageToBackground, loadingManager, errorManager, managers, currentAuthState) {
        console.log('[DEBUG] Handling tab activation:', tabId);
        
        // Handle special tab actions
        switch (tabId) {
            case 'validation-tab':
                // Load validation history if authenticated
                if (currentAuthState && currentAuthState.firebaseAuthenticated && managers && managers.validationUIManager) {
                    console.log('[DEBUG] Loading validation history');
                    
                    if (loadingManager) {
                        loadingManager.showLoading('Loading validation history...');
                    }
                    
                    managers.validationUIManager.loadValidationHistoryFromFirestore()
                        .then(() => {
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                        })
                        .catch((error) => {
                            console.error('[DEBUG] Error loading validation history:', error);
                            
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                            
                            if (errorManager) {
                                errorManager.showError(`Error loading validation history: ${error.message}`);
                            }
                        });
                }
                break;
                
            case 'settings-tab':
                // Load settings if authenticated
                if (currentAuthState && currentAuthState.firebaseAuthenticated && managers && managers.settingsManager) {
                    console.log('[DEBUG] Loading settings');
                    
                    if (loadingManager) {
                        loadingManager.showLoading('Loading settings...');
                    }
                    
                    managers.settingsManager.loadSettings()
                        .then(() => {
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                        })
                        .catch((error) => {
                            console.error('[DEBUG] Error loading settings:', error);
                            
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                            
                            if (errorManager) {
                                errorManager.showError(`Error loading settings: ${error.message}`);
                            }
                        });
                }
                break;
                
            case 'bulk-actions-tab':
                // Initialize bulk actions if authenticated
                if (currentAuthState && currentAuthState.firebaseAuthenticated && managers && managers.bulkActionsManager) {
                    console.log('[DEBUG] Initializing bulk actions');
                    
                    if (loadingManager) {
                        loadingManager.showLoading('Initializing bulk actions...');
                    }
                    
                    managers.bulkActionsManager.initialize()
                        .then(() => {
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                        })
                        .catch((error) => {
                            console.error('[DEBUG] Error initializing bulk actions:', error);
                            
                            if (loadingManager) {
                                loadingManager.hideLoading();
                            }
                            
                            if (errorManager) {
                                errorManager.showError(`Error initializing bulk actions: ${error.message}`);
                            }
                        });
                }
                break;
                
            default:
                // No special action for other tabs
                break;
        }
    }
};

// Make the PopupEventHandlers available globally
window.PopupEventHandlers = PopupEventHandlers;

// No default export needed for regular scripts