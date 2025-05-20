// Use global modules
// No need to import them since they're already available globally
// const CSVParser = window.CSVParser;
// const StatusManager = window.StatusManager;
// const FeedDisplayManager = window.FeedDisplayManager;
// const ContentTypeValidator = window.ContentTypeValidator;

// Use global debounce function from popup_utils.js

/**
 * Coordinates feed operations between different modules.
 * Acts as the central orchestrator for feed loading, parsing, display, and validation.
 */
class FeedCoordinator {
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
     * @param {ValidationUIManager} [managers.validationUIManager]
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers; // Store loadingManager, errorManager, searchManager, monitor, validationUIManager
        
        if (!this.elements.fileInput || !this.elements.previewButton || !this.elements.previewContentContainer) {
            console.error('FeedCoordinator: Required DOM elements missing!', elements);
        }
        // Check for required managers, but don't require validationUIManager
        if (!this.managers.loadingManager || !this.managers.errorManager || !this.managers.searchManager || !this.managers.monitor) {
             console.error('FeedCoordinator: Required managers missing!', managers);
        }
        // Just log a warning if validationUIManager is missing
        if (!this.managers.validationUIManager) {
             console.warn('FeedCoordinator: ValidationUIManager not available during initialization. Will attempt to use it if it becomes available later.');
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
        console.log('[DEBUG] Initializing FeedCoordinator...');
        
        // Safe logging of objects with circular references
        const safeLog = (obj, label) => {
            const getCircularReplacer = () => {
                const seen = new WeakSet();
                return (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular Reference]';
                        }
                        seen.add(value);
                    }
                    return value;
                };
            };
            
            try {
                console.log(`[DEBUG] ${label}:`, JSON.stringify(obj, getCircularReplacer()));
            } catch (error) {
                console.error(`[DEBUG] Error logging ${label}:`, error);
                console.log(`[DEBUG] ${label} (keys only):`, Object.keys(obj));
            }
        };
        
        // Use safe logging for elements and managers
        safeLog(this.elements, 'FeedCoordinator elements');
        safeLog(this.managers, 'FeedCoordinator managers');
        
        // ContentTypeValidator is now imported directly as an ES module
        console.log('[DEBUG] ContentTypeValidator is available via ES module import');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('[DEBUG] Setting up event listeners in FeedCoordinator');
        
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
        } else { console.error("FeedCoordinator: fileInput element not provided."); }

        if (this.elements.previewButton) {
            console.log('[DEBUG] Setting up previewButton click listener');
            console.log('[DEBUG] previewButton element:', this.elements.previewButton);
            
            // Remove any existing click listeners
            this.elements.previewButton.removeEventListener('click', this.handlePreviewBound);
            
            // Create a bound version of handlePreview
            this.handlePreviewBound = this.handlePreview.bind(this);
            
            // Add the new click listener
            this.elements.previewButton.addEventListener('click', this.handlePreviewBound);
        } else { console.error("FeedCoordinator: previewButton element not provided."); }
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
        const loadingManager = this.managers.loadingManager || {
            showLoading: (msg) => {
                console.log('Loading:', msg);
                document.body.classList.add('is-loading');
            },
            hideLoading: () => {
                console.log('Hide Loading');
                document.body.classList.remove('is-loading');
            }
        };
        const errorManager = this.managers.errorManager || {
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
        const monitor = this.managers.monitor || { logOperation: ()=>{}, logError: console.error };
        const searchManager = this.managers.searchManager;
        const displayManager = this.managers.displayManager;
        
        console.log('[DEBUG] Managers:', this.managers);

        try {
            monitor.logOperation('preview', 'started');

            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                console.log('[DEBUG] No file selected');
                errorManager.showError('Please select a file first');
                monitor.logOperation('preview', 'failed', { reason: 'no_file' });
                return;
            }
            
            console.log('[DEBUG] File selected:', fileInput.files[0].name);

            loadingManager.showLoading('Processing feed...');
            
            // Clear feed status area
            if (this.managers.statusManager) {
                this.managers.statusManager.addInfo('Processing feed...');
            }

            const file = fileInput.files[0];
            const csvText = await this.readFileAsText(file);
            
            try {
                // Check if FeedErrorUIManager is available
                const feedErrorUIManager = this.managers.feedErrorUIManager;
                console.log('[DEBUG] FeedErrorUIManager available:', !!feedErrorUIManager);
                console.log('[DEBUG] FeedErrorUIManager:', feedErrorUIManager);
                
                // Initialize validation result
                let validationResult = { isValid: true, issues: [] };
                
                if (feedErrorUIManager) {
                    console.log('[DEBUG] Using FeedErrorUIManager to validate feed format');
                    console.log('[DEBUG] CSV text length:', csvText?.length || 0);
                    console.log('[DEBUG] CSV text preview:', csvText?.substring(0, 100) + '...');
                    
                    try {
                        // Validate feed format using FeedErrorUIManager
                        console.log('[DEBUG] Calling feedErrorUIManager.validateFile');
                        validationResult = await feedErrorUIManager.validateFile(csvText);
                        console.log('[DEBUG] Validation result:', validationResult);
                        
                        // Check if there are any non-title/description issues
                        const nonTitleDescIssues = validationResult.issues.filter(issue =>
                            !(issue.field === 'title' || issue.field === 'description'));
                        
                        // Only show popup if there are non-title/description issues
                        if (nonTitleDescIssues.length > 0) {
                            console.log('[DEBUG] Found non-title/description issues:', nonTitleDescIssues.length);
                        } else {
                            console.log('[DEBUG] No non-title/description issues found, skipping popup');
                            // Force isValid to true to prevent popup
                            validationResult.isValid = true;
                        }
                        
                        // If validation failed, display errors but continue with preview
                        if (validationResult && !validationResult.isValid && validationResult.issues && validationResult.issues.length > 0) {
                            console.log('[DEBUG] Feed format validation failed:', validationResult.issues);
                            
                            // Filter out title and description validation errors
                            const filteredIssues = validationResult.issues.filter(issue => {
                                // Skip if marked as title/description issue
                                if (issue.isTitleDescriptionIssue) {
                                    console.log(`[FeedCoordinator] Skipping issue marked as title/description issue: ${issue.message}`);
                                    return false;
                                }
                                
                                // Skip issues with title or description fields
                                if (issue.field === 'title' || issue.field === 'description') {
                                    console.log(`[FeedCoordinator] Skipping ${issue.field} issue for feed status: ${issue.message}`);
                                    return false;
                                }
                                
                                // Also skip any issue message that contains "title" or "description"
                                if (issue.message && (
                                    issue.message.toLowerCase().includes('title') ||
                                    issue.message.toLowerCase().includes('description')
                                )) {
                                    console.log(`[FeedCoordinator] Skipping issue with title/description in message: ${issue.message}`);
                                    return false;
                                }
                                
                                return true;
                            });
                            
                            console.log('[DEBUG] Filtered issues for feed status:', filteredIssues.length);
                            
                            // Display filtered errors in feed status area
                            if (filteredIssues.length > 0) {
                                console.log('[DEBUG] Calling feedErrorUIManager.displayErrors with', filteredIssues.length, 'issues');
                                feedErrorUIManager.displayErrors(filteredIssues);
                                
                                // Replace popup alert with console log
                                console.log(`[DEBUG] Feed has ${filteredIssues.length} format issues shown in Feed Status.`);
                                
                                // Update validation history tab if available
                                // Add skipTabSwitch parameter to prevent automatic tab switching during preview
                                if (this.managers.validationUIManager) {
                                    const feedId = 'FORMAT-' + Date.now();
                                    this.managers.validationUIManager.displayValidationResults(feedId, {
                                        issues: filteredIssues,
                                        isValid: false
                                    }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                                }
                                
                                // Log operation
                                monitor.logOperation('preview', 'warning', { reason: 'format_validation_issues', issues: filteredIssues.length });
                            } else {
                                // No filtered issues to display
                                feedErrorUIManager.displayErrors([]);
                            }
                            
                            // Note: We continue with the preview even if there are format errors
                            console.log('[DEBUG] Continuing with preview despite format errors');
                        }
                        
                        console.log('[DEBUG] Feed format validation passed');
                    } catch (validationError) {
                        console.error('[DEBUG] Error during feed format validation:', validationError);
                        
                        // Create a generic error for display
                        const genericError = [{
                            type: 'validation_error',
                            message: `Error validating feed format: ${validationError.message}`,
                            severity: 'error',
                            rowIndex: 'unknown',
                            field: 'general'
                        }];
                        
                        // Display the error
                        feedErrorUIManager.displayErrors(genericError);
                        
                        // Hide loading indicator
                        loadingManager.hideLoading();
                        
                        // Replace popup alert with console log
                        console.log(`[DEBUG] Error validating feed format: ${validationError.message}`);
                        
                        // Update validation history tab if available
                        if (this.managers.validationUIManager) {
                            const feedId = 'ERROR-' + Date.now();
                            this.managers.validationUIManager.displayValidationResults(feedId, {
                                issues: genericError,
                                isValid: false
                            }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                        }
                        
                        // Log operation
                        monitor.logOperation('preview', 'failed', { reason: 'validation_error', error: validationError.message });
                        
                        return;
                    }
                } else {
                    console.log('[DEBUG] FeedErrorUIManager not available, skipping feed format validation');
                }
                
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
                if (displayManager) {
                    await displayManager.displayPreview(data);
                    
                    // Update the offerIdToRowIndexMap from the display manager
                    this.offerIdToRowIndexMap = displayManager.getOfferIdToRowIndexMap();
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
                                    console.log(`[FeedCoordinator] Skipping title/description issue for feed status: ${issue}`);
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
                if (searchManager && typeof searchManager.updateSearchColumns === 'function') {
                    searchManager.updateSearchColumns();
                } else {
                    console.warn("SearchManager not available or missing updateSearchColumns method.");
                }
                
                monitor.logOperation('preview', 'completed', { products: data.length, fileName: file.name });
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
                    const hasEmptyFeed = errors.some(err => err.type === 'empty_feed');
                    const hasInvalidHeaders = errors.some(err => err.type === 'invalid_headers');
                    const hasNoDataRows = errors.some(err => err.type === 'no_data_rows');
                    
                    if (hasEmptyFeed) {
                        errorMessage += '\nSuggestion: Please ensure your CSV file contains data and is not empty.';
                    } else if (hasInvalidHeaders) {
                        errorMessage += '\nSuggestion: Please ensure your CSV file has valid headers in the first row.';
                    } else if (hasNoDataRows) {
                        errorMessage += '\nSuggestion: Please ensure your CSV file contains data rows after the header row.';
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
                    
                    // Use FeedErrorUIManager to display feed format errors if available
                    const feedErrorUIManager = this.managers.feedErrorUIManager;
                    if (feedErrorUIManager) {
                        console.log('[DEBUG] Using FeedErrorUIManager to display feed format errors');
                        
                        // Convert errors to the format expected by FeedErrorUIManager
                        const feedErrors = errors.map(err => ({
                            type: 'error',
                            message: err.message,
                            severity: 'error',
                            row: err.row || 'unknown',
                            field: err.field || 'general'
                        }));
                        
                        // Display errors in feed status area
                        feedErrorUIManager.displayErrors(feedErrors);
                    } else {
                        // Fallback to statusManager if FeedErrorUIManager is not available
                        console.log('[DEBUG] FeedErrorUIManager not available, using statusManager');
                        if (this.managers.statusManager) {
                            this.managers.statusManager.addError('Failed to preview file. See error message for details.');
                        }
                    }
                } else {
                    // Replace popup alert with console log
                    console.log(`[DEBUG] Failed to preview file: ${parseError.message}`);
                    
                    // Update validation history tab if available
                    if (this.managers.validationUIManager) {
                        const feedId = 'ERROR-' + Date.now();
                        const errorIssue = [{
                            type: 'error',
                            message: `Failed to preview file: ${parseError.message}`,
                            severity: 'error',
                            row: 'unknown',
                            field: 'general'
                        }];
                        
                        this.managers.validationUIManager.displayValidationResults(feedId, {
                            issues: errorIssue,
                            isValid: false
                        }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
                    }
                    
                    // Use FeedErrorUIManager to display feed format errors if available
                    const feedErrorUIManager = this.managers.feedErrorUIManager;
                    if (feedErrorUIManager) {
                        console.log('[DEBUG] Using FeedErrorUIManager to display generic error');
                        
                        // Create a generic error for FeedErrorUIManager
                        const feedErrors = [{
                            type: 'error',
                            message: `Failed to preview file: ${parseError.message}`,
                            severity: 'error',
                            row: 'unknown',
                            field: 'general'
                        }];
                        
                        // Display errors in feed status area
                        feedErrorUIManager.displayErrors(feedErrors);
                    } else {
                        // Fallback to statusManager if FeedErrorUIManager is not available
                        console.log('[DEBUG] FeedErrorUIManager not available, using statusManager');
                        if (this.managers.statusManager) {
                            this.managers.statusManager.addError(`Failed to preview file: ${parseError.message}`);
                        }
                    }
                }
                
                monitor.logOperation('preview', 'failed', { reason: 'parse_error', error: parseError.message });
            }
            
        } catch (error) {
            console.error('[DEBUG] Unexpected error in handlePreview:', error);
            console.log(`[DEBUG] An unexpected error occurred: ${error.message}`);
            
            // Update validation history tab if available
            if (this.managers.validationUIManager) {
                const feedId = 'ERROR-' + Date.now();
                const errorIssue = [{
                    type: 'error',
                    message: `An unexpected error occurred: ${error.message}`,
                    severity: 'error',
                    row: 'unknown',
                    field: 'general'
                }];
                
                this.managers.validationUIManager.displayValidationResults(feedId, {
                    issues: errorIssue,
                    isValid: false
                }, { skipTabSwitch: true }); // Add parameter to skip tab switching for Preview Feed
            }
            
            // Use FeedErrorUIManager to display feed format errors if available
            const feedErrorUIManager = this.managers.feedErrorUIManager;
            if (feedErrorUIManager) {
                console.log('[DEBUG] Using FeedErrorUIManager to display unexpected error');
                
                // Create a generic error for FeedErrorUIManager
                const feedErrors = [{
                    type: 'error',
                    message: `An unexpected error occurred: ${error.message}`,
                    severity: 'error',
                    row: 'unknown',
                    field: 'general'
                }];
                
                // Display errors in feed status area
                feedErrorUIManager.displayErrors(feedErrors);
            } else {
                // Fallback to statusManager if FeedErrorUIManager is not available
                console.log('[DEBUG] FeedErrorUIManager not available, using statusManager');
                if (this.managers.statusManager) {
                    this.managers.statusManager.addError(`An unexpected error occurred: ${error.message}`);
                }
            }
            
            monitor.logError('preview', error);
        } finally {
            loadingManager.hideLoading();
        }
    }

    /**
     * Reads a file as text
     * @param {File} file - The file to read
     * @returns {Promise<string>} - A promise that resolves with the file contents as text
     */
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target.result;
                    console.log(`[DEBUG] File read successfully. Size: ${text.length} characters`);
                    resolve(text);
                } catch (error) {
                    console.error('[DEBUG] Error processing file contents:', error);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('[DEBUG] Error reading file:', error);
                reject(new Error('Failed to read the file. Please try again.'));
            };
            reader.readAsText(file);
        });
    }

    /**
     * Handles editable field events
     * @param {Event} event - The input event
     */
    handleFieldEdit(event) {
        // Check if the target is an editable field
        if (event.target.classList.contains('editable-field')) {
            const fieldName = event.target.dataset.field;
            const row = event.target.closest('tr');
            
            if (!row) {
                console.warn('[FeedCoordinator] Could not find parent row for field:', event.target);
                return;
            }
            
            const rowIndex = row.dataset.row;
            const offerId = row.dataset.offerId;
            
            if (!offerId) {
                console.warn(`[FeedCoordinator] Cannot notify UI Manager: Missing offerId on row ${rowIndex}`);
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
                
                console.log(`[FeedCoordinator] Field "${fieldName}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentLength}/${minLength}`);
            } else if (currentLength > maxLength) {
                // Over maximum length - show error state
                event.target.classList.remove('under-minimum');
                event.target.classList.add('over-limit');
                
                // Only add needs-fix class if the row has been specifically navigated to
                if (row.classList.contains('validation-focus')) {
                    row.classList.add('needs-fix'); // Add persistent yellow highlight
                }
                
                console.log(`[FeedCoordinator] Field "${fieldName}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentLength}/${maxLength}`);
            } else {
                // Valid length - show success state
                event.target.classList.remove('under-minimum');
                event.target.classList.remove('over-limit');
                
                // Apply green background to valid fields
                event.target.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                event.target.style.borderColor = '#28a745';
                
                console.log(`[FeedCoordinator] Field "${fieldName}" (Row ${rowIndex}) met length reqs (${currentLength}). Notifying UI Managers.`);
                
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
                        console.log(`[FeedCoordinator] Notifying ValidationUIManager to fix offerId: ${offerId}, field: ${fieldName}`);
                        validationUIManager.markIssueAsFixed(offerId, fieldName);
                    } else {
                        console.warn("ValidationUIManager or markIssueAsFixed method not available to notify.");
                    }
                    
                    // Notify FeedErrorUIManager to remove the issue from the feed status area
                    const feedErrorUIManager = this.managers.feedErrorUIManager;
                    if (feedErrorUIManager && typeof feedErrorUIManager.markIssueAsFixed === 'function') {
                        console.log(`[FeedCoordinator] Notifying FeedErrorUIManager to fix offerId: ${offerId}, field: ${fieldName}`);
                        
                        // Skip title and description length validation errors for feed status
                        // Only mark other issues as fixed in the feed status area
                        if (!((fieldName === 'title' || fieldName === 'description') &&
                             (currentLength >= minLength && currentLength <= maxLength))) {
                            feedErrorUIManager.markIssueAsFixed(offerId, fieldName);
                        } else {
                            console.log(`[FeedCoordinator] Skipping title/description length fix in feed status area`);
                        }
                    } else {
                        console.log("[FeedCoordinator] FeedErrorUIManager or markIssueAsFixed method not available to notify.");
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
     * Gets the corrected table data from the display manager
     * @returns {Array<object>} The corrected table data
     */
    getCorrectedTableData() {
        if (this.managers.displayManager) {
            return this.managers.displayManager.getCorrectedTableData();
        }
        console.error('[DEBUG] DisplayManager not available for getCorrectedTableData');
        return [];
    }

    /**
     * Gets the applied corrections from the display manager
     * @returns {Array<object>} The applied corrections
     */
    getAppliedCorrections() {
        if (this.managers.displayManager) {
            return this.managers.displayManager.getAppliedCorrections();
        }
        console.error('[DEBUG] DisplayManager not available for getAppliedCorrections');
        return [];
    }

    /**
     * Navigates to a specific row in the feed preview
     * @param {number} rowIndex - The row index to navigate to
     * @param {string} fieldToFocus - The field to focus within the row
     */
    navigateToRow(rowIndex, fieldToFocus) {
        if (this.managers.displayManager) {
            this.managers.displayManager.navigateToRow(rowIndex, fieldToFocus);
        } else {
            console.error('[DEBUG] DisplayManager not available for navigateToRow');
        }
    }
}

// No export statements needed for regular scripts

// Make globally available
window.FeedCoordinator = FeedCoordinator;