/**
 * Manages the creation and interaction of validation panels,
 * including floating panels for validation results and summary panels.
 */
class ValidationPanelManager {
    /**
     * @param {object} managers - Other manager instances.
     * @param {FeedCoordinator} managers.feedCoordinator - For navigating to rows.
     * @param {ErrorManager} managers.errorManager - For displaying errors.
     * @param {LoadingManager} managers.loadingManager - For showing loading states.
     * @param {MonitorManager} managers.monitor - For logging operations.
     */
    constructor(managers) {
        this.managers = managers;
        this.activeValidationPanel = null; // Track the currently open panel
        
        if (!this.managers.feedCoordinator) {
            console.warn("ValidationPanelManager: FeedCoordinator not provided, row navigation might be limited.");
        }
        
        if (!this.managers.errorManager) {
            console.warn("ValidationPanelManager: ErrorManager not provided.");
            // Use placeholder if missing
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
    }

    /**
     * Creates and displays a validation panel with the provided data.
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} validationData - The validation results data.
     */
    handleViewDetails(feedId, validationData) {
        console.log(`[DEBUG] ValidationPanelManager: handleViewDetails called for feedId: ${feedId}`, validationData); // ADDED LOG
        // Close existing panel first
        this.activeValidationPanel?.remove();
        this.activeValidationPanel = null;

        // Create validation panel using the results
        const panel = this.createValidationPanel(feedId, validationData);
        if (!panel) return; // Exit if panel creation failed

        // Add row navigation interactivity to the new panel
        this.setupRowNavigation(panel);

        // Make sure panel is visible and positioned
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.right = '20px'; // Example positioning
        panel.style.top = '150px'; // Example positioning

        this.activeValidationPanel = panel; // Track the new panel
    }

    /**
     * Creates a validation panel element with the provided data.
     * @param {string} feedId - The ID of the feed being validated.
     * @param {object} data - The validation results data.
     * @returns {HTMLElement|null} - The created panel element, or null if creation failed.
     */
    createValidationPanel(feedId, data) {
        console.log(`[DEBUG] ValidationPanelManager: createValidationPanel called for feedId: ${feedId}`);
        console.log('[DEBUG] ValidationPanelManager: data provided:', data);
        
        if (!data || data.issues === undefined) { // Check for issues array specifically
            console.error('[DEBUG] ValidationPanelManager: Invalid validation data provided to createValidationPanel:', data);
            this.managers.errorManager.showError('Could not display validation results: Invalid data.');
            return null;
        }
        
        try {
            const issueCount = data.issues.length;
            console.log(`[DEBUG] ValidationPanelManager: Creating panel with ${issueCount} issues`);
            
            const panel = document.createElement('div');
            console.log('[DEBUG] ValidationPanelManager: Panel element created:', panel);
            
            panel.className = 'floating-validation-panel';
            panel.dataset.feedId = feedId;

            // Use helper to group issues for filtering counts
            const issuesByRow = this.groupIssuesByRow(data.issues);
            console.log('[DEBUG] ValidationPanelManager: Issues grouped by row:', issuesByRow);

            panel.innerHTML = `
                <div class="panel-header">
                    <h3>GMC Validation Issues</h3>
                    <button class="close-panel" title="Close Panel">&times;</button>
                </div>
                <div class="validation-summary">
                    <span class="issue-count ${issueCount > 0 ? 'has-issues' : ''}">${issueCount} Issues Found</span>
                    <span class="feed-id">Feed ID: ${feedId}</span>
                    <span class="validation-status ${data.isValid ? 'valid' : 'invalid'}">${data.isValid ? 'Feed Valid' : 'Feed Invalid'}</span>
                </div>
                <div class="issues-container">
                    <!-- Basic Filters Example (can be enhanced) -->
                    <!--
                    <div class="quick-filters">
                        <button class="filter-btn active" data-filter="all">All (${issueCount})</button>
                        <button class="filter-btn" data-filter="error">Errors (${data.issues.filter(i=>i.type==='error').length})</button>
                        <button class="filter-btn" data-filter="warning">Warnings (${data.issues.filter(i=>i.type==='warning').length})</button>
                    </div>
                    -->
                    ${this.formatValidationIssues(data.issues, issuesByRow)}
                </div>`;
                
            console.log('[DEBUG] ValidationPanelManager: Panel HTML content set');
            
            const closeBtn = panel.querySelector('.close-panel');
            if (closeBtn) {
                console.log('[DEBUG] ValidationPanelManager: Close button found, setting up click handler');
                closeBtn.onclick = () => {
                    panel.remove();
                    if (this.activeValidationPanel === panel) this.activeValidationPanel = null;
                };
            } else {
                console.warn('[DEBUG] ValidationPanelManager: Close button not found in panel');
            }
            
            console.log('[DEBUG] ValidationPanelManager: Making panel draggable');
            this.makeDraggable(panel);
            
            console.log('[DEBUG] ValidationPanelManager: Appending panel to document body');
            document.body.appendChild(panel);
            
            console.log('[DEBUG] ValidationPanelManager: Panel creation complete, returning panel');
            return panel;
        } catch (error) {
            console.error('[DEBUG] ValidationPanelManager: Error creating validation panel:', error);
            this.managers.errorManager?.showError('Error creating validation panel: ' + error.message);
            return null;
        }
    }

    /**
     * Creates and displays a simple panel showing the summary of a historical validation run.
     * @param {string} historyId - The Firestore document ID.
     * @param {object} historyData - The data fetched from the Firestore document.
     */
    createAndShowSummaryPanel(historyId, historyData) {
        // Close any existing panel first (validation details or another summary)
        this.activeValidationPanel?.remove();
        this.activeValidationPanel = null;

        const panel = document.createElement('div');
        panel.className = 'floating-validation-panel summary-panel'; // Add specific class
        panel.dataset.historyId = historyId;

        const summary = historyData.summary || {};
        const timestamp = historyData.timestamp?.toDate ? historyData.timestamp.toDate().toLocaleString() : 'N/A';
        const isValidText = historyData.isValid ? 'Valid' : 'Invalid';
        const isValidClass = historyData.isValid ? 'valid' : 'invalid';

        panel.innerHTML = `
            <div class="panel-header">
                <h3>Validation Summary</h3>
                <button class="close-panel" title="Close Panel">&times;</button>
            </div>
            <div class="validation-summary">
                <span class="timestamp">Run Time: ${timestamp}</span>
                <span class="feed-id">Feed ID: ${historyData.feedId || 'N/A'}</span>
                <span class="validation-status ${isValidClass}">${isValidText}</span>
            </div>
            <div class="summary-details">
                <h4>Run Metrics:</h4>
                <ul>
                    <li>Total Products Processed: ${historyData.totalProducts ?? 'N/A'}</li>
                    <li>Valid Products: ${historyData.validProducts ?? 'N/A'}</li>
                </ul>
                <h4>Issue Summary:</h4>
                <ul>
                    <li>Total Issues Found: ${summary.totalIssues ?? 'N/A'}</li>
                    <li>Errors: ${summary.errorCount ?? 'N/A'}</li>
                    <li>Warnings: ${summary.warningCount ?? 'N/A'}</li>
                    <li>Title Issues: ${summary.titleIssues ?? 'N/A'}</li>
                    <li>Description Issues: ${summary.descriptionIssues ?? 'N/A'}</li>
                    <li>Other Field Issues: ${summary.otherIssues ?? 'N/A'}</li>
                </ul>
                <p class="note">Note: Detailed issue list is not available for historical runs in this view.</p>
            </div>
        `;

        const closeBtn = panel.querySelector('.close-panel');
        if (closeBtn) {
            closeBtn.onclick = () => {
                panel.remove();
                if (this.activeValidationPanel === panel) this.activeValidationPanel = null;
            };
        }

        this.makeDraggable(panel); // Reuse draggable functionality
        document.body.appendChild(panel);

        // Position the panel (example)
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.right = '20px';
        panel.style.top = '150px';

        this.activeValidationPanel = panel; // Track the summary panel
    }

    /**
     * Sets up row navigation for the validation panel.
     * @param {HTMLElement} panel - The panel element to set up navigation for.
     */
    setupRowNavigation(panel) {
        console.log('[DEBUG] ValidationPanelManager: setupRowNavigation called with panel:', panel);
        
        if (!panel) {
            console.warn('[DEBUG] ValidationPanelManager: setupRowNavigation called with null panel');
            return;
        }
        
        const rowLinks = panel.querySelectorAll('.row-link');
        console.log(`[DEBUG] ValidationPanelManager: Found ${rowLinks.length} row links in panel`);
        
        rowLinks.forEach((link, index) => {
            console.log(`[DEBUG] ValidationPanelManager: Setting up row link ${index}:`, link);
            
            link.onclick = (e) => { // Use onclick for simplicity, prevents multiple listeners
                console.log(`[DEBUG] ValidationPanelManager: Row link ${index} clicked`);
                e.preventDefault();
                
                const rowIndex = parseInt(link.dataset.row);
                console.log(`[DEBUG] ValidationPanelManager: Parsed row index: ${rowIndex}`);
                
                if (!isNaN(rowIndex)) {
                    // --- ADDED: Get the field name to focus ---
                    const issueGroup = link.closest('.issue-group');
                    console.log(`[DEBUG] ValidationPanelManager: Found issue group:`, issueGroup);
                    
                    const firstIssueItem = issueGroup?.querySelector('.issue-item');
                    console.log(`[DEBUG] ValidationPanelManager: Found first issue item:`, firstIssueItem);
                    
                    const fieldToFix = firstIssueItem?.dataset.field || null; // Get field from first issue, or null
                    console.log(`[DEBUG] ValidationPanelManager: Go to Row clicked. Row: ${rowIndex}, Field to focus: ${fieldToFix}`);
                    // --- END ADDED ---

                    // Delegate navigation to FeedCoordinator if available
                    if (this.managers.feedCoordinator && typeof this.managers.feedCoordinator.navigateToRow === 'function') {
                        console.log(`[DEBUG] ValidationPanelManager: Calling feedCoordinator.navigateToRow(${rowIndex}, ${fieldToFix})`);
                        this.managers.feedCoordinator.navigateToRow(rowIndex, fieldToFix); // Pass fieldToFix
                    } else {
                        // Fallback or alternative navigation logic if FeedCoordinator doesn't handle it
                        console.warn('[DEBUG] ValidationPanelManager: FeedCoordinator not available for navigation. Scrolling generically.');
                        // No local fallback version - we rely on FeedManager
                    }
                } else {
                    console.error(`[DEBUG] ValidationPanelManager: Invalid row index: ${link.dataset.row}`);
                }
            };
            
            console.log(`[DEBUG] ValidationPanelManager: Row link ${index} setup complete`);
        });
        
        console.log('[DEBUG] ValidationPanelManager: setupRowNavigation completed');
    }

    /**
     * Makes an element draggable by its header.
     * @param {HTMLElement} element - The element to make draggable.
     */
    makeDraggable(element) {
        console.log('[DEBUG] ValidationPanelManager: makeDraggable called with element:', element);
        
        const header = element.querySelector('.panel-header');
        if (!header) {
            console.warn('[DEBUG] ValidationPanelManager: Panel header not found, cannot make draggable');
            return;
        }
        
        console.log('[DEBUG] ValidationPanelManager: Found panel header:', header);
        let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

        try {
            // Get initial transform values if they exist
            console.log('[DEBUG] ValidationPanelManager: Getting initial transform values');
            const initialTransform = window.getComputedStyle(element).transform;
            console.log('[DEBUG] ValidationPanelManager: Initial transform:', initialTransform);
            
            if (initialTransform && initialTransform !== 'none') {
                console.log('[DEBUG] ValidationPanelManager: Using existing transform');
                const matrix = new DOMMatrixReadOnly(initialTransform);
                xOffset = matrix.m41; // e value for translate X
                yOffset = matrix.m42; // f value for translate Y
                console.log(`[DEBUG] ValidationPanelManager: Initial offset from matrix: x=${xOffset}, y=${yOffset}`);
            } else {
                // Fallback if no initial transform (might happen if centered differently)
                console.log('[DEBUG] ValidationPanelManager: No initial transform, using fallback positioning');
                // Center it based on viewport if not already positioned
                const rect = element.getBoundingClientRect();
                xOffset = (window.innerWidth / 2) - (rect.width / 2);
                yOffset = (window.innerHeight / 2) - (rect.height / 2);
                element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
                element.style.left = '0px'; // Reset direct positioning
                element.style.top = '0px';
                console.log(`[DEBUG] ValidationPanelManager: Set initial position: x=${xOffset}, y=${yOffset}`);
            }

            console.log('[DEBUG] ValidationPanelManager: Setting up drag event handlers');
            
            const mouseDownHandler = (e) => {
                console.log('[DEBUG] ValidationPanelManager: mousedown event triggered');
                if (e.target !== header && !header.contains(e.target)) {
                    console.log('[DEBUG] ValidationPanelManager: Ignoring mousedown outside header');
                    return;
                }
                isDragging = true;
                initialX = e.clientX - xOffset; // Store initial mouse position relative to current element offset
                initialY = e.clientY - yOffset;
                element.style.cursor = 'grabbing';
                header.style.cursor = 'grabbing';
                console.log(`[DEBUG] ValidationPanelManager: Drag started at x=${e.clientX}, y=${e.clientY}`);
                e.preventDefault();
            };

            const mouseMoveHandler = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX; // Calculate new offset based on mouse movement
                    currentY = e.clientY - initialY;
                    xOffset = currentX; // Update offset for next move event
                    yOffset = currentY;
                    element.style.transform = `translate(${currentX}px, ${currentY}px)`; // Apply transform
                }
            };

            const mouseUpHandler = () => {
                if (isDragging) {
                    console.log('[DEBUG] ValidationPanelManager: mouseup event - drag ended');
                    isDragging = false;
                    element.style.cursor = '';
                    header.style.cursor = 'grab';
                }
            };
            
            header.addEventListener('mousedown', mouseDownHandler);
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
            header.style.cursor = 'grab';
            
            // Store handlers to remove them later if the element is destroyed
            element._dragHandlers = { mouseDownHandler, mouseMoveHandler, mouseUpHandler };
            
            console.log('[DEBUG] ValidationPanelManager: Drag handlers attached successfully');
        } catch (error) {
            console.error('[DEBUG] ValidationPanelManager: Error making panel draggable:', error);
        }
    }

    /**
     * Formats validation issues for display in the panel.
     * @param {Array} issues - The validation issues to format.
     * @param {object} issuesByRow - The issues grouped by row.
     * @returns {string} - The formatted HTML for the issues.
     */
    formatValidationIssues(issues, issuesByRow) {
        if (!issues || !issues.length) return '<p class="no-issues">No issues found according to Google Merchant Center!</p>';
        if (!issuesByRow) issuesByRow = this.groupIssuesByRow(issues); // Recalculate if not passed

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
                            const offerId = issue.offerId || issue['Offer ID'] || ''; // Get offerId, handle potential missing value
                            return `
                            <div class="issue-item ${issue.type || 'error'}"
                                 data-row="${rowIndex}"
                                 data-field="${issue.field || 'general'}"
                                 data-offer-id="${offerId}">
                                <span class="issue-severity">${issue.type || 'error'}</span>
                                <span class="issue-message">${issue.message || 'Unknown issue'}</span>
                                ${issue.field && issue.field !== 'general' ? `<span class="issue-field">(Field: ${issue.field})</span>` : ''}
                            </div>`; // End the template literal here
                        }).join('')}
                    </div>
                `).join('')}
            </div>`;
    }

    /**
     * Groups validation issues by row for display.
     * @param {Array} issues - The validation issues to group.
     * @returns {object} - The issues grouped by row.
     */
    groupIssuesByRow(issues) {
        if (!issues) return {};
        return issues.reduce((groups, issue) => {
            const rowIndex = issue.rowIndex || 'unknown';
            if (!groups[rowIndex]) groups[rowIndex] = [];
            groups[rowIndex].push(issue);
            return groups;
        }, {});
    }

    /**
     * Counts issues by type.
     * @param {Array} issues - The validation issues to count.
     * @param {string} type - The type of issue to count.
     * @param {boolean} exclusive - Whether to count only rows with exclusively this type of issue.
     * @returns {number} - The count of issues.
     */
    countIssuesByType(issues, type, exclusive = false) {
        if (!issues) return 0;
        if (!exclusive) return issues.filter(issue => issue.field === type).length;
        const issuesByRow = this.groupIssuesByRow(issues);
        return Object.values(issuesByRow).filter(rowIssues => rowIssues.length === 1 && rowIssues[0].field === type).length;
    }

    /**
     * Counts rows with both title and description issues.
     * @param {object} issuesByRow - The issues grouped by row.
     * @returns {number} - The count of rows with both types of issues.
     */
    countRowsWithBothIssues(issuesByRow) {
        if (!issuesByRow) return 0;
        return Object.values(issuesByRow).filter(rowIssues => rowIssues.length > 1 && rowIssues.some(i => i.field === 'title') && rowIssues.some(i => i.field === 'description')).length;
    }
}

// Make globally available for backward compatibility
window.ValidationPanelManager = ValidationPanelManager;

// Default export for easier importing
// No default export needed for regular scripts