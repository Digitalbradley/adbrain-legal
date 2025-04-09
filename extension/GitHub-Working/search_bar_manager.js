/**
 * Manages the status bar UI component.
 */
class StatusBarManager {
    /**
     * @param {GMCApi} gmcApi - Instance of the GMCApi class.
     * @param {HTMLElement} verifyBtn - Reference to the Verify GMC button.
     * @param {HTMLElement} validateBtn - Reference to the Validate GMC button.
     * @param {HTMLElement} logoutBtn - Reference to the Logout button.
     */
    constructor(gmcApi, verifyBtn, validateBtn, logoutBtn) {
        if (!gmcApi) throw new Error("StatusBarManager requires GMCApi instance.");
        this.gmcApi = gmcApi;
        this.verifyBtn = verifyBtn;
        this.validateBtn = validateBtn;
        this.logoutBtn = logoutBtn;
        this.statusBarElements = null; // To store references to status bar sub-elements

        this.setup(); // Create the status bar elements immediately
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

            // Insert after header, before controls (adjust selector if needed)
            const header = document.querySelector('.branding');
            const controls = document.querySelector('.controls'); // Assuming controls container exists
            const targetNode = controls || header?.nextSibling; // Insert before controls or after header

            if (header?.parentNode && targetNode) {
                 header.parentNode.insertBefore(statusBar, targetNode);
            } else {
                 console.error("Could not find suitable location to insert status bar.");
                 // Fallback: append to body? Or handle differently.
                 document.body.insertBefore(statusBar, document.body.firstChild);
            }
        }

        // Ensure components exist or create them
        let modeIndicator = statusBar.querySelector('.mode-indicator');
        if (!modeIndicator) {
            modeIndicator = document.createElement('div');
            modeIndicator.className = 'status-item mode-indicator';
            statusBar.appendChild(modeIndicator); // Append early
        }
        // Always set initial innerHTML
        modeIndicator.innerHTML = `<span class="status-dot disconnected"></span><span class="status-text">Initializing...</span>`;


        let merchantInfo = statusBar.querySelector('.merchant-info');
        if (!merchantInfo) {
            merchantInfo = document.createElement('div');
            merchantInfo.className = 'status-item merchant-info';
            statusBar.appendChild(merchantInfo); // Append early
        }
        merchantInfo.innerHTML = `<span class="merchant-label">Merchant ID:</span><span class="merchant-value">---</span>`;


        let lastAction = statusBar.querySelector('.last-action');
        if (!lastAction) {
            lastAction = document.createElement('div');
            lastAction.className = 'status-item last-action';
            statusBar.appendChild(lastAction); // Append early
        }
        lastAction.innerHTML = '<span class="action-text">Ready</span>';


        // Store references
        this.statusBarElements = {
            element: statusBar,
            lastAction: lastAction,
            merchantInfo: merchantInfo.querySelector('.merchant-value'), // Direct ref to value span
            modeIndicatorDot: modeIndicator.querySelector('.status-dot'), // Direct ref to dot span
            modeIndicatorText: modeIndicator.querySelector('.status-text') // Direct ref to text span
        };
        console.log('Status bar setup complete.');
    }

    /**
     * Updates the status bar UI based on the current authentication state from GMCApi.
     * @param {boolean} [isError=false] - Flag to indicate an error state.
     */
    updateUI(isError = false) {
        if (!this.statusBarElements) {
            console.error('Status bar elements not initialized, cannot update UI.');
            // Attempt setup again? Might indicate a deeper issue.
            this.setup();
            if (!this.statusBarElements) return; // Exit if setup failed again
        }

        const { merchantInfo, modeIndicatorDot, modeIndicatorText } = this.statusBarElements;

        // Ensure elements exist before trying to update them
        if (!merchantInfo || !modeIndicatorDot || !modeIndicatorText) {
            console.error('Status bar sub-elements references are invalid.');
            return;
        }

        // Use local button references passed in constructor
        const verifyBtn = this.verifyBtn;
        const validateBtn = this.validateBtn;
        const logoutBtn = this.logoutBtn;

        if (isError) {
            merchantInfo.textContent = 'Error';
            merchantInfo.style.color = '#dc3545'; // Red
            modeIndicatorDot.className = 'status-dot error';
            modeIndicatorText.textContent = 'Connection Error';
            if(validateBtn) validateBtn.disabled = true;
            if(logoutBtn) logoutBtn.style.display = 'none';
            if(verifyBtn) verifyBtn.textContent = 'Retry Connection';

        } else if (this.gmcApi.isAuthenticated && this.gmcApi.merchantId) {
            merchantInfo.textContent = this.gmcApi.merchantId;
            merchantInfo.style.color = ''; // Reset color
            modeIndicatorDot.className = 'status-dot live'; // Assume live if authenticated
            modeIndicatorText.textContent = 'Connected';
            // Enable buttons requiring auth
            if(validateBtn) validateBtn.disabled = false;
            if(logoutBtn) logoutBtn.style.display = ''; // Show logout
            if(verifyBtn) verifyBtn.textContent = 'GMC Connected'; // Change text

        } else {
            merchantInfo.textContent = 'Not Connected';
            merchantInfo.style.color = '#ffc107'; // Yellow/Orange
            modeIndicatorDot.className = 'status-dot disconnected';
            modeIndicatorText.textContent = 'Disconnected';
            // Disable buttons requiring auth
            if(validateBtn) validateBtn.disabled = true;
            if(logoutBtn) logoutBtn.style.display = 'none'; // Hide logout
            if(verifyBtn) verifyBtn.textContent = 'Verify GMC Connection'; // Reset text
        }
        console.log('Status bar UI updated. Auth State:', this.gmcApi.isAuthenticated);
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

         // Clear after delay if specified
         if (clearDelay > 0) {
             setTimeout(() => {
                 // Check if the message is still the same before clearing
                 if (el.innerHTML.includes(actionText)) {
                     el.innerHTML = '<span class="action-text">Ready</span>';
                 }
             }, clearDelay);
         }
     }
}

// Make globally available (consider modules later)
window.StatusBarManager = StatusBarManager;