/**
 * Manages the UI related to displaying validation results,
 * including the floating panel and the history tab.
 * This class orchestrates the coordination between the Firebase handler,
 * panel manager, and issue manager to provide a cohesive validation experience.
 */
class ValidationUIManager {
    /**
     * @param {object} elements - DOM element references.
     * @param {HTMLElement} elements.historyTableBody - tbody element for validation history.
     * @param {HTMLElement} elements.validationTab - The validation tab element.
     * @param {HTMLElement} elements.feedPreviewContainer - The feed preview container element.
     * @param {object} managers - Other manager instances.
     * @param {FeedManager} managers.feedManager - For navigating to rows.
     * @param {ErrorManager} managers.errorManager - For displaying errors.
     * @param {AuthManager} managers.authManager - For accessing user state.
     * @param {LoadingManager} managers.loadingManager - For showing loading states.
     * @param {MonitorManager} managers.monitor - For logging operations.
     * @param {GMCValidator} managers.gmcValidator - For validating feeds with GMC.
     * @param {GMCApi} managers.gmcApi - For GMC API operations.
     * @param {CustomRuleValidator} managers.customRuleValidator - For custom validation rules.
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers;
        
        // Store validation results locally within this manager
        this.validationResults = {};

        // We'll initialize the specialized handlers in initializeHandlers()
        this.firebaseHandler = null;
        this.panelManager = null;
        this.issueManager = null;

        // Check for required elements and managers
        if (!this.elements.historyTableBody) {
            console.error("ValidationUIManager: History table body element not provided.");
        }
        
        if (!this.managers.feedManager) {
            console.warn("ValidationUIManager: FeedManager not provided, row navigation might be limited.");
        }
        
        if (!this.managers.errorManager) {
            console.warn("ValidationUIManager: ErrorManager not provided.");
            // Use placeholder if missing
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
        
        if (!this.managers.authManager) {
            console.error("ValidationUIManager: AuthManager not provided. Cannot save history.");
            // Optionally throw an error or disable history saving features
        }
        
        // Initialize handlers if all required managers are available
        this.initializeHandlers();
    }
    
    /**
     * Initializes the specialized handlers.
     * This is called during construction and can be called again if managers are updated.
     */
    initializeHandlers() {
        // Only initialize if not already initialized
        if (!this.firebaseHandler) {
            console.log('[DEBUG] Initializing ValidationFirebaseHandler');
            this.firebaseHandler = new ValidationFirebaseHandler(this.managers);
        }
        
        if (!this.panelManager) {
            console.log('[DEBUG] Initializing ValidationPanelManager');
            try {
                if (typeof ValidationPanelManager === 'undefined') {
                    console.error('[DEBUG] ValidationPanelManager class is not defined! Creating fallback implementation.');
                    // Create a simple fallback implementation
                    this.panelManager = {
                        handleViewDetails: (feedId, data) => {
                            console.log('[DEBUG] Using fallback handleViewDetails implementation');
                            this.createDirectValidationPanel(feedId, data);
                        },
                        createAndShowSummaryPanel: (historyId, historyData) => {
                            console.log('[DEBUG] Using fallback createAndShowSummaryPanel implementation');
                            // Simple implementation that just shows a basic panel
                            alert(`Validation Summary for ${historyData.feedId || historyId}`);
                        }
                    };
                    console.log('[DEBUG] Fallback ValidationPanelManager created:', this.panelManager);
                } else {
                    console.log('[DEBUG] VUIManager: Attempting to initialize ValidationPanelManager...'); // ADDED LOG
                    this.panelManager = new ValidationPanelManager(this.managers);
                    console.log('[DEBUG] VUIManager: ValidationPanelManager initialized successfully. Instance:', this.panelManager); // MODIFIED LOG
                }
            } catch (error) {
                console.error('[DEBUG] Error initializing ValidationPanelManager:', error);
                // Create a fallback implementation in case of error
                this.panelManager = {
                    handleViewDetails: (feedId, data) => {
                        console.log('[DEBUG] Using fallback handleViewDetails implementation after error');
                        this.createDirectValidationPanel(feedId, data);
                    },
                    createAndShowSummaryPanel: (historyId, historyData) => {
                        console.log('[DEBUG] Using fallback createAndShowSummaryPanel implementation after error');
                        alert(`Validation Summary for ${historyData.feedId || historyId}`);
                    }
                };
                console.log('[DEBUG] Fallback ValidationPanelManager created after error:', this.panelManager);
            }
        }
        
        if (!this.issueManager) {
            console.log('[DEBUG] Initializing ValidationIssueManager');
            this.issueManager = new ValidationIssueManager(this.managers);
        }
        
        console.log("[DEBUG] ValidationUIManager: Specialized handlers initialized");
        console.log("[DEBUG] firebaseHandler:", !!this.firebaseHandler);
        console.log("[DEBUG] panelManager:", !!this.panelManager);
        console.log("[DEBUG] issueManager:", !!this.issueManager);
    }

    /**
     * Initiates the GMC validation process.
     * Checks authentication, fetches feed data, calls the validator, and displays results.
     * This method orchestrates the entire validation flow.
     */
    async triggerGMCValidation() {
        console.log('[DEBUG] triggerGMCValidation called');
        const { loadingManager, errorManager, gmcValidator, feedManager, monitor, gmcApi, customRuleValidator } = this.managers;
        
        console.log('[DEBUG] Managers available:');
        console.log('[DEBUG] - loadingManager:', !!loadingManager);
        console.log('[DEBUG] - errorManager:', !!errorManager);
        console.log('[DEBUG] - gmcValidator:', !!gmcValidator);
        console.log('[DEBUG] - feedManager:', !!feedManager);
        console.log('[DEBUG] - monitor:', !!monitor);
        console.log('[DEBUG] - gmcApi:', !!gmcApi);

        // Validate required dependencies
        if (!gmcValidator || !feedManager || !loadingManager || !errorManager || !monitor || !gmcApi) {
            console.error("[DEBUG] ValidationUIManager: Missing required manager dependencies for validation.");
            errorManager.showError("Cannot validate feed: Internal setup error.");
            return;
        }

        loadingManager.showLoading('Validating feed with Google Merchant Center...');
        try {
            monitor.logOperation('gmc_validation', 'started');

            // Ensure GMC authentication
            if (!gmcApi.isAuthenticated) {
                console.log('GMC Validation: Not authenticated. Attempting re-auth via gmcApi...');
                const authSuccess = await gmcApi.authenticate();
                if (!authSuccess) {
                    throw new Error('Authentication required to validate with GMC.');
                }
            }

            // Switch to validation tab
            this.switchToValidationTab();

            // Generate feedId and get feed data
            const feedId = `GMC-VAL-${Date.now().toString().slice(-6)}`;
            const feedData = feedManager.getCorrectedTableData();
            
            if (!feedData?.length) {
                errorManager.showError('No feed data available to validate.');
                monitor.logOperation('gmc_validation', 'failed', { reason: 'no_data' });
                return;
            }

            // Run GMC Validation
            console.log(`ValidationUIManager: Validating ${feedData.length} items with GMC...`);
            const gmcResults = await gmcValidator.validate(feedData);
            console.log('ValidationUIManager: GMC Validation Results:', gmcResults);
            
            // Initialize final results with GMC results
            let finalIssues = gmcResults.issues || [];
            let finalIsValid = gmcResults.isValid;

            // Run Custom Rule Validation (if Pro)
            const authState = this.managers.authManager.getAuthState();
            if (authState.isProUser && customRuleValidator) {
                await this.runCustomRuleValidation(customRuleValidator, feedData, finalIssues, finalIsValid);
            } else {
                console.log("Skipping custom rules (User not Pro or validator not available).");
            }

            // Combine and display results
            loadingManager.showLoading('Processing results...');
            const finalResults = {
                ...gmcResults,
                isValid: finalIsValid,
                issues: finalIssues
            };

            this.displayValidationResults(feedId, finalResults);

            monitor.logOperation('combined_validation', 'completed', { issues: finalIssues.length });
            errorManager.showSuccess('Validation complete.', 3000);

        } catch (error) {
            monitor.logError(error, 'triggerGMCValidation');
            console.error('ValidationUIManager: GMC Validation failed:', error);
            errorManager.showError(`GMC Validation failed: ${error.message}`);
            monitor.logOperation('gmc_validation', 'failed', { error: error.message });
        } finally {
            loadingManager.hideLoading();
        }
    }

    /**
     * Switches to the validation tab.
     * @private
     */
    switchToValidationTab() {
        console.log('[DEBUG] ValidationUIManager: switchToValidationTab called');
        
        // Find the validation tab button
        const validationTabButton = document.querySelector('.tab-button[data-tab="validation"]');
        console.log('[DEBUG] ValidationUIManager: Found validation tab button:', validationTabButton);
        
        if (validationTabButton) {
            // Click the button to trigger the tab switching logic in popup_event_handlers.js
            console.log('[DEBUG] ValidationUIManager: Clicking validation tab button');
            validationTabButton.click();
            
            // Double-check if the tab is visible after a short delay
            setTimeout(() => {
                const validationPanel = document.getElementById('validation-tab');
                if (validationPanel) {
                    console.log('[DEBUG] ValidationUIManager: Validation panel found:', validationPanel);
                    console.log('[DEBUG] ValidationUIManager: Validation panel is visible:', validationPanel.classList.contains('active'));
                    
                    // If not visible, try to force it
                    if (!validationPanel.classList.contains('active')) {
                        console.log('[DEBUG] ValidationUIManager: Forcing validation panel to be visible');
                        
                        // Deactivate all tabs first
                        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                        
                        // Activate validation tab
                        validationPanel.classList.add('active');
                        validationTabButton.classList.add('active');
                    }
                }
            }, 100);
        } else {
            console.warn('[DEBUG] ValidationUIManager: Validation tab button not found');
            
            // Try to find the validation tab directly
            const validationPanel = document.getElementById('validation-tab');
            if (validationPanel) {
                console.log('[DEBUG] ValidationUIManager: Found validation panel directly:', validationPanel);
                
                // Deactivate all tabs first
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                
                // Activate validation tab
                validationPanel.classList.add('active');
                
                // Try to find and activate the corresponding button
                const correspondingButton = document.querySelector('.tab-button[data-tab="validation"]');
                if (correspondingButton) correspondingButton.classList.add('active');
            } else {
                console.warn('[DEBUG] ValidationUIManager: Validation tab panel not found');
            }
        }
    }

    /**
     * Runs custom rule validation if the user is Pro.
     * @private
     * @param {CustomRuleValidator} customRuleValidator - The custom rule validator instance.
     * @param {Array} feedData - The feed data to validate.
     * @param {Array} finalIssues - The array of issues to update with custom rule results.
     * @param {boolean} finalIsValid - The current validity status to update.
     * @returns {Promise<void>}
     */
    async runCustomRuleValidation(customRuleValidator, feedData, finalIssues, finalIsValid) {
        const { loadingManager, errorManager, monitor } = this.managers;
        
        console.log("User is Pro, applying custom rules...");
        loadingManager.showLoading('Applying custom rules...');
        
        try {
            await customRuleValidator.fetchCustomRules();
            const customIssues = await customRuleValidator.validate(feedData);
            console.log('ValidationUIManager: Custom Rule Results:', customIssues);

            if (customIssues && customIssues.length > 0) {
                // Merge issues
                Array.prototype.push.apply(finalIssues, customIssues);
                // Update validity status
                finalIsValid = finalIsValid && (customIssues.length === 0);
                monitor.logOperation('custom_validation', 'completed', { issues: customIssues.length });
            } else {
                monitor.logOperation('custom_validation', 'completed', { issues: 0 });
            }
        } catch (customError) {
            console.error("ValidationUIManager: Custom rule validation failed:", customError);
            errorManager.showError(`Custom rule validation failed: ${customError.message}`);
            monitor.logOperation('custom_validation', 'failed', { error: customError.message });
        }
    }

    /**
     * Creates and displays the floating validation panel with results.
     * Also updates the validation history table and saves results to Firestore.
     * @param {string} feedId - A unique ID for this validation run.
     * @param {object} results - The validation results object from GMCApi/GMCValidator.
     *                           Format: { isValid, totalProducts, validProducts, issues: [{ rowIndex, field, type, message }] }
     */
    displayValidationResults(feedId, results) {
        if (!results) {
            this.managers.errorManager.showError("Cannot display validation results: No data provided.");
            return;
        }
        
        console.log(`Displaying validation results for ${feedId}`, results);

        // Store results locally
        this.validationResults[feedId] = results;

        // Use the issue manager to process issues
        this.issueManager.populateOfferIdMap(results.issues);
        this.issueManager.addMissingValidationIssues(results);

        // Update history tab with the new validation run
        this.updateValidationHistory(feedId, results);

        // Save to Firestore asynchronously
        this.saveResultsToFirestore(feedId, results);
        
        // Switch to the validation tab to show the results
        this.switchToValidationTab();
        
        // Show success message
        this.managers.errorManager.showSuccess(`Validation complete. Results shown in Validation History tab.`, 3000);
        
        console.log('[DEBUG] Validation results displayed in Validation History tab');
    }
    
    /**
     * Saves validation results to Firestore asynchronously.
     * @private
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} results - The validation results to save.
     */
    saveResultsToFirestore(feedId, results) {
        this.firebaseHandler.saveValidationToFirestore(feedId, results)
            .then(docId => {
                if (docId) {
                    console.log(`[ValidationUIManager] Initiated save to Firestore for ${feedId}, Doc ID: ${docId}`);
                } else {
                    console.log(`[ValidationUIManager] Skipped saving validation history for ${feedId} (e.g., user not logged into Firebase).`);
                }
            })
            .catch(error => {
                // Error is already logged within saveValidationToFirestore
                console.error(`[ValidationUIManager] Background save to Firestore failed for ${feedId}:`, error);
            });
    }

    /**
     * Loads validation history from Firestore for the current user and populates the history table.
     * Delegates most of the work to the Firebase handler.
     * @param {number} [limit=25] - The maximum number of history entries to retrieve.
     * @param {string} [sortBy='newest'] - Sort order ('newest' or 'oldest').
     */
    async loadValidationHistoryFromFirestore(limit = 25, sortBy = 'newest') {
        const historyTableBody = this.elements.historyTableBody;
        if (!historyTableBody) {
            console.error('Cannot load history: History table body not found.');
            return;
        }
        
        try {
            // Use the Firebase handler to load history
            const historyEntries = await this.firebaseHandler.loadValidationHistoryFromFirestore(
                historyTableBody, limit, sortBy
            );
            
            if (!historyEntries || historyEntries.length === 0) {
                // Error or empty results already handled by the Firebase handler
                return;
            }
            
            // Clear any existing content
            historyTableBody.innerHTML = '';
            
            // Populate the history table with the entries
            this.populateHistoryTable(historyEntries, sortBy);
            
        } catch (error) {
            console.error(`Error in loadValidationHistoryFromFirestore:`, error);
            historyTableBody.innerHTML = '<tr><td colspan="5">Error loading history. Please try again.</td></tr>';
            this.managers.errorManager?.showError("Failed to load validation history.");
            this.managers.monitor?.logError(error, 'loadValidationHistoryFromFirestore');
        }
    }
    
    /**
     * Populates the history table with the provided entries.
     * @private
     * @param {Array} historyEntries - The history entries to display.
     * @param {string} sortBy - The sort order ('newest' or 'oldest').
     */
    populateHistoryTable(historyEntries, sortBy) {
        const historyTableBody = this.elements.historyTableBody;
        
        // Determine how to add rows based on sort order
        const addRowMethod = sortBy === 'oldest'
            ? (row) => historyTableBody.appendChild(row) // Append for oldest first
            : (row) => historyTableBody.insertBefore(row, historyTableBody.firstChild); // Prepend for newest first
        
        // Add each history entry to the table
        historyEntries.forEach(historyData => {
            const docId = historyData.id;
            
            // Reconstruct a minimal 'results' object needed for display logic
            const pseudoResults = {
                isValid: historyData.isValid,
                issues: [], // Placeholder - full issues not retrieved from this query
                // Use summary data for issue count display
                issueCount: historyData.summary?.totalIssues ?? historyData.summary?.errorCount ?? 0,
                errorCount: historyData.summary?.errorCount ?? 0,
                warningCount: historyData.summary?.warningCount ?? 0,
                totalIssues: historyData.summary?.totalIssues ?? 0
            };
            
            // Use the helper method to create the row element
            const rowElement = this.createHistoryTableRowElement(docId, historyData, pseudoResults);
            
            // Add the row using the determined method (append/prepend)
            if (rowElement) {
                addRowMethod(rowElement);
            }
        });
    }

    /**
     * Creates a table row element for a validation history entry
     * @param {string} historyId - The ID of the history entry
     * @param {object} historyData - The history data
     * @param {object} displayResults - Simplified results for display
     * @returns {HTMLTableRowElement} The created row element
     */
    createHistoryTableRowElement(historyId, historyData, displayResults) {
        const row = document.createElement('tr');
        row.dataset.historyId = historyId;
        
        // Format timestamp
        const timestamp = historyData.timestamp instanceof Date ? historyData.timestamp :
                         (historyData.timestamp?.toDate ? historyData.timestamp.toDate() : new Date());
        const timeString = timestamp.toLocaleString();
        
        // Create status class based on validity
        const statusClass = displayResults.isValid ? 'status-valid' : 'status-invalid';
        const statusText = displayResults.isValid ? 'Valid' : 'Issues Found';
        
        // Create issue count text
        const issueText = displayResults.totalIssues > 0
            ? `${displayResults.totalIssues} (${displayResults.errorCount} errors, ${displayResults.warningCount} warnings)`
            : 'None';
        
        // Set row content
        // Create cells programmatically to avoid innerHTML CSP issues
        const timeCell = row.insertCell();
        timeCell.textContent = timeString;

        const feedIdCell = row.insertCell();
        feedIdCell.textContent = historyData.feedId || 'Unknown';

        const statusCell = row.insertCell();
        statusCell.className = statusClass;
        statusCell.textContent = statusText;

        const issueCell = row.insertCell();
        issueCell.textContent = issueText;

        const actionCell = row.insertCell();
        const viewDetailsBtn = document.createElement('button');
        viewDetailsBtn.className = 'view-details-btn modern-button small';
        viewDetailsBtn.dataset.historyId = historyId;
        viewDetailsBtn.textContent = 'View Details';
        actionCell.appendChild(viewDetailsBtn);
        
        // Event listener is already added to the created button above.
        // Redundant querySelector and if block removed.
        
        return row;
    }

    /**
     * Displays a summary of a validation history entry
     * Delegates to the panel manager for displaying the summary panel.
     * @param {string} historyId - The ID of the history entry to display
     */
    async displayHistorySummary(historyId) {
        console.log(`Displaying summary for history entry ${historyId}`);
        this.managers.loadingManager?.showLoading('Loading summary...');
        
        try {
            // Try to find history data in memory or fetch from Firestore
            const historyData = await this.getHistoryData(historyId);
            
            // Create and display the summary panel
            if (historyData) {
                this.panelManager.createAndShowSummaryPanel(historyId, historyData);
            } else {
                this.managers.errorManager?.showError("Could not find history data");
            }
        } catch (error) {
            console.error(`Error fetching history data: ${error.message}`);
            this.managers.errorManager?.showError(`Failed to load history: ${error.message}`);
        } finally {
            this.managers.loadingManager?.hideLoading();
        }
    }
    
    /**
     * Gets history data from memory or Firestore.
     * @private
     * @param {string} historyId - The ID of the history entry to get.
     * @returns {Promise<object|null>} - The history data if found, null otherwise.
     */
    async getHistoryData(historyId) {
        // Check if we have the history data in memory
        for (const feedId in this.validationResults) {
            if (this.validationResults[feedId].historyId === historyId) {
                return this.validationResults[feedId];
            }
        }
        
        // If not found in memory, try to fetch from Firestore
        try {
            return await this.firebaseHandler.fetchHistoryEntry(historyId);
        } catch (error) {
            console.error(`Error fetching history data from Firestore: ${error.message}`);
            return null;
        }
    }

    /**
     * Updates the validation history table with a new validation run.
     * This method only adds the current run to the history table.
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} results - The validation results to add to the history table.
     */
    updateValidationHistory(feedId, results) {
        console.log('[DEBUG] updateValidationHistory called with feedId:', feedId);
        console.log('[DEBUG] updateValidationHistory results:', results);
        
        if (!this.elements.historyTableBody) {
            console.error('[DEBUG] Validation history table body not found');
            return;
        }
        
        if (!results) {
            console.error('[DEBUG] No results provided to updateValidationHistory');
            return;
        }

        // Clear placeholder rows if present
        this.clearPlaceholderRows();

        // Create display results object for the current run
        const displayResults = {
            isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0),
            issueCount: results.issues?.length || 0,
            errorCount: results.issues?.filter(i => i.type === 'error').length || 0,
            warningCount: results.issues?.filter(i => i.type === 'warning').length || 0,
            totalIssues: results.issues?.length || 0
        };
        console.log('[DEBUG] Created displayResults:', displayResults);
        
        // Create and add the row element for the current run
        const rowElement = this.createHistoryTableRowElement(
            feedId,
            { feedId: feedId, timestamp: new Date() },
            displayResults
        );
        console.log('[DEBUG] Created history row element:', rowElement);
        
        // Add the row to the top of the table
        if (rowElement && this.elements.historyTableBody) {
            this.elements.historyTableBody.insertBefore(rowElement, this.elements.historyTableBody.firstChild);
            console.log('[DEBUG] Row added to history table, now setting up View Issues button');
            this.setupViewIssuesButton(rowElement, feedId, results);
            console.log('[DEBUG] View Issues button setup completed');
        } else {
            console.error('[DEBUG] Failed to add row to history table - rowElement or historyTableBody missing');
        }
    }
    
    /**
     * Clears placeholder rows from the history table.
     * @private
     */
    clearPlaceholderRows() {
        const placeholderRow = this.elements.historyTableBody.querySelector('td[colspan="5"]');
        if (placeholderRow && (
            placeholderRow.textContent.includes('No validation history found') || 
            placeholderRow.textContent.includes('Loading history')
        )) {
            this.elements.historyTableBody.innerHTML = '';
        }
    }
    
    /**
     * Sets up the "View Issues" button for the current run.
     * @private
     * @param {HTMLElement} rowElement - The row element containing the button.
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} results - The validation results.
     */
    setupViewIssuesButton(rowElement, feedId, results) {
        const viewDetailsBtn = rowElement.querySelector('.view-details-btn');
        if (viewDetailsBtn) {
            viewDetailsBtn.addEventListener('click', () => {
                console.log('[DEBUG] View Details button clicked for feedId:', feedId);
                
                try {
                    console.log('[DEBUG] VUIManager: setupViewIssuesButton try block entered. panelManager:', this.panelManager); // ADDED LOG
                    // Try to use handleViewDetails method first
                    if (this.panelManager && typeof this.panelManager.handleViewDetails === 'function') {
                        console.log('[DEBUG] VUIManager: panelManager.handleViewDetails exists. Attempting to call...'); // MODIFIED LOG
                        this.panelManager.handleViewDetails(feedId, results);
                        console.log('[DEBUG] VUIManager: panelManager.handleViewDetails called successfully.'); // ADDED LOG
                    }
                    // Fall back to createAndShowSummaryPanel if handleViewDetails is not available
                    else if (this.panelManager && typeof this.panelManager.createAndShowSummaryPanel === 'function') {
                        console.log('[DEBUG] Using createAndShowSummaryPanel method');
                        this.panelManager.createAndShowSummaryPanel(feedId, results);
                    }
                    // Use direct panel creation as a last resort
                    else {
                        console.log('[DEBUG] Using direct panel creation');
                        this.createDirectValidationPanel(feedId, results);
                    }
                } catch (error) {
                    console.error('[DEBUG] VUIManager: Error caught in setupViewIssuesButton try block:', error); // MODIFIED LOG
                    // Final fallback
                    this.createDirectValidationPanel(feedId, results);
                }
            });
        }
    }

    /**
     * Marks an issue as fixed.
     * @param {string} offerId - The ID of the offer with the issue.
     * @param {string} fieldName - The field name of the issue.
     */
    markIssueAsFixed(offerId, fieldName) {
        console.log(`Marking issue as fixed for offer ${offerId}, field ${fieldName}`);
        // Implementation would update the issue status in the validation results
    }

    /**
     * Creates a validation panel directly as a fallback if the panel manager is not available.
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} results - The validation results to display.
     */
    createDirectValidationPanel(feedId, results) {
        console.log('[DEBUG] Creating direct validation panel as fallback');
        
        if (!results) {
            console.error('[DEBUG] Cannot create direct validation panel: No results provided');
            return;
        }
        
        try {
            // Create panel element
            const panel = document.createElement('div');
            panel.className = 'floating-validation-panel';
            panel.dataset.feedId = feedId;
            
            // Get issue count
            const issueCount = results.issues?.length || 0;
            
            // Create panel content
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>GMC Validation Issues</h3>
                    <button class="close-panel" title="Close Panel">&times;</button>
                </div>
                <div class="validation-summary">
                    <span class="issue-count ${issueCount > 0 ? 'has-issues' : ''}">${issueCount} Issues Found</span>
                    <span class="feed-id">Feed ID: ${feedId}</span>
                    <span class="validation-status ${results.isValid ? 'valid' : 'invalid'}">${results.isValid ? 'Feed Valid' : 'Feed Invalid'}</span>
                </div>
                <div class="issues-container">
                    ${this.formatIssuesList(results.issues)}
                </div>
            `;
            
            // Add close button functionality
            const closeBtn = panel.querySelector('.close-panel');
            if (closeBtn) {
                closeBtn.onclick = () => panel.remove();
            }
            
            // Add to document
            document.body.appendChild(panel);
            
            // Position the panel
            panel.style.display = 'block';
            panel.style.opacity = '1';
            panel.style.right = '20px';
            panel.style.top = '150px';
            
            console.log('[DEBUG] Direct validation panel created successfully');
        } catch (error) {
            console.error('[DEBUG] Error creating direct validation panel:', error);
        }
    }
    
    /**
     * Formats the issues list for display in the panel.
     * @param {Array} issues - The validation issues to format.
     * @returns {string} - The formatted HTML for the issues.
     */
    formatIssuesList(issues) {
        if (!issues || !issues.length) {
            return '<p class="no-issues">No issues found according to Google Merchant Center!</p>';
        }
        
        // Group issues by row
        const issuesByRow = {};
        issues.forEach(issue => {
            const rowIndex = issue.rowIndex || 'unknown';
            if (!issuesByRow[rowIndex]) {
                issuesByRow[rowIndex] = [];
            }
            issuesByRow[rowIndex].push(issue);
        });
        
        // Format the issues list
        return `
            <div class="issues-list gmc-issues">
                <h4>GMC Validation Issues</h4>
                ${Object.entries(issuesByRow).map(([rowIndex, rowIssues]) => `
                    <div class="issue-group">
                        <div class="issue-group-header">
                            <strong>Row ${rowIndex}</strong>
                            ${rowIndex !== 'unknown' ? `<a href="#" class="row-link" data-row="${rowIndex}" title="Scroll to row ${rowIndex}">Go to Row</a>` : ''}
                        </div>
                        ${rowIssues.map(issue => {
                            const offerId = issue.offerId || issue['Offer ID'] || '';
                            return `
                            <div class="issue-item ${issue.type || 'error'}"
                                 data-row="${rowIndex}"
                                 data-field="${issue.field || 'general'}"
                                 data-offer-id="${offerId}">
                                <span class="issue-severity">${issue.type || 'error'}</span>
                                <span class="issue-message">${issue.message || 'Unknown issue'}</span>
                                ${issue.field && issue.field !== 'general' ? `<span class="issue-field">(Field: ${issue.field})</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Make globally available
window.ValidationUIManager = ValidationUIManager;