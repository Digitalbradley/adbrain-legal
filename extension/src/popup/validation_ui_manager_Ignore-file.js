/**
 * Manages the UI related to displaying validation results,
 * including the floating panel and the history tab.
 */
class ValidationUIManager {
    /**
     * @param {object} elements - DOM element references.
     * @param {HTMLElement} elements.historyTableBody - tbody element for validation history.
     * @param {object} managers - Other manager instances.
     * @param {FeedManager} managers.feedManager - For navigating to rows.
     * @param {ErrorManager} managers.errorManager
     * @param {AuthManager} managers.authManager - For accessing user state.
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers; // Includes feedManager, errorManager, authManager, etc.
        this.activeValidationPanel = null; // Track the currently open panel
        // Store validation results locally within this manager if needed, or access via PopupManager
        this.validationResults = {};
        this.offerIdToValidatorRowIndexMap = {}; // Map offerId to the rowIndex provided by the validator

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
    }

   /**
    * Initiates the GMC validation process.
    * Checks authentication, fetches feed data, calls the validator, and displays results.
    */
   async triggerGMCValidation() {
       const { loadingManager, errorManager, gmcValidator, feedManager, monitor, gmcApi } = this.managers; // Destructure needed managers/apis

       if (!gmcValidator || !feedManager || !loadingManager || !errorManager || !monitor || !gmcApi) {
            console.error("ValidationUIManager: Missing required manager dependencies for validation.");
            errorManager.showError("Cannot validate feed: Internal setup error.");
            return;
       }

       loadingManager.showLoading('Validating feed with Google Merchant Center...');
       try {
           monitor.logOperation('gmc_validation', 'started');

           // Ensure authenticated (using the passed gmcApi instance)
           if (!gmcApi.isAuthenticated) {
               // Attempt re-authentication if needed (might need access to PopupManager's verify method or similar)
               // For now, just show error if not authenticated. A better approach might involve event bubbling.
                console.log('GMC Validation: Not authenticated. Attempting re-auth via gmcApi...');
                const authSuccess = await gmcApi.authenticate(); // Assuming gmcApi has authenticate
                if (!authSuccess) {
                   throw new Error('Authentication required to validate with GMC.');
                }
                // If auth succeeded, the status bar should update elsewhere (e.g., via StatusBarManager observing gmcApi)
           }

           // Switch to validation tab (using passed element reference)
           if (this.elements.validationTab) {
               // Basic tab switching logic - assumes sibling structure or specific classes
               const tabContainer = this.elements.validationTab.closest('.tab-content');
               if (tabContainer) {
                   tabContainer.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                   tabContainer.parentElement.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                   this.elements.validationTab.classList.add('active');
                   const correspondingButton = tabContainer.parentElement.querySelector(`.tab-button[data-tab="validation"]`);
                   if (correspondingButton) correspondingButton.classList.add('active');
               } else {
                   console.warn("Could not find tab container for validation tab switching.");
               }
           } else {
                console.warn("Validation tab element not provided to ValidationUIManager.");
           }


           // Generate feedId
           const feedId = `GMC-VAL-${Date.now().toString().slice(-6)}`;

           // Get feed data via FeedManager
           const feedData = feedManager.getCorrectedTableData();
           if (!feedData?.length) {
               errorManager.showError('No feed data available to validate.');
               monitor.logOperation('gmc_validation', 'failed', { reason: 'no_data' });
               return; // Exit early
           }

           // --- Run GMC Validation ---
           console.log(`ValidationUIManager: Calling gmcValidator.validate for ${feedData.length} items...`);
           const gmcResults = await gmcValidator.validate(feedData);
           console.log('ValidationUIManager: GMC Validation Results:', gmcResults);
           let finalIssues = gmcResults.issues || [];
           let finalIsValid = gmcResults.isValid; // Start with GMC validity

           // --- Run Custom Rule Validation (if Pro) ---
           const authState = this.managers.authManager.getAuthState();
           const customRuleValidator = this.managers.customRuleValidator; // Get instance

           if (authState.isProUser && customRuleValidator) {
               console.log("User is Pro, applying custom rules...");
               loadingManager.showLoading('Applying custom rules...'); // Update loading message
               try {
                   await customRuleValidator.fetchCustomRules(); // Load rules first
                   const customIssues = await customRuleValidator.validate(feedData);
                   console.log('ValidationUIManager: Custom Rule Results:', customIssues);

                   if (customIssues && customIssues.length > 0) {
                       // Merge issues (simple concatenation for now, could add deduplication later)
                       finalIssues = finalIssues.concat(customIssues);
                       // If custom rules find issues, the overall result might become invalid
                       finalIsValid = finalIsValid && (customIssues.length === 0);
                        monitor.logOperation('custom_validation', 'completed', { issues: customIssues.length });
                   } else {
                        monitor.logOperation('custom_validation', 'completed', { issues: 0 });
                   }
               } catch (customError) {
                    console.error("ValidationUIManager: Custom rule validation failed:", customError);
                    errorManager.showError(`Custom rule validation failed: ${customError.message}`); // Show non-blocking error
                    monitor.logOperation('custom_validation', 'failed', { error: customError.message });
                    // Proceed with only GMC results if custom validation fails
               }
           } else {
                console.log("Skipping custom rules (User not Pro or validator not available).");
           }

           // --- Combine Results and Display ---
           loadingManager.showLoading('Processing results...'); // Update loading message
           const finalResults = {
               ...gmcResults, // Keep other properties like totalProducts, validProducts from GMC results
               isValid: finalIsValid,
               issues: finalIssues
           };

           // Display combined results
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
    * Creates and displays the floating validation panel with results.
     * Also updates the validation history table.
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

        // Store results
        this.validationResults[feedId] = results;

        // Populate the offerId -> validatorRowIndex map
        this.offerIdToValidatorRowIndexMap = {}; // Clear map for new results
        if (results.issues && Array.isArray(results.issues)) {
            results.issues.forEach(issue => {
                // Assuming 'offerId' exists in the issue object from the validator
                const offerId = issue.offerId || issue['Offer ID']; // Adjust if key name differs
                if (offerId && issue.rowIndex !== undefined) {
                    // Store the mapping. If multiple issues exist for the same offerId,
                    // they should share the same validator rowIndex.
                    this.offerIdToValidatorRowIndexMap[offerId] = issue.rowIndex;
                } else {
                    console.warn(`[ValidationUIManager] Issue missing offerId or rowIndex, cannot map:`, issue);
                }
            });
        }
        console.log('[ValidationUIManager] Populated offerIdToValidatorRowIndexMap:', this.offerIdToValidatorRowIndexMap); // ADDED LOG

        // Check for missing validation issues from the feed preview table
        this.addMissingValidationIssues(results);

        // Update history tab
        this.updateValidationHistory(feedId, results);

        // --- Save to Firestore ---
        // Call the save method asynchronously (don't need to wait for it here)
        this.saveValidationToFirestore(feedId, results)
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
        // -------------------------


        // Show floating panel - REMOVED automatic call. Panel is now shown only via history button.
        // this.handleViewDetails(feedId, results);
    }

    /**
     * Checks the feed preview table for fields that don't meet requirements
     * and adds them to the validation results if they're not already there.
     * Also removes validation issues for fields that now meet requirements.
     * @param {object} results - The validation results object to update
     */
    addMissingValidationIssues(results) {
        if (!this.managers.feedManager) {
            console.warn('[ValidationUIManager] Cannot check for missing validation issues: FeedManager not available');
            return;
        }
        
        console.log('[ValidationUIManager] Checking for missing validation issues in feed preview table');
        
        // Get all editable fields from the feed preview table
        const container = this.managers.feedManager.elements.previewContentContainer;
        if (!container) {
            console.warn('[ValidationUIManager] Cannot check for missing validation issues: previewContentContainer not available');
            return;
        }
        
        // Create a map of all offer IDs and their validation status
        const offerValidationMap = {};
        
        // First, process all fields to determine their validation status
        const allEditableFields = container.querySelectorAll('.editable-field');
        allEditableFields.forEach(field => {
            const fieldType = field.dataset.field;
            if (fieldType === 'title' || fieldType === 'description') {
                const content = field.textContent || '';
                const currentLength = content.length;
                
                // Define validation rules based on field type
                const isDescription = fieldType === 'description';
                const minLength = isDescription ? 90 : 30; // Title min is 30
                const maxLength = isDescription ? 5000 : 150; // Title max is 150
                
                // Get the row and offer ID
                const row = field.closest('tr');
                if (!row) return;
                
                const rowIndex = row.dataset.row;
                const offerId = row.dataset.offerId;
                
                if (!offerId || !rowIndex) return;
                
                // Initialize the offer in the map if it doesn't exist
                if (!offerValidationMap[offerId]) {
                    offerValidationMap[offerId] = {
                        rowIndex: parseInt(rowIndex),
                        fields: {}
                    };
                }
                
                // Store the validation status for this field
                offerValidationMap[offerId].fields[fieldType] = {
                    content: content,
                    length: currentLength,
                    isValid: currentLength >= minLength && currentLength <= maxLength,
                    minLength: minLength,
                    maxLength: maxLength
                };
            }
        });
        
        console.log('[ValidationUIManager] Offer validation map:', offerValidationMap);
        
        // Now, filter out issues for fields that are now valid
        results.issues = results.issues.filter(issue => {
            const offerId = issue.offerId || issue['Offer ID'];
            const fieldType = issue.field;
            
            // If we don't have validation info for this offer or field, keep the issue
            if (!offerId || !fieldType || !offerValidationMap[offerId] || !offerValidationMap[offerId].fields[fieldType]) {
                return true;
            }
            
            // If the field is now valid, remove the issue
            const isValid = offerValidationMap[offerId].fields[fieldType].isValid;
            if (isValid) {
                console.log(`[ValidationUIManager] Removing validation issue for Offer ID ${offerId}, Field ${fieldType} as it's now valid`);
                return false;
            }
            
            // Otherwise, keep the issue
            return true;
        });
        
        // Now, add missing issues for fields that are invalid
        Object.entries(offerValidationMap).forEach(([offerId, offerData]) => {
            Object.entries(offerData.fields).forEach(([fieldType, fieldData]) => {
                if (!fieldData.isValid) {
                    // Check if this issue is already in the results
                    const existingIssue = results.issues.find(issue => {
                        const issueOfferId = issue.offerId || issue['Offer ID'];
                        return issueOfferId === offerId && issue.field === fieldType;
                    });
                    
                    if (!existingIssue) {
                        // Add this issue to the results
                        const message = fieldData.length < fieldData.minLength
                            ? `Mock Warning: ${fieldType === 'title' ? 'Title' : 'Description'} may be too short for row ${offerData.rowIndex}.`
                            : `Mock Warning: ${fieldType === 'title' ? 'Title' : 'Description'} may be too long for row ${offerData.rowIndex}.`;
                        
                        const newIssue = {
                            rowIndex: offerData.rowIndex,
                            field: fieldType,
                            type: 'warning',
                            message: message,
                            offerId: offerId
                        };
                        
                        results.issues.push(newIssue);
                        console.log(`[ValidationUIManager] Added missing validation issue: ${message}`);
                    }
                    
                    // Update the mapping
                    this.offerIdToValidatorRowIndexMap[offerId] = offerData.rowIndex;
                }
            });
        });
        
        console.log(`[ValidationUIManager] Updated validation results now have ${results.issues.length} issues`);
    }

   /**
    * Saves the validation results to Firestore under the current user's history.
    * @param {string} feedId - The ID assigned to this validation run.
    * @param {object} results - The validation results object.
    * @returns {Promise<string|null>} - The Firestore document ID if successful, null otherwise.
    */
   async saveValidationToFirestore(feedId, results) {
       if (!this.managers.authManager) {
           console.error("Cannot save validation history: AuthManager not available.");
           return null;
       }
       // Ensure Firestore SDK is available (it should be loaded by background.js)
       if (typeof firebase === 'undefined' || !firebase.firestore) {
           console.error("Cannot save validation history: Firestore SDK not available.");
           // Attempt to access via background page as a fallback? Risky.
            try {
                const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                if (!bg || !bg.firebase || !bg.firebase.firestore) {
                    throw new Error("Firestore not found on background page either.");
                }
                // If found, reassign firebase locally for this function scope
                window.firebase = bg.firebase; // Make it available globally in this context if needed elsewhere? Careful.
                console.warn("Firestore SDK accessed via background page.");
            } catch (bgError) {
                console.error("Error accessing Firestore SDK via background page:", bgError);
                this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
                return null;
            }
       }


       const authState = this.managers.authManager.getAuthState();
       if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
           console.log("Cannot save validation history: User not authenticated with Firebase.");
           // Don't treat this as an error, just skip saving for non-Firebase users
           return null;
       }

       const userId = authState.firebaseUserId;
       console.log(`Attempting to save validation history for user ${userId}, feedId ${feedId}`);

       try {
           const db = firebase.firestore();
           const historyCollectionRef = db.collection('users').doc(userId).collection('validationHistory');

           // Prepare data according to the plan's schema
           const dataToSave = {
               timestamp: firebase.firestore.FieldValue.serverTimestamp(),
               feedId: feedId, // Or perhaps a more specific identifier if available
               totalProducts: results.totalProducts || 0,
               validProducts: results.validProducts || 0,
               // Limit issues array size to avoid exceeding Firestore document limits
               // Using a smaller limit initially, adjust as needed.
               issues: results.issues ? results.issues.slice(0, 200) : [], // Store only a subset of issues
               summary: {
                   // Calculate summary based on the *full* issues list before slicing
                   titleIssues: results.issues?.filter(i => i.field === 'title').length || 0,
                   descriptionIssues: results.issues?.filter(i => i.field === 'description').length || 0,
                   otherIssues: results.issues?.filter(i => i.field && !['title', 'description'].includes(i.field)).length || 0,
                   // Add counts for different severity levels if available
                   errorCount: results.issues?.filter(i => i.type === 'error').length || 0,
                   warningCount: results.issues?.filter(i => i.type === 'warning').length || 0,
                   totalIssues: results.issues?.length || 0 // Store total count before slicing
               },
               isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0) // Determine overall validity
           };

           // Add a new document with an auto-generated ID
           const docRef = await historyCollectionRef.add(dataToSave);
           console.log(`Validation history saved successfully for user ${userId}. Document ID: ${docRef.id}`);
           this.managers.monitor?.logOperation('save_validation_history', 'success', { userId: userId, docId: docRef.id });
           return docRef.id;

       } catch (error) {
           console.error(`Error saving validation history for user ${userId}:`, error);
           this.managers.errorManager?.showError("Failed to save validation history.");
           this.managers.monitor?.logError(error, 'saveValidationToFirestore');
           return null;
       }
   }

  /**
   * Loads validation history from Firestore for the current user and populates the history table.
   * @param {number} [limit=25] - The maximum number of history entries to retrieve.
   * @param {string} [sortBy='newest'] - Sort order ('newest' or 'oldest').
   */
  async loadValidationHistoryFromFirestore(limit = 25, sortBy = 'newest') {
      // Check if feature flags are available
      const useFeatureFlags = typeof window.FEATURES !== 'undefined';
      const enableHistory = useFeatureFlags ? window.FEATURES.ENABLE_VALIDATION_HISTORY : true;
      const useMockFirebase = useFeatureFlags ? window.FEATURES.USE_MOCK_FIREBASE : false;
      const verboseLogging = useFeatureFlags ? window.FEATURES.VERBOSE_LOGGING : false;
      
      if (!enableHistory) {
          if (verboseLogging) console.log("Validation history is disabled by feature flag");
          return;
      }
      
      const historyTableBody = this.elements.historyTableBody;
      if (!historyTableBody) {
          console.error('Cannot load history: History table body not found.');
          return;
      }
      
      // Clear existing history rows before loading new ones
      historyTableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';

      if (!this.managers.authManager) {
          console.error("Cannot load validation history: AuthManager not available.");
          historyTableBody.innerHTML = '<tr><td colspan="5">Error: Auth service unavailable.</td></tr>';
          return;
      }
      
      // If using mock Firebase, provide mock history data
      if (useMockFirebase) {
          if (verboseLogging) console.log("Using mock Firebase for validation history (based on feature flag)");
          this.loadMockValidationHistory(limit, sortBy);
          return;
      }
      
      // Ensure Firestore SDK is available
      if (typeof firebase === 'undefined' || !firebase.firestore) {
           console.error("Cannot load validation history: Firestore SDK not available.");
            historyTableBody.innerHTML = '<tr><td colspan="5">Error: Database service unavailable.</td></tr>';
           // Attempt to access via background page as a fallback?
           try {
               const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
               if (!bg || !bg.firebase || !bg.firebase.firestore) {
                   throw new Error("Firestore not found on background page either.");
               }
               window.firebase = bg.firebase;
               console.warn("Firestore SDK accessed via background page for history loading.");
           } catch (bgError) {
               console.error("Error accessing Firestore SDK via background page:", bgError);
               this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
               historyTableBody.innerHTML = '<tr><td colspan="5">Error: Cannot connect to database service.</td></tr>';
               return;
           }
      }

      const authState = this.managers.authManager.getAuthState();
      if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
          console.log("Cannot load validation history: User not authenticated with Firebase.");
          historyTableBody.innerHTML = '<tr><td colspan="5">Sign in with Firebase to view validation history.</td></tr>';
          return;
      }

      const userId = authState.firebaseUserId;
      console.log(`Loading validation history for user ${userId}...`);
      const isPro = authState.isProUser; // Check pro status

      // Show/hide upgrade prompt
      // Ensure this runs within the popup's context where the element exists
      const upgradePrompt = document.getElementById('historyLimitPrompt');
      if (upgradePrompt) {
          upgradePrompt.style.display = isPro ? 'none' : 'block'; // Show if not pro
      } else {
          console.warn("History limit prompt element (#historyLimitPrompt) not found.");
      }


      try {
          const db = firebase.firestore();
          const sortDirection = sortBy === 'oldest' ? 'asc' : 'desc'; // Determine sort direction
          console.log(`Sorting history by timestamp ${sortDirection}`);

          let query = db.collection('users').doc(userId).collection('validationHistory')
                        .orderBy('timestamp', sortDirection); // Apply sort direction

          // Apply 7-day filter for non-pro users
          if (!isPro) {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              // Convert to Firestore Timestamp for comparison
              const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
              query = query.where('timestamp', '>=', sevenDaysAgoTimestamp);
              console.log("Applying 7-day filter for non-pro user");
          }

          // Apply limit
          query = query.limit(limit);

          // Execute query
          const snapshot = await query.get();

          // Clear the history table
          historyTableBody.innerHTML = '';

          // Check if we have results
          if (snapshot.empty) {
              historyTableBody.innerHTML = '<tr><td colspan="5">No validation history found.</td></tr>';
              return;
          }

          // Process results
          snapshot.forEach(doc => {
              const historyData = doc.data();
              historyData.id = doc.id; // Add the document ID to the data

              // Convert Firestore timestamp to Date if needed
              if (historyData.timestamp && typeof historyData.timestamp.toDate === 'function') {
                  historyData.timestamp = historyData.timestamp.toDate();
              }

              // Create a simplified version of the results for display
              const displayResults = {
                  isValid: historyData.isValid,
                  totalIssues: historyData.summary?.totalIssues || 0,
                  errorCount: historyData.summary?.errorCount || 0,
                  warningCount: historyData.summary?.warningCount || 0
              };

              // Create and append the row
              const row = this.createHistoryTableRowElement(doc.id, historyData, displayResults);
              historyTableBody.appendChild(row);
          });

          console.log(`Loaded ${snapshot.size} validation history entries`);

      } catch (error) {
          console.error("Error loading validation history:", error);
          this.managers.errorManager?.showError("Failed to load validation history.");
          historyTableBody.innerHTML = '<tr><td colspan="5">Error loading history: ' + error.message + '</td></tr>';
      }
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
      const timestamp = historyData.timestamp instanceof Date ? historyData.timestamp : new Date(historyData.timestamp);
      const timeString = timestamp.toLocaleString();
      
      // Create status class based on validity
      const statusClass = displayResults.isValid ? 'status-valid' : 'status-invalid';
      const statusText = displayResults.isValid ? 'Valid' : 'Issues Found';
      
      // Create issue count text
      const issueText = displayResults.totalIssues > 0 
          ? `${displayResults.totalIssues} (${displayResults.errorCount} errors, ${displayResults.warningCount} warnings)` 
          : 'None';
      
      // Set row content
      row.innerHTML = `
          <td>${timeString}</td>
          <td>${historyData.feedId || 'Unknown'}</td>
          <td class="${statusClass}">${statusText}</td>
          <td>${issueText}</td>
          <td>
              <button class="view-details-btn modern-button small" data-history-id="${historyId}">View Details</button>
          </td>
      `;
      
      // Add click handler for the view details button
      const viewDetailsBtn = row.querySelector('.view-details-btn');
      if (viewDetailsBtn) {
          viewDetailsBtn.addEventListener('click', () => this.displayHistorySummary(historyId));
      }
      
      return row;
  }

   /**
    * Displays a summary of a validation history entry
    * @param {string} historyId - The ID of the history entry to display
    */
   async displayHistorySummary(historyId) {
       console.log(`Displaying summary for history entry ${historyId}`);
       
       // Check if we have the history data in memory
       let historyData = null;
       
       // Try to find in the validation results
       for (const feedId in this.validationResults) {
           if (this.validationResults[feedId].historyId === historyId) {
               historyData = this.validationResults[feedId];
               break;
           }
       }
       
       // If not found in memory, try to fetch from Firestore
       if (!historyData) {
           try {
               // Check if feature flags are available
               const useFeatureFlags = typeof window.FEATURES !== 'undefined';
               const useMockFirebase = useFeatureFlags ? window.FEATURES.USE_MOCK_FIREBASE : false;
               
               if (useMockFirebase) {
                   // Use mock data
                   const mockHistory = [
                       {
                           id: 'mock-history-1',
                           timestamp: new Date(Date.now() - 86400000 * 2),
                           feedId: 'mock-feed-1',
                           totalProducts: 100,
                           validProducts: 90,
                           issues: [
                               {
                                   rowIndex: 1,
                                   offerId: 'product-1',
                                   field: 'title',
                                   type: 'warning',
                                   message: 'Title too short (20 chars). Minimum 30 characters recommended.'
                               },
                               {
                                   rowIndex: 2,
                                   offerId: 'product-2',
                                   field: 'description',
                                   type: 'error',
                                   message: 'Description missing required information.'
                               }
                           ],
                           summary: {
                               titleIssues: 1,
                               descriptionIssues: 1,
                               otherIssues: 0,
                               errorCount: 1,
                               warningCount: 1,
                               totalIssues: 2
                           },
                           isValid: false
                       }
                   ];
                   
                   historyData = mockHistory.find(h => h.id === historyId) || mockHistory[0];
               } else {
                   // Fetch from Firestore
