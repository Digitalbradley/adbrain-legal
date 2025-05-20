// Use global modules
// No need to import them since they're already available globally
// const CSVParser = window.CSVParser;
// const StatusManager = window.StatusManager;
// const FeedDisplayManager = window.FeedDisplayManager;
// const ContentTypeValidator = window.ContentTypeValidator;

// Use global debounce function from popup_utils.js

/**
 * Manages feed loading, parsing, preview display, and editable cells.
 */
class FeedManager {
    /**
     * @param {object} elements - DOM element references.
     * @param {HTMLInputElement} elements.fileInput
     * @param {HTMLButtonElement} elements.previewButton
     * @param {HTMLElement} elements.previewContentContainer
     * @param {object} managers - Other manager instances.
     * @param {LoadingManager} managers.loadingManager
     * @param {ErrorManager} managers.errorManager
     * @param {SearchManager} managers.searchManager
     * @param {MonitoringSystem} managers.monitor
     */
    constructor(elements, managers) {
        console.log('[FeedManager] Constructor called with managers:', Object.keys(managers || {}));
        
        this.elements = elements;
        this.managers = managers; // Store loadingManager, errorManager, searchManager, monitor, validationUIManager
        // <<< Note: validationUIManager is now expected here due to popup.js changes

        if (!this.elements.fileInput || !this.elements.previewButton || !this.elements.previewContentContainer) {
            console.error('FeedManager: Required DOM elements missing!', elements);
        }
        // Check for required managers, but don't require validationUIManager
        if (!this.managers.loadingManager || !this.managers.errorManager || !this.managers.searchManager || !this.managers.monitor) {
             console.error('FeedManager: Required managers missing!', managers);
        }
        // Just log a warning if validationUIManager is missing
        if (!this.managers.validationUIManager) {
             console.warn('FeedManager: ValidationUIManager not available during initialization. Will attempt to use it if it becomes available later.');
        } else {
             console.log('FeedManager: ValidationUIManager is available during initialization:', this.managers.validationUIManager);
        }

        // Initialize StatusManager if not provided
        if (!this.managers.statusManager) {
            console.log('[DEBUG] Creating StatusManager instance');
            this.managers.statusManager = new StatusManager();
        }
        
        // Initialize FeedDisplayManager if not provided
        if (!this.managers.displayManager) {
            console.log('[DEBUG] Creating FeedDisplayManager instance');
            this.managers.displayManager = new FeedDisplayManager(elements, managers);
            
            // Set up event listeners for editable fields
            this.managers.displayManager.setupEditableFieldListeners(this.handleFieldEdit.bind(this));
        }
        
        this.initialize();
    }

    initialize() {
        console.log('[DEBUG] Initializing FeedManager...');
        console.log('[DEBUG] FeedManager elements:', this.elements);
        console.log('[DEBUG] FeedManager managers:', Object.keys(this.managers || {}));
        
        // ContentTypeValidator is now imported directly as an ES module
        console.log('[DEBUG] ContentTypeValidator is available via ES module import');
        
        this.setupEventListeners();
        
        // Check if ValidationUIManager is available after initialization
        console.log('[FeedManager] After initialization, managers:', Object.keys(this.managers || {}));
        if (this.managers.validationUIManager) {
            console.log('[FeedManager] ValidationUIManager available after initialization:', this.managers.validationUIManager);
            console.log('[FeedManager] ValidationUIManager.markIssueAsFixed available:',
                typeof this.managers.validationUIManager.markIssueAsFixed === 'function');
        } else {
            console.log('[FeedManager] ValidationUIManager NOT available after initialization');
        }
    }

    setupEventListeners() {
        console.log('[DEBUG] Setting up event listeners in FeedManager');
        
        if (this.elements.fileInput) {
            console.log('[DEBUG] Setting up fileInput change listener');
            this.elements.fileInput.addEventListener('change', () => {
                console.log('[DEBUG] File input changed');
                if (this.elements.previewButton) {
                    this.elements.previewButton.disabled = !this.elements.fileInput.files?.length;
                    console.log('[DEBUG] Preview button disabled:', this.elements.previewButton.disabled);
                }
            });
            if (this.elements.previewButton) {
                this.elements.previewButton.disabled = !this.elements.fileInput.files?.length;
                console.log('[DEBUG] Initial preview button disabled state:', this.elements.previewButton.disabled);
            }
        } else { console.error("FeedManager: fileInput element not provided."); }

        if (this.elements.previewButton) {
            console.log('[DEBUG] Setting up previewButton click listener');
            console.log('[DEBUG] previewButton element:', this.elements.previewButton);
            
            // Remove any existing click listeners
            this.elements.previewButton.removeEventListener('click', this.handlePreviewBound);
            
            // Create a bound version of handlePreview
            this.handlePreviewBound = this.handlePreview.bind(this);
            
            // Add the new click listener
            this.elements.previewButton.addEventListener('click', this.handlePreviewBound);
            
            // Remove the duplicate click handler that was causing issues
            // The bound version above is sufficient and prevents duplicate calls
        } else { console.error("FeedManager: previewButton element not provided."); }
        
        // Add a single delegated event listener for all editable fields
        if (this.elements.previewContentContainer) {
            this.elements.previewContentContainer.addEventListener('input', debounce((event) => {
                // Check if the target is an editable field
                if (event.target.classList.contains('editable-field')) {
                    const fieldName = event.target.dataset.field;
                    const row = event.target.closest('tr');
                    
                    if (!row) {
                        console.warn('[FeedManager] Could not find parent row for field:', event.target);
                        return;
                    }
                    
                    const rowIndex = row.dataset.row;
                    const offerId = row.dataset.offerId;
                    
                    if (!offerId) {
                        console.warn(`[FeedManager] Cannot notify UI Manager: Missing offerId on row ${rowIndex}`);
                        return;
                    }
                    
                    // Define validation rules based on field name
                    const isDescription = fieldName === 'description';
                    const minLength = isDescription ? 90 : 30; // Title min is 30
                    const maxLength = isDescription ? 5000 : 150; // Title max is 150
                    
                    const content = event.target.textContent || '';
                    const currentLength = content.length;
                    
                    // Apply validation classes based on content length
                    if (currentLength < minLength) {
                        // Under minimum length - show error state
                        event.target.classList.add('under-minimum');
                        event.target.classList.remove('over-limit');
                        
                        // Only add needs-fix class if the row has been specifically navigated to
                        if (row.classList.contains('validation-focus')) {
                            row.classList.add('needs-fix'); // Add persistent yellow highlight
                        }
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentLength}/${minLength}`);
                    } else if (currentLength > maxLength) {
                        // Over maximum length - show error state
                        event.target.classList.remove('under-minimum');
                        event.target.classList.add('over-limit');
                        
                        // Only add needs-fix class if the row has been specifically navigated to
                        if (row.classList.contains('validation-focus')) {
                            row.classList.add('needs-fix'); // Add persistent yellow highlight
                        }
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentLength}/${maxLength}`);
                    } else {
                        // Valid length - show success state
                        event.target.classList.remove('under-minimum');
                        event.target.classList.remove('over-limit');
                        
                        // Apply green background to valid fields
                        event.target.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                        event.target.style.borderColor = '#28a745';
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) met length reqs (${currentLength}). Notifying UI Manager.`);
                        
                        // Check if all fields in the row are valid before removing the needs-fix class
                        console.log(`[FeedManager] Checking if all fields in row ${rowIndex} are valid...`);
                        const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                        console.log(`[FeedManager] Invalid fields in row ${rowIndex}: ${invalidFields.length}`);
                        
                        if (invalidFields.length === 0) {
                            console.log(`[FeedManager] All fields in row ${rowIndex} are valid. Updating UI...`);
                            row.classList.remove('needs-fix'); // Remove the persistent yellow highlight
                            row.classList.remove('validation-focus'); // Remove the validation focus marker
                            row.classList.add('fix-complete'); // Add temporary green success highlight
                            
                            // Notify ValidationUIManager to remove the issue from the panel
                            // Try to get the latest reference to validationUIManager from the managers object
                            console.log(`[FeedManager] Attempting to get ValidationUIManager...`);
                            console.log(`[FeedManager] this.managers:`, Object.keys(this.managers || {}));
                            
                            const validationUIManager = this.managers.validationUIManager;
                            console.log(`[FeedManager] validationUIManager available:`, !!validationUIManager);
                            
                            if (validationUIManager) {
                                console.log(`[FeedManager] ValidationUIManager methods:`,
                                    Object.getOwnPropertyNames(Object.getPrototypeOf(validationUIManager)));
                                console.log(`[FeedManager] validationUIManager.markIssueAsFixed available:`,
                                    typeof validationUIManager.markIssueAsFixed === 'function');
                            }
                            
                            if (validationUIManager && typeof validationUIManager.markIssueAsFixed === 'function') {
                                console.log(`[FeedManager] Notifying UI Manager to fix offerId: ${offerId}, field: ${fieldName}`);
                                const result = validationUIManager.markIssueAsFixed(offerId, fieldName);
                                console.log(`[FeedManager] markIssueAsFixed result: ${result}`);
                            } else {
                                console.warn("[FeedManager] ValidationUIManager or markIssueAsFixed method not available to notify.");
                                console.log("[FeedManager] managers:", Object.keys(this.managers || {}));
                            }
                            
                            // Clean up UI
                            setTimeout(() => row.classList.remove('fix-complete'), 1000);
                        }
                    }
                    
                    // Update the character count display to match validation state
                    const charCountDisplay = event.target.nextElementSibling;
                    if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                        charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                        charCountDisplay.style.color = (currentLength < minLength || currentLength > maxLength) ? '#dc3545' : '#28a745';
                    }
                }
            }, 300)); // Reduced debounce time from 500ms to 300ms for more responsive feedback
            console.log('[FeedManager] Added delegated input event listener to previewContentContainer');
        } else {
            console.error("FeedManager: previewContentContainer element not provided.");
        }
    }

    /**
     * Initializes or refreshes the feed status content element reference
     */
    initFeedStatusContent() {
        // Use the StatusManager to initialize the feed status content
        if (this.managers.statusManager) {
            this.managers.statusManager.initStatusContent();
        } else {
            console.error('[DEBUG] StatusManager not available for initializing feed status content');
        }
    }

    async handlePreview() {
        console.log('[DEBUG] ==================== PREVIEW FEED BUTTON CLICKED ====================');
        console.log('[DEBUG] handlePreview called');
        console.log('[DEBUG] this in handlePreview:', this);
        console.log('[DEBUG] this.elements in handlePreview:', this.elements);
        
        // Initialize feed status content element
        this.initFeedStatusContent();
        const { fileInput } = this.elements;
        console.log('[DEBUG] fileInput:', fileInput);
        console.log('[DEBUG] fileInput.files:', fileInput?.files);
        
        // Ensure managers exist before destructuring
        // Ensure all required managers are available with fallbacks if needed
        if (!this.managers.loadingManager) {
            this.managers.loadingManager = {
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
        
        if (!this.managers.errorManager) {
            this.managers.errorManager = {
                showError: (msg) => { console.error("Error:", msg); alert(`Error: ${msg}`); },
                showSuccess: (msg, duration) => {
                    console.log("Success:", msg);
                    // Create a temporary success message
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.textContent = msg;
                    document.body.appendChild(successMessage);
                    setTimeout(() => {
                        successMessage.classList.add('show');
                        setTimeout(() => {
                            successMessage.classList.remove('show');
                            setTimeout(() => {
                                if (successMessage.parentNode) {
                                    document.body.removeChild(successMessage);
                                }
                            }, 300);
                        }, duration || 2000);
                    }, 100);
                },
                showWarning: (msg, duration) => {
                    console.warn("Warning:", msg);
                    // Fallback if showWarning is not available
                    const warningMessage = document.createElement('div');
                    warningMessage.className = 'warning-message';
                    warningMessage.textContent = msg;
                    warningMessage.style.backgroundColor = '#fff3cd';
                    warningMessage.style.color = '#856404';
                    warningMessage.style.borderColor = '#ffeeba';
                    document.body.appendChild(warningMessage);
                    setTimeout(() => {
                        warningMessage.classList.add('fade-out');
                        setTimeout(() => {
                            if (warningMessage.parentNode) {
                                document.body.removeChild(warningMessage);
                            }
                        }, 300);
                    }, duration || 5000);
                }
            };
        }
        
        if (!this.managers.monitor) {
            this.managers.monitor = { logOperation: ()=>{}, logError: console.error };
        }
        
        console.log('[DEBUG] Managers:', this.managers);

        try {
            this.managers.monitor.logOperation('preview', 'started');

            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                console.log('[DEBUG] No file selected');
                this.managers.errorManager.showError('Please select a file first');
                this.managers.monitor.logOperation('preview', 'failed', { reason: 'no_file' });
                return;
            }
            
            console.log('[DEBUG] File selected:', fileInput.files[0].name);

            this.managers.loadingManager.showLoading('Processing feed...');
            
            // Clear feed status area
            if (this.managers.statusManager) {
                this.managers.statusManager.addInfo('Processing feed...');
            }

            const file = fileInput.files[0];
            const csvText = await this.readFileAsText(file);
            
            try {
                // Use the CSVParser module instead of the internal parseCSV method
                console.log('[DEBUG] Using CSVParser module to parse CSV');
                
                // ContentTypeValidator is now imported directly
                console.log('[DEBUG] Using ContentTypeValidator from ES module import');
                
                // Create a new CSVParser instance with required headers
                const csvParser = new CSVParser({
                    requiredHeaders: ['id', 'title', 'description', 'link', 'image_link']
                });
                
                // Parse the CSV text using the CSVParser module with ContentTypeValidator
                const { data, errors, warnings } = csvParser.parse(csvText, ContentTypeValidator);
                
                // Store warnings for later use (same as the original implementation)
                this.lastParseWarnings = warnings;
                
                // If there are errors, throw an exception with details (similar to original implementation)
                if (errors && errors.length > 0) {
                    const errorMessage = errors.map(e => e.message).join('\n');
                    const error = new Error(errorMessage);
                    error.details = { errors, warnings };
                    throw error;
                }
                
                // Clear feed status before displaying preview
                if (this.managers.statusManager) {
                    this.managers.statusManager.clearStatus();
                }
                
                // Use the FeedDisplayManager to display the preview
                if (this.managers.displayManager) {
                    await this.managers.displayManager.displayPreview(data);
                    
                    // Update the offerIdToRowIndexMap from the display manager
                    this.offerIdToRowIndexMap = this.managers.displayManager.getOfferIdToRowIndexMap();
                } else {
                    console.error('[DEBUG] DisplayManager not available for displaying preview');
                    return;
                }
                
                // Show success message in feed status area
                if (this.managers.statusManager) {
                    this.managers.statusManager.addSuccess(`Feed loaded successfully with ${data.length} products`);
                }
                
                // Show warnings if any were generated during parsing
                if (this.lastParseWarnings && this.lastParseWarnings.length > 0) {
                    // Group warnings by type for more concise display
                    const warningsByType = {};
                    this.lastParseWarnings.forEach(warning => {
                        if (!warningsByType[warning.type]) {
                            warningsByType[warning.type] = [];
                        }
                        warningsByType[warning.type].push(warning);
                    });
                    
                    // Create a user-friendly warning message
                    let warningMessage = `Feed loaded with ${this.lastParseWarnings.length} potential issues:\n`;
                    
                    if (warningsByType.too_many_columns || warningsByType.too_few_columns) {
                        const inconsistentRows = [
                            ...(warningsByType.too_many_columns || []),
                            ...(warningsByType.too_few_columns || [])
                        ];
                        if (inconsistentRows.length <= 3) {
                            warningMessage += `- Inconsistent columns in rows: ${inconsistentRows.map(w => w.row).join(', ')}\n`;
                        } else {
                            warningMessage += `- Inconsistent columns in ${inconsistentRows.length} rows\n`;
                        }
                    }
                    
                    if (warningsByType.unclosed_quote) {
                        warningMessage += `- Unclosed quotation marks detected in ${warningsByType.unclosed_quote.length} rows\n`;
                    }
                    
                    if (warningsByType.empty_required_fields) {
                        warningMessage += `- Missing required values in ${warningsByType.empty_required_fields.length} rows\n`;
                    }
                    
                    if (warningsByType.missing_headers_warning) {
                        warningMessage += `- ${warningsByType.missing_headers_warning[0].message}\n`;
                    }
                    
                    // Add content type warnings if any
                    if (warningsByType.content_type_issues) {
                        // Count non-title/description issues
                        const nonTitleDescIssues = [];
                        warningsByType.content_type_issues.forEach(warning => {
                            const filteredIssues = warning.issues.filter(issue =>
                                !(issue.field === 'title' || issue.field === 'description' ||
                                  issue.isTitleDescriptionIssue ||
                                  (issue.message && (
                                    issue.message.toLowerCase().includes('title') ||
                                    issue.message.toLowerCase().includes('description')
                                  ))
                                )
                            );
                            
                            if (filteredIssues.length > 0) {
                                nonTitleDescIssues.push({
                                    ...warning,
                                    issues: filteredIssues
                                });
                            }
                        });
                        
                        if (nonTitleDescIssues.length > 0) {
                            warningMessage += `- Content type issues detected in ${nonTitleDescIssues.length} rows\n`;
                            
                            // If there are only a few issues, show details
                            if (nonTitleDescIssues.length <= 3) {
                                nonTitleDescIssues.forEach(warning => {
                                    warningMessage += `  - Row ${warning.row}: ${warning.issues.map(issue =>
                                        `${issue.field} ${issue.message}`).join(', ')}\n`;
                                });
                            }
                        }
                        
                        // Add summary to feed status area
                        if (this.managers.statusManager) {
                            // Count non-title/description issues
                            let nonTitleDescIssueCount = 0;
                            warningsByType.content_type_issues.forEach(warning => {
                                const filteredIssues = warning.issues.filter(issue =>
                                    !(issue.field === 'title' || issue.field === 'description' ||
                                      issue.isTitleDescriptionIssue ||
                                      (issue.message && (
                                        issue.message.toLowerCase().includes('title') ||
                                        issue.message.toLowerCase().includes('description')
                                      ))
                                    )
                                );
                                
                                if (filteredIssues.length > 0) {
                                    nonTitleDescIssueCount++;
                                }
                            });
                            
                            if (nonTitleDescIssueCount > 0) {
                                this.managers.statusManager.addWarning(`Content type issues detected in ${nonTitleDescIssueCount} rows. See details in Feed Status area above.`);
                            }
                        }
                        
                        // Group issues by type for a more organized summary
                        const issuesByType = {};
                        warningsByType.content_type_issues.forEach(warning => {
                            warning.issues.forEach(issue => {
                                const key = `${issue.field} ${issue.message}`;
                                if (!issuesByType[key]) {
                                    issuesByType[key] = 0;
                                }
                                issuesByType[key]++;
                            });
                        });
                        
                        // Add issue summary to feed status
                        if (this.managers.statusManager) {
                            Object.entries(issuesByType).forEach(([issue, count]) => {
                                // Skip title and description issues
                                if (issue.toLowerCase().includes('title') || issue.toLowerCase().includes('description')) {
                                    console.log(`[FeedManager] Skipping title/description issue for feed status: ${issue}`);
                                    return;
                                }
                                this.managers.statusManager.addWarning(`${count} instances of: ${issue}`);
                            });
                        }
                    }
                    
                    // Replace popup alert with console log
                    console.log(`[DEBUG] Warning: ${warningMessage}`);
                    
                    // Update validation history tab if available
                    if (this.managers.validationUIManager) {
                        const feedId = 'WARNING-' + Date.now();
                        
                        // Convert warnings to validation issues format
                        const warningIssues = [];
                        Object.entries(warningsByType).forEach(([type, warnings]) => {
                            warnings.forEach(warning => {
                                warningIssues.push({
                                    type: 'warning',
                                    message: warning.message || `${type} warning`,
                                    severity: 'warning',
                                    row: warning.row || 'unknown',
                                    field: warning.field || 'general'
                                });
                            });
                        });
                        
                        this.managers.validationUIManager.displayValidationResults(feedId, {
                            issues: warningIssues,
                            isValid: false
                        }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                    }
                }
                
                // Update search columns after display
                if (this.managers.searchManager && typeof this.managers.searchManager.updateSearchColumns === 'function') {
                    this.managers.searchManager.updateSearchColumns();
                } else {
                    console.warn("SearchManager not available or missing updateSearchColumns method.");
                }
                
                this.managers.monitor.logOperation('preview', 'completed', { products: data.length, fileName: file.name });
                console.log(`[DEBUG] Preview loaded for ${file.name}`);
                
            } catch (parseError) {
                console.error('[DEBUG] CSV parsing error:', parseError);
                
                // Handle structured error with details
                if (parseError.details) {
                    const { errors, warnings } = parseError.details;
                    
                    // Log all errors and warnings
                    errors.forEach(err => console.error('[DEBUG] Error:', err.message));
                    warnings.forEach(warn => console.warn('[DEBUG] Warning:', warn.message));
                    
                    // Create a user-friendly error message
                    let errorMessage = 'Failed to preview file:\n';
                    
                    errors.forEach(err => {
                        errorMessage += `- ${err.message}\n`;
                    });
                    
                    // Add suggestions based on error types
                    errorMessage += '\nSuggestions:\n';
                    
                    if (errors.some(e => e.type === 'empty_feed')) {
                        errorMessage += '- Ensure your CSV file contains data rows\n';
                    }
                    
                    if (errors.some(e => e.type === 'invalid_headers')) {
                        errorMessage += '- Check that your CSV has a valid header row\n';
                    }
                    
                    if (errors.some(e => e.type === 'missing_headers')) {
                        const missingHeaders = errors.find(e => e.type === 'missing_headers').missingHeaders;
                        errorMessage += `- Add required headers: ${missingHeaders.join(', ')}\n`;
                    }
                    
                    if (errors.some(e => e.type === 'no_data_rows')) {
                        errorMessage += '- Add product data rows to your CSV\n';
                    }
                    
                    // Replace popup alert with console log
                    console.log(`[DEBUG] Error: ${errorMessage}`);
                    
                    // Update validation history tab if available
                    if (this.managers.validationUIManager) {
                        const feedId = 'ERROR-' + Date.now();
                        
                        // Convert errors to validation issues format
                        const errorIssues = errors.map(err => ({
                            type: 'error',
                            message: err.message,
                            severity: 'error',
                            row: err.row || 'unknown',
                            field: err.field || 'general'
                        }));
                        
                        this.managers.validationUIManager.displayValidationResults(feedId, {
                            issues: errorIssues,
                            isValid: false
                        }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                    }
                } else {
                    // Fall back to simple error message for unstructured errors
                    // Replace popup alert with console log
                    console.log(`[DEBUG] Failed to preview file: ${parseError.message}. Please check the format.`);
                    
                    // Update validation history tab if available
                    if (this.managers.validationUIManager) {
                        const feedId = 'ERROR-' + Date.now();
                        const errorIssue = [{
                            type: 'error',
                            message: `Failed to preview file: ${parseError.message}. Please check the format.`,
                            severity: 'error',
                            row: 'unknown',
                            field: 'general'
                        }];
                        
                        this.managers.validationUIManager.displayValidationResults(feedId, {
                            issues: errorIssue,
                            isValid: false
                        }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                    }
                }
                
                this.managers.monitor.logError(parseError, 'parseCSV');
                this.managers.monitor.logOperation('preview', 'failed', { reason: 'parse_error' });
                return;
            }

        } catch (error) {
            console.log('[DEBUG] Error in handlePreview:', error);
            this.managers.monitor.logError(error, 'handlePreview');
            console.log(`[DEBUG] Failed to preview file: ${error.message}. Please check the format.`);
            
            // Update validation history tab if available
            if (this.managers.validationUIManager) {
                const feedId = 'ERROR-' + Date.now();
                const errorIssue = [{
                    type: 'error',
                    message: `Failed to preview file: ${error.message}. Please check the format.`,
                    severity: 'error',
                    row: 'unknown',
                    field: 'general'
                }];
                
                this.managers.validationUIManager.displayValidationResults(feedId, {
                    issues: errorIssue,
                    isValid: false
                }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
            }
        } finally {
            console.log('[DEBUG] handlePreview completed');
            this.managers.loadingManager.hideLoading();
        }
    }

    async readFileAsText(file) {
        console.log('[DEBUG] ==================== READING FILE ====================');
        console.log('[DEBUG] readFileAsText called with file:', file.name, 'size:', file.size, 'type:', file.type);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('[DEBUG] File read successfully');
                const buffer = e.target.result;
                try {
                    const decoder = new TextDecoder('utf-8', { fatal: true });
                    const text = decoder.decode(buffer);
                    console.log('Decoded as UTF-8');
                    resolve(text);
                } catch (encodingError) {
                    console.warn('UTF-8 decoding failed, trying iso-8859-1...');
                    try {
                        const fallbackDecoder = new TextDecoder('iso-8859-1');
                        const text = fallbackDecoder.decode(buffer);
                        console.log('Decoded as ISO-8859-1');
                        resolve(text);
                    } catch (fallbackError) {
                        reject(new Error('Unable to decode file content with UTF-8 or ISO-8859-1'));
                    }
                }
            };
            reader.onerror = (e) => reject(new Error(`File reading error: ${e.target.error}`));
            reader.readAsArrayBuffer(file);
        });
    }

    // The parseCSV method has been replaced by the CSVParser module

    /**
     * Handles editable field input events
     * @param {Event} event - The input event
     */
    handleFieldEdit(event) {
        // Check if the target is an editable field
        if (event.target.classList.contains('editable-field')) {
            const fieldName = event.target.dataset.field;
            const row = event.target.closest('tr');
            
            if (!row) {
                console.warn('[FeedManager] Could not find parent row for field:', event.target);
                return;
            }
            
            const rowIndex = row.dataset.row;
            const offerId = row.dataset.offerId;
            
            if (!offerId) {
                console.warn(`[FeedManager] Cannot notify UI Manager: Missing offerId on row ${rowIndex}`);
                return;
            }
            
            // Define validation rules based on field name
            const isDescription = fieldName === 'description';
            const minLength = isDescription ? 90 : 30; // Title min is 30
            const maxLength = isDescription ? 5000 : 150; // Title max is 150
            
            const content = event.target.textContent || '';
            const currentLength = content.length;
            
            // Apply validation classes based on content length
            if (currentLength < minLength) {
                // Under minimum length - show error state
                event.target.classList.add('under-minimum');
                event.target.classList.remove('over-limit');
                
                // Only add needs-fix class if the row has been specifically navigated to
                if (row.classList.contains('validation-focus')) {
                    row.classList.add('needs-fix'); // Add persistent yellow highlight
                }
                
                console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentLength}/${minLength}`);
            } else if (currentLength > maxLength) {
                // Over maximum length - show error state
                event.target.classList.remove('under-minimum');
                event.target.classList.add('over-limit');
                
                // Only add needs-fix class if the row has been specifically navigated to
                if (row.classList.contains('validation-focus')) {
                    row.classList.add('needs-fix'); // Add persistent yellow highlight
                }
                
                console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentLength}/${maxLength}`);
            } else {
                // Valid length - show success state
                event.target.classList.remove('under-minimum');
                event.target.classList.remove('over-limit');
                
                // Apply green background to valid fields
                event.target.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                event.target.style.borderColor = '#28a745';
                
                console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) met length reqs (${currentLength}). Notifying UI Manager.`);
                
                // Check if all fields in the row are valid before removing the needs-fix class
                const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                if (invalidFields.length === 0) {
                    row.classList.remove('needs-fix'); // Remove the persistent yellow highlight
                    row.classList.remove('validation-focus'); // Remove the validation focus marker
                    row.classList.add('fix-complete'); // Add temporary green success highlight
                    
                    // Notify ValidationUIManager to remove the issue from the panel
                    // Try to get the latest reference to validationUIManager from the managers object
                    const validationUIManager = this.managers.validationUIManager;
                    if (validationUIManager && typeof validationUIManager.markIssueAsFixed === 'function') {
                        console.log(`[FeedManager] Notifying UI Manager to fix offerId: ${offerId}, field: ${fieldName}`);
                        validationUIManager.markIssueAsFixed(offerId, fieldName);
                    } else {
                        console.warn("ValidationUIManager or markIssueAsFixed method not available to notify.");
                    }
                    
                    // Clean up UI
                    setTimeout(() => row.classList.remove('fix-complete'), 1000);
                }
            }
            
            // Update the character count display to match validation state
            const charCountDisplay = event.target.nextElementSibling;
            if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                charCountDisplay.style.color = (currentLength < minLength || currentLength > maxLength) ? '#dc3545' : '#28a745';
            }
        }
    }

    /**
     * Displays the preview using the FeedDisplayManager
     * @param {Array<object>} data - The data to display
     * @returns {Promise<void>}
     */
    async displayPreview(data) {
        if (this.managers.displayManager) {
            return this.managers.displayManager.displayPreview(data);
        } else {
            console.error('[DEBUG] DisplayManager not available for displaying preview');
        }
        console.log('[DEBUG] ==================== DISPLAY PREVIEW CALLED ====================');
        console.log('[DEBUG] displayPreview called with data:', data ? `${data.length} rows` : 'no data');
        
        const container = this.elements.previewContentContainer;
        console.log('[DEBUG] previewContentContainer:', container);
        
        if (!container) {
            console.error("[DEBUG] Preview container not found. Cannot display preview.");
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('[DEBUG] No data to display in preview');
            container.innerHTML = '<p class="no-data-message">No data to display.</p>';
            return;
        }
        
        console.log('[DEBUG] Creating table for preview with headers:', Object.keys(data[0] || {}));
        const table = document.createElement('table');
        table.className = 'preview-table data-table';
        const headers = Object.keys(data[0] || {});
        if (headers.length === 0) { container.innerHTML = '<p class="no-data-message">Could not determine headers.</p>'; return; }
        const thead = table.createTHead(); const headerRow = thead.insertRow(); headerRow.className = 'table-header';
        headers.forEach(key => { const th = document.createElement('th'); th.textContent = key; headerRow.appendChild(th); });
        const tbody = table.createTBody();
        this.offerIdToRowIndexMap = {}; // Clear map before rebuilding table
        data.forEach((row, index) => {
            const tr = tbody.insertRow(); tr.id = `row-${index + 1}`; tr.dataset.row = index + 1;
            const offerId = row['id']; // Assuming the unique ID column is 'id'
            if (offerId) {
                tr.dataset.offerId = offerId;
                this.offerIdToRowIndexMap[offerId] = index + 1; // Map offerId to visual row index
            } else {
                console.warn(`Row ${index + 1} is missing an 'id' (offerId). Fix notification might not work for this row.`);
            }
            headers.forEach(key => {
                const cell = tr.insertCell(); const content = row[key] || '';
                if (key === 'title' || key === 'description') {
                    const editableCellContent = this.createEditableCell(content, key, index + 1);
                    while (editableCellContent.firstChild) cell.appendChild(editableCellContent.firstChild);
                    cell.className = editableCellContent.className; // Copy class if needed
                } else { cell.textContent = content; }
            });
        });
        
        console.log('[DEBUG] Table created with', data.length, 'rows. Appending to container...');
        
        // Clear container and append the table
        container.innerHTML = '';
        container.appendChild(table);
        
        console.log('[DEBUG] Table appended to container. Container now contains:', container.childNodes.length, 'child nodes');
        console.log(`[DEBUG] Displayed preview for ${data.length} products.`);
        
        // Initialize the floating scroll bar after the table is created
        console.log('[DEBUG] Initializing floating scroll bar...');
        this.initFloatingScrollBar();
        
        // Validate all editable fields after the table is created
        setTimeout(() => {
            console.log('[FeedManager] Running post-display validation check on all editable fields');
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
                    
                    // Apply appropriate validation classes to fields
                    if (currentLength < minLength) {
                        field.classList.add('under-minimum');
                        field.classList.remove('over-limit');
                        
                        // Apply red background to invalid fields
                        field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        field.style.borderColor = '#dc3545';
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                        
                        // DON'T add needs-fix class to rows by default
                        console.log(`[FeedManager] Post-display validation: Field "${fieldType}" is under minimum length (${currentLength}/${minLength})`);
                    } else if (currentLength > maxLength) {
                        field.classList.remove('under-minimum');
                        field.classList.add('over-limit');
                        
                        // Apply red background to invalid fields
                        field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        field.style.borderColor = '#dc3545';
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                        
                        // DON'T add needs-fix class to rows by default
                        console.log(`[FeedManager] Post-display validation: Field "${fieldType}" exceeds maximum length (${currentLength}/${maxLength})`);
                    } else {
                        // Valid length - apply green styling to the field
                        field.classList.remove('under-minimum');
                        field.classList.remove('over-limit');
                        field.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                        field.style.borderColor = '#28a745';
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                            charCountDisplay.style.color = '#28a745'; // Green for success
                        }
                    }
                }
            });
        }, 500); // Delay to ensure DOM is fully rendered
    }

    /**
     * Sanitizes text using the FeedDisplayManager
     * @param {string} text - The text to sanitize
     * @returns {string} - The sanitized text
     */
    sanitizeText(text) {
        if (this.managers.displayManager) {
            return this.managers.displayManager.sanitizeText(text);
        } else {
            // Fallback implementation if displayManager is not available
            if (typeof text !== 'string') return '';
            return text.normalize('NFKD')
                .replace(/[\u2022]/g, '•').replace(/[\u2013\u2014]/g, '-')
                .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
                .replace(/\s+/g, ' ').trim();
        }
    }

    /**
     * Creates an editable cell using the FeedDisplayManager
     * @param {string} content - The cell content
     * @param {string} type - The field type
     * @param {number} rowIndex - The row index
     * @returns {HTMLElement} - The cell element
     */
    createEditableCell(content, type, rowIndex) {
        if (this.managers.displayManager) {
            return this.managers.displayManager.createEditableCell(content, type, rowIndex);
        } else {
            console.error('[DEBUG] DisplayManager not available for creating editable cell');
            // Return a basic cell as fallback
            const cell = document.createElement('td');
            cell.textContent = content;
            return cell;
        }
        const cell = document.createElement('td');
        const field = document.createElement('div');
        field.className = `editable-field ${type}-field`;
        field.contentEditable = true;
        field.dataset.field = type;
        field.dataset.row = rowIndex;
        field.textContent = this.sanitizeText(content);

        const charCountDisplay = document.createElement('div');
        charCountDisplay.className = 'char-count';
        // Define correct min/max lengths based on type
        const isDescription = type === 'description';
        const minLength = isDescription ? 90 : 30; // Title min is 30
        const maxLength = isDescription ? 5000 : 150; // Title max is 150

        cell.appendChild(field);
        cell.appendChild(charCountDisplay);

        const updateDisplay = () => {
            const currentContent = field.textContent || ''; // Ensure string
            const currentCount = currentContent.length;
            
            // Update character count display
            charCountDisplay.textContent = `${currentCount} / ${minLength}`; // Display MINIMUM required length
            
            // Apply appropriate validation classes based on content length
            if (currentCount < minLength) {
                // Under minimum length - show error state
                field.classList.add('under-minimum');
                field.classList.remove('over-limit');
                charCountDisplay.style.color = '#dc3545'; // Red for error
                
                // Apply red background to invalid fields
                field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                field.style.borderColor = '#dc3545';
                
                // Mark the row as needing fix ONLY if it's been specifically navigated to
                const row = field.closest('tr');
                if (row && row.classList.contains('validation-focus')) {
                    row.classList.add('needs-fix');
                }
                
                // Log validation issue
                if (row) {
                    const offerId = row.dataset.offerId;
                    console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentCount}/${minLength}`);
                }
            } else if (currentCount > maxLength) {
                // Over maximum length - show error state
                field.classList.remove('under-minimum');
                field.classList.add('over-limit');
                charCountDisplay.style.color = '#dc3545'; // Red for error
                
                // Apply red background to invalid fields
                field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                field.style.borderColor = '#dc3545';
                
                // Mark the row as needing fix ONLY if it's been specifically navigated to
                const row = field.closest('tr');
                if (row && row.classList.contains('validation-focus')) {
                    row.classList.add('needs-fix');
                }
                
                // Log validation issue
                if (row) {
                    const offerId = row.dataset.offerId;
                    console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentCount}/${maxLength}`);
                }
            } else {
                // Valid length - show success state
                field.classList.remove('under-minimum');
                field.classList.remove('over-limit');
                charCountDisplay.style.color = '#28a745'; // Green for success
                
                // Apply green background to valid fields
                field.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                field.style.borderColor = '#28a745';
                
                // Check if the field meets requirements on initial load or update
                const row = field.closest('tr');
                if (row) {
                    const offerId = row.dataset.offerId;
                    if (offerId) {
                        console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) meets requirements on load/update. Length: ${currentCount}`);
                        // Notify ValidationUIManager to remove the issue
                        // Try to get the latest reference to validationUIManager from the managers object
                        const validationUIManager = this.managers.validationUIManager;
                        if (validationUIManager && typeof validationUIManager.markIssueAsFixed === 'function') {
                            validationUIManager.markIssueAsFixed(offerId, type);
                        }
                        
                        // Remove the needs-fix class if all fields in the row are valid
                        const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                        if (invalidFields.length === 0) {
                            row.classList.remove('needs-fix');
                            row.classList.remove('validation-focus');
                        }
                    }
                }
            }
        };
        updateDisplay(); // Initial update
        
        // Force a recheck after a short delay to ensure styles are applied
        setTimeout(() => {
            updateDisplay();
        }, 100);
        
        // This listener is for updating the character count display and validation state
        field.addEventListener('input', debounce(updateDisplay, 300));
        return cell;
    }

    /**
     * Gets the corrected table data using the FeedDisplayManager
     * @returns {Array<object>} - The corrected table data
     */
    getCorrectedTableData() {
        if (this.managers.displayManager) {
            return this.managers.displayManager.getCorrectedTableData();
        } else {
            console.error('[DEBUG] DisplayManager not available for getting corrected table data');
            return [];
        }
    }

    /**
     * Gets the applied corrections using the FeedDisplayManager
     * @returns {Array} - The applied corrections
     */
    getAppliedCorrections() {
        if (this.managers.displayManager) {
            return this.managers.displayManager.getAppliedCorrections();
        } else {
            console.error('[DEBUG] DisplayManager not available for getting applied corrections');
            return [];
        }
    }

    /**
     * Navigates to a specific row using the FeedDisplayManager
     * @param {number} rowIndex - The row index
     * @param {string} [fieldToFocus] - Optional field to focus
     */
    navigateToRow(rowIndex, fieldToFocus = null) {
        if (this.managers.displayManager) {
            this.managers.displayManager.navigateToRow(rowIndex, fieldToFocus);
        } else {
            console.error('[DEBUG] DisplayManager not available for navigating to row');
        }
        // Ensure the Feed Preview tab is active first
        const feedTabButton = document.querySelector('.tab-button[data-tab="feed"]');
        const feedTabPanel = document.getElementById('feed-tab');
        if (feedTabButton && feedTabPanel && !feedTabPanel.classList.contains('active')) {
            console.log('FeedManager: Switching to Feed Preview tab for navigation.');
            // Deactivate other tabs
            document.querySelectorAll('.tab-button.active').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel.active').forEach(panel => panel.classList.remove('active'));
            // Activate feed tab
            feedTabButton.classList.add('active');
            feedTabPanel.classList.add('active');
        }

        const targetRow = this.elements.previewContentContainer?.querySelector(`tbody tr[data-row="${rowIndex}"]`);
        if (!targetRow) { console.warn(`Row with index ${rowIndex} not found in FeedManager.`); return; }

        // Remove previous highlights
        this.elements.previewContentContainer?.querySelectorAll('tbody tr.row-highlight-scroll').forEach(row => {
            row.classList.remove('row-highlight-scroll');
        });

        // Add validation-focus class to mark this row as specifically navigated to
        targetRow.classList.add('validation-focus');
        
        // Add needs-fix class if any fields in the row don't meet requirements
        const invalidFields = targetRow.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
        if (invalidFields.length > 0) {
            targetRow.classList.add('needs-fix');
        }

        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus the specific field if provided
        if (fieldToFocus) {
            const fieldElement = targetRow.querySelector(`.editable-field[data-field="${fieldToFocus}"]`);
            if (fieldElement) {
                // Small delay to ensure scrolling is complete before focusing
                setTimeout(() => {
                    fieldElement.focus();
                    
                    // Apply validation classes based on content length
                    const content = fieldElement.textContent || '';
                    const currentLength = content.length;
                    
                    // Define validation rules based on field name
                    const isDescription = fieldToFocus === 'description';
                    const minLength = isDescription ? 90 : 30; // Title min is 30
                    const maxLength = isDescription ? 5000 : 150; // Title max is 150
                    
                    // Apply appropriate validation classes
                    if (currentLength < minLength) {
                        fieldElement.classList.add('under-minimum');
                        fieldElement.classList.remove('over-limit');
                        console.log(`[FeedManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Under minimum length (${currentLength}/${minLength})`);
                    } else if (currentLength > maxLength) {
                        fieldElement.classList.remove('under-minimum');
                        fieldElement.classList.add('over-limit');
                        console.log(`[FeedManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Over maximum length (${currentLength}/${maxLength})`);
                    } else {
                        fieldElement.classList.remove('under-minimum');
                        fieldElement.classList.remove('over-limit');
                        console.log(`[FeedManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Valid length (${currentLength})`);
                    }
                    
                    // Update the character count display
                    const charCountDisplay = fieldElement.nextElementSibling;
                    if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                        charCountDisplay.style.color = (currentLength < minLength || currentLength > maxLength) ? '#dc3545' : '#28a745';
                    }
                }, 300);
            } else {
                 console.warn(`Could not find field "${fieldToFocus}" in row ${rowIndex} to focus.`);
            }
        } else {
             console.warn(`No field specified to focus for row ${rowIndex}.`);
             
             // If no specific field to focus, check all editable fields in the row
             // and apply validation classes as needed
             const editableFields = targetRow.querySelectorAll('.editable-field');
             editableFields.forEach(field => {
                 const fieldName = field.dataset.field;
                 if (fieldName === 'title' || fieldName === 'description') {
                     const content = field.textContent || '';
                     const currentLength = content.length;
                     
                     // Define validation rules based on field name
                     const isDescription = fieldName === 'description';
                     const minLength = isDescription ? 90 : 30; // Title min is 30
                     const maxLength = isDescription ? 5000 : 150; // Title max is 150
                     
                     // Apply appropriate validation classes
                     if (currentLength < minLength) {
                         field.classList.add('under-minimum');
                         field.classList.remove('over-limit');
                         console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}): Under minimum length (${currentLength}/${minLength})`);
                         
                         // Update the character count display
                         const charCountDisplay = field.nextElementSibling;
                         if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                             charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                             charCountDisplay.style.color = '#dc3545'; // Red for error
                         }
                     } else if (currentLength > maxLength) {
                         field.classList.remove('under-minimum');
                         field.classList.add('over-limit');
                         console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}): Over maximum length (${currentLength}/${maxLength})`);
                         
                         // Update the character count display
                         const charCountDisplay = field.nextElementSibling;
                         if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                             charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                             charCountDisplay.style.color = '#dc3545'; // Red for error
                         }
                     } else {
                         field.classList.remove('under-minimum');
                         field.classList.remove('over-limit');
                         console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}): Valid length (${currentLength})`);
                         
                         // Update the character count display
                         const charCountDisplay = field.nextElementSibling;
                         if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                             charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                             charCountDisplay.style.color = '#28a745'; // Green for success
                         }
                     }
                 }
             });
        }
    }

   // The monitorFieldForFix method has been removed.
   // Validation fixes are now handled by the delegated event listener in setupEventListeners.
   
    /**
     * Initializes the floating scroll bar using the FeedDisplayManager
     */
    initFloatingScrollBar() {
        if (this.managers.displayManager) {
            this.managers.displayManager.initFloatingScrollBar();
        } else {
            console.error('[DEBUG] DisplayManager not available for initializing floating scroll bar');
        }
       console.log('[DEBUG] ==================== INIT FLOATING SCROLL BAR ====================');
       
       // Get references to the elements
       const dataContainer = document.querySelector('.data-container');
       const floatingScroll = document.querySelector('.floating-scroll');
       const scrollTrack = document.querySelector('.scroll-track');
       const scrollThumb = document.querySelector('.scroll-thumb');
       
       console.log('[DEBUG] Floating scroll elements:', {
           dataContainer: !!dataContainer,
           floatingScroll: !!floatingScroll,
           scrollTrack: !!scrollTrack,
           scrollThumb: !!scrollThumb
       });
       
       if (!dataContainer || !floatingScroll || !scrollTrack || !scrollThumb) {
           console.error('[DEBUG] Required elements for floating scroll bar not found');
           return;
       }
       
       // Show the floating scroll bar
       floatingScroll.style.display = 'block';
       
       // Calculate and set initial thumb width based on table width vs container width
       const table = dataContainer.querySelector('.preview-table');
       console.log('[DEBUG] Looking for preview table in data container:', !!table);
       
       if (!table) {
           console.error('[DEBUG] Preview table not found in initFloatingScrollBar');
           console.log('[DEBUG] Data container contents:', dataContainer.innerHTML);
           return;
       }
       
       // Calculate the ratio of visible width to total width
       const updateThumbWidth = () => {
           const containerWidth = dataContainer.clientWidth;
           const tableWidth = table.offsetWidth;
           
           // Only show the scroll bar if the table is wider than the container
           if (tableWidth <= containerWidth) {
               floatingScroll.style.display = 'none';
               return;
           }
           
           floatingScroll.style.display = 'block';
           const ratio = containerWidth / tableWidth;
           const thumbWidth = Math.max(40, Math.floor(ratio * scrollTrack.clientWidth));
           scrollThumb.style.width = `${thumbWidth}px`;
       };
       
       // Update thumb position based on container's scroll position
       const updateThumbPosition = () => {
           const containerWidth = dataContainer.clientWidth;
           const tableWidth = table.offsetWidth;
           
           if (tableWidth <= containerWidth) return;
           
           const scrollRatio = dataContainer.scrollLeft / (tableWidth - containerWidth);
           const trackWidth = scrollTrack.clientWidth;
           const thumbWidth = parseInt(scrollThumb.style.width, 10) || 40;
           const maxOffset = trackWidth - thumbWidth;
           const thumbOffset = Math.floor(scrollRatio * maxOffset);
           
           scrollThumb.style.left = `${thumbOffset}px`;
       };
       
       // Sync container scroll position when dragging the thumb
       let isDragging = false;
       let startX = 0;
       let startLeft = 0;
       
       scrollThumb.addEventListener('mousedown', (e) => {
           isDragging = true;
           startX = e.clientX;
           startLeft = parseInt(scrollThumb.style.left, 10) || 0;
           document.body.style.userSelect = 'none'; // Prevent text selection during drag
           
           // Add event listeners for drag and release
           document.addEventListener('mousemove', onMouseMove);
           document.addEventListener('mouseup', onMouseUp);
           
           e.preventDefault();
       });
       
       const onMouseMove = (e) => {
           if (!isDragging) return;
           
           const deltaX = e.clientX - startX;
           const trackWidth = scrollTrack.clientWidth;
           const thumbWidth = parseInt(scrollThumb.style.width, 10) || 40;
           const maxOffset = trackWidth - thumbWidth;
           
           let newLeft = Math.max(0, Math.min(maxOffset, startLeft + deltaX));
           scrollThumb.style.left = `${newLeft}px`;
           
           // Update container scroll position
           const scrollRatio = newLeft / maxOffset;
           const containerWidth = dataContainer.clientWidth;
           const tableWidth = table.offsetWidth;
           const maxScroll = tableWidth - containerWidth;
           dataContainer.scrollLeft = scrollRatio * maxScroll;
       };
       
       const onMouseUp = () => {
           isDragging = false;
           document.body.style.userSelect = '';
           document.removeEventListener('mousemove', onMouseMove);
           document.removeEventListener('mouseup', onMouseUp);
       };
       
       // Click on track to jump to position
       scrollTrack.addEventListener('click', (e) => {
           // Ignore if clicking on the thumb itself
           if (e.target === scrollThumb) return;
           
           const trackRect = scrollTrack.getBoundingClientRect();
           const clickX = e.clientX - trackRect.left;
           const trackWidth = scrollTrack.clientWidth;
           const thumbWidth = parseInt(scrollThumb.style.width, 10) || 40;
           const maxOffset = trackWidth - thumbWidth;
           
           // Calculate new thumb position, centered on click
           let newLeft = Math.max(0, Math.min(maxOffset, clickX - (thumbWidth / 2)));
           scrollThumb.style.left = `${newLeft}px`;
           
           // Update container scroll position
           const scrollRatio = newLeft / maxOffset;
           const containerWidth = dataContainer.clientWidth;
           const tableWidth = table.offsetWidth;
           const maxScroll = tableWidth - containerWidth;
           dataContainer.scrollLeft = scrollRatio * maxScroll;
       });
       
       // Update thumb position when container is scrolled
       dataContainer.addEventListener('scroll', updateThumbPosition);
       
       // Update thumb width and position on window resize
       window.addEventListener('resize', () => {
           updateThumbWidth();
           updateThumbPosition();
       });
       
       // Initial setup
       updateThumbWidth();
       updateThumbPosition();
   }
    /**
     * Updates the feed status area with messages
     * @param {string} message - The message to display
     * @param {string} type - The type of message: 'info', 'warning', 'error', or 'success'
     */
    // The updateFeedStatus method has been moved to the StatusManager module
}

// Make globally available
window.FeedManager = FeedManager;