/**
 * Manages the status bar UI component.
 */
class StatusBarManager {
    /**
     * @param {object | null} initialAuthState - The initial auth state object received from background, or null.
     * @param {HTMLElement} verifyBtn - Reference to the Verify GMC button.
     * @param {HTMLElement} validateBtn - Reference to the Validate GMC button.
     * @param {HTMLElement} logoutBtn - Reference to the Logout button.
     */
    constructor(initialAuthState, verifyBtn, validateBtn, logoutBtn) {
        // Store initial state locally
        this.authState = initialAuthState || { gmcAuthenticated: false, firebaseAuthenticated: false, isProUser: false, gmcMerchantId: null, firebaseUserId: null, lastError: null };
        this.verifyBtn = verifyBtn;
        this.validateBtn = validateBtn;
        this.logoutBtn = logoutBtn;
        this.statusBarElements = null; // To store references to status bar sub-elements

        this.setup(); // Create the status bar elements immediately
        // Initial UI update should be triggered by PopupManager after state is confirmed
        console.log("StatusBarManager initialized with initial state:", this.authState);
    }

    /**
     * Updates the locally stored authentication state.
     * @param {object} newState - The new auth state object.
     */
    updateAuthState(newState) {
        console.log("StatusBarManager updating auth state:", newState);
        // Ensure newState is a valid object before assigning
        if (newState && typeof newState === 'object') {
             this.authState = newState;
        } else {
             console.warn("StatusBarManager received invalid state to update:", newState);
             // Optionally reset to a default disconnected state
             // this.authState = { gmcAuthenticated: false, firebaseAuthenticated: false, isProUser: false, gmcMerchantId: null, firebaseUserId: null, lastError: null };
        }
        // It's generally better to let the caller decide when to update UI
        // this.updateUI();
    }


    /**
     * Creates the status bar elements and inserts them into the DOM.
     * Stores references to the dynamic parts.
     */
    setup() {
        let statusBar = document.querySelector('.status-bar');
        if (!statusBar) {
            statusBar = document.createElement('div');
            statusBar.className = 'status-bar';
            const header = document.querySelector('.branding');
            // Use a more reliable insertion point if possible, e.g., a dedicated container
            const targetNode = header?.nextElementSibling || document.body.firstChild; // Fallback
            if (header?.parentNode) {
                 header.parentNode.insertBefore(statusBar, targetNode);
            } else {
                 console.error("Could not find suitable location to insert status bar.");
                 document.body.insertBefore(statusBar, document.body.firstChild); // Last resort
            }
        }
        // Ensure components exist or create them
        let modeIndicator = statusBar.querySelector('.mode-indicator');
        if (!modeIndicator) {
            modeIndicator = document.createElement('div');
            modeIndicator.className = 'status-item mode-indicator';
            statusBar.appendChild(modeIndicator);
        }
        modeIndicator.innerHTML = `<span class="status-dot disconnected"></span><span class="status-text">Initializing...</span>`;

        let merchantInfo = statusBar.querySelector('.merchant-info');
        if (!merchantInfo) {
            merchantInfo = document.createElement('div');
            merchantInfo.className = 'status-item merchant-info';
            statusBar.appendChild(merchantInfo);
        }
        merchantInfo.innerHTML = `<span class="merchant-label">Merchant ID:</span><span class="merchant-value">---</span>`;

        let lastAction = statusBar.querySelector('.last-action');
        if (!lastAction) {
            lastAction = document.createElement('div');
            lastAction.className = 'status-item last-action';
            statusBar.appendChild(lastAction);
        }
        lastAction.innerHTML = '<span class="action-text">Ready</span>';

        this.statusBarElements = {
            element: statusBar,
            lastAction: lastAction,
            merchantInfo: merchantInfo.querySelector('.merchant-value'),
            modeIndicatorDot: modeIndicator.querySelector('.status-dot'),
            modeIndicatorText: modeIndicator.querySelector('.status-text')
        };
        console.log('Status bar setup complete.');
    }

    /**
     * Updates the status bar UI based on the locally stored authentication state.
     * @param {boolean} [isError=false] - Flag to indicate an explicit error state (e.g., connection error).
     */
    updateUI(isError = false) {
        if (!this.statusBarElements) {
            console.error('Status bar elements not initialized, cannot update UI.');
            this.setup(); // Attempt setup again
            if (!this.statusBarElements) return;
        }

        // Use the locally stored authState
        const authState = this.authState;
        // Handle case where authState might still be null/undefined
        if (!authState) {
             console.error("Cannot update status bar UI: Auth state is missing.");
             isError = true; // Force error display
        }

        const { merchantInfo, modeIndicatorDot, modeIndicatorText } = this.statusBarElements;
        if (!merchantInfo || !modeIndicatorDot || !modeIndicatorText) {
            console.error('Status bar sub-elements references are invalid.');
            return;
        }

        const verifyBtn = this.verifyBtn;
        const validateBtn = this.validateBtn;
        const logoutBtn = this.logoutBtn;

        // Determine final state based on explicit error or error in authState
        const hasError = isError || !!authState?.lastError;

        if (hasError) {
            merchantInfo.textContent = 'Error';
            merchantInfo.style.color = '#dc3545';
            modeIndicatorDot.className = 'status-dot error';
            // Try to get a specific error message, otherwise use generic
            modeIndicatorText.textContent = authState?.lastError?.message || 'Connection Error';
            if(validateBtn) validateBtn.disabled = true;
            if(logoutBtn) logoutBtn.style.display = 'none';
            if(verifyBtn) verifyBtn.textContent = 'Retry Connection';
            this.statusBarElements.element.classList.remove('pro-user'); // Ensure pro class removed on error
        }
        // Use authState for normal UI updates only if no error
        else if (authState.gmcAuthenticated) { // Check GMC auth first
            merchantInfo.textContent = authState.gmcMerchantId || 'Connected';
            merchantInfo.style.color = '';
            modeIndicatorDot.className = 'status-dot live';

            if (authState.isProUser) {
                modeIndicatorText.textContent = 'GMC Connected (PRO)';
                this.statusBarElements.element.classList.add('pro-user');
            } else {
                modeIndicatorText.textContent = 'GMC Connected';
                this.statusBarElements.element.classList.remove('pro-user');
            }

            // Enable buttons requiring auth
            if(validateBtn) validateBtn.disabled = false;
            if(logoutBtn) logoutBtn.style.display = '';
            if(verifyBtn) verifyBtn.textContent = 'GMC Connected';

        } else { // Not authenticated with GMC and no error
            merchantInfo.textContent = 'Not Connected';
            this.statusBarElements.element.classList.remove('pro-user');
            merchantInfo.style.color = '#ffc107';
            modeIndicatorDot.className = 'status-dot disconnected';
            modeIndicatorText.textContent = 'Disconnected';

            // Disable buttons requiring auth
            if(validateBtn) validateBtn.disabled = true;
            if(logoutBtn) logoutBtn.style.display = 'none';
            if(verifyBtn) verifyBtn.textContent = 'Verify GMC Connection';
        }
        console.log('Status bar UI updated. Current State:', this.authState);
    }

     /**
      * Updates the last action text in the status bar.
      * @param {string} actionText - The text to display.
      * @param {boolean} [isSuccess=true] - Whether the action was successful (for styling).
      * @param {number} [clearDelay=3000] - Delay in ms before clearing the message (0 to persist).
      */
     updateLastAction(actionText, isSuccess = true, clearDelay = 3000) {
         if (!this.statusBarElements || !this.statusBarElements.lastAction) {
             console.warn('Last action element not found.');
             return;
         }
         const el = this.statusBarElements.lastAction;
         el.innerHTML = `<span class="action-text ${isSuccess ? 'success' : 'error'}">${actionText}</span>`;
         if (clearDelay > 0) {
             // Clear previous timeout if exists
             if (el._clearTimeoutId) {
                 clearTimeout(el._clearTimeoutId);
             }
             el._clearTimeoutId = setTimeout(() => {
                 // Check if the message is still the same before clearing
                 if (el.innerHTML.includes(actionText)) {
                     el.innerHTML = '<span class="action-text">Ready</span>';
                 }
                 el._clearTimeoutId = null; // Clear the stored ID
             }, clearDelay);
         }
     }
}

// Make globally available for backward compatibility
window.StatusBarManager = StatusBarManager;

// No default export needed for regular scripts