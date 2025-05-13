/**
 * Feed Display Manager Module
 *
 * Responsible for rendering parsed data into the HTML table, creating/managing editable cells,
 * character counts, row highlighting, and the floating scrollbar.
 */
// Use global debounce function
// No need to import it since it's already available globally

class FeedDisplayManager {
    /**
     * @param {object} elements - DOM element references.
     * @param {HTMLElement} elements.previewContentContainer - Container for the preview table
     * @param {object} managers - Other manager instances.
     * @param {ValidationUIManager} managers.validationUIManager - For marking issues as fixed
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers;
        
        if (!this.elements.previewContentContainer) {
            console.error('FeedDisplayManager: Required previewContentContainer element missing!', elements);
        }
        
        this.offerIdToRowIndexMap = {}; // Map offerId to visual row index
        
        console.log('[FeedDisplayManager] Initialized');
    }

    /**
     * Displays the parsed data in a table format
     * @param {Array<object>} data - The parsed data to display
     * @returns {Promise<void>}
     */
    async displayPreview(data) {
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
            console.log('[FeedDisplayManager] Running post-display validation check on all editable fields');
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
                        console.log(`[FeedDisplayManager] Post-display validation: Field "${fieldType}" is under minimum length (${currentLength}/${minLength})`);
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
                        console.log(`[FeedDisplayManager] Post-display validation: Field "${fieldType}" exceeds maximum length (${currentLength}/${maxLength})`);
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
     * Sanitizes text by normalizing and replacing special characters
     * @param {string} text - The text to sanitize
     * @returns {string} - The sanitized text
     */
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.normalize('NFKD')
            .replace(/[\u2022]/g, '•').replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
            .replace(/\s+/g, ' ').trim();
    }

    /**
     * Creates an editable cell for the preview table
     * @param {string} content - The cell content
     * @param {string} type - The field type ('title' or 'description')
     * @param {number} rowIndex - The row index
     * @returns {HTMLElement} - The cell element
     */
    createEditableCell(content, type, rowIndex) {
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
                    console.log(`[FeedDisplayManager] Field "${type}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentCount}/${minLength}`);
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
                    console.log(`[FeedDisplayManager] Field "${type}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentCount}/${maxLength}`);
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
                        console.log(`[FeedDisplayManager] Field "${type}" (Row ${rowIndex}) meets requirements on load/update. Length: ${currentCount}`);
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
     * Extracts the current data from the preview table, including any inline edits.
     * @returns {Array<object>} Array of product data objects reflecting the current state.
     */
    getCorrectedTableData() {
        const table = this.elements.previewContentContainer?.querySelector('table.preview-table');
        if (!table) { console.warn('No data table found for getCorrectedTableData'); return []; }
        const headerCells = Array.from(table.querySelectorAll('thead th'));
        const headers = headerCells.map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowData = {};
            headers.forEach((headerName, index) => {
                if (headerName) {
                    const cell = cells[index];
                    if (cell) {
                        const editableField = cell.querySelector('.editable-field');
                        const value = editableField ? editableField.textContent.trim() : cell.textContent.trim();
                        rowData[headerName] = value;
                    } else { rowData[headerName] = ''; }
                }
            });
            return rowData;
        }).filter(row => Object.values(row).some(val => val !== ''));
    }

    /**
     * Placeholder method to get applied corrections.
     * Needs proper implementation to track user edits or compare original vs current data.
     * @returns {Array} An array representing the corrections (format TBD).
     */
    getAppliedCorrections() {
        console.warn("FeedDisplayManager.getAppliedCorrections() is a placeholder and needs implementation.");
        // TODO: Implement logic to track or diff changes made in the editable table.
        // This might involve storing the original data or tracking edit events.
        // The return format needs to be defined based on how templates will store/apply rules.
        // Example possible return format: [{ offerId: '123', field: 'title', newValue: 'New Corrected Title' }, ...]
        return []; // Return empty array for now
    }
/**
     * Scrolls the preview table to a specific row and highlights it for fixing.
     * @param {number} rowIndex - The 1-based index of the row to navigate to.
     * @param {string} [fieldToFocus] - Optional field name to focus within the row.
     */
    navigateToRow(rowIndex, fieldToFocus = null) {
        // Ensure the Feed Preview tab is active first
        const feedTabButton = document.querySelector('.tab-button[data-tab="feed"]');
        const feedTabPanel = document.getElementById('feed-tab');
        if (feedTabButton && feedTabPanel && !feedTabPanel.classList.contains('active')) {
            console.log('FeedDisplayManager: Switching to Feed Preview tab for navigation.');
            // Deactivate other tabs
            document.querySelectorAll('.tab-button.active').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel.active').forEach(panel => panel.classList.remove('active'));
            // Activate feed tab
            feedTabButton.classList.add('active');
            feedTabPanel.classList.add('active');
        }

        const targetRow = this.elements.previewContentContainer?.querySelector(`tbody tr[data-row="${rowIndex}"]`);
        if (!targetRow) { console.warn(`Row with index ${rowIndex} not found in FeedDisplayManager.`); return; }

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
                        console.log(`[FeedDisplayManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Under minimum length (${currentLength}/${minLength})`);
                    } else if (currentLength > maxLength) {
                        fieldElement.classList.remove('under-minimum');
                        fieldElement.classList.add('over-limit');
                        console.log(`[FeedDisplayManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Over maximum length (${currentLength}/${maxLength})`);
                    } else {
                        fieldElement.classList.remove('under-minimum');
                        fieldElement.classList.remove('over-limit');
                        console.log(`[FeedDisplayManager] Navigated to field "${fieldToFocus}" (Row ${rowIndex}): Valid length (${currentLength})`);
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
                        console.log(`[FeedDisplayManager] Field "${fieldName}" (Row ${rowIndex}): Under minimum length (${currentLength}/${minLength})`);
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                    } else if (currentLength > maxLength) {
                        field.classList.remove('under-minimum');
                        field.classList.add('over-limit');
                        console.log(`[FeedDisplayManager] Field "${fieldName}" (Row ${rowIndex}): Over maximum length (${currentLength}/${maxLength})`);
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                    } else {
                        field.classList.remove('under-minimum');
                        field.classList.remove('over-limit');
                        console.log(`[FeedDisplayManager] Field "${fieldName}" (Row ${rowIndex}): Valid length (${currentLength})`);
                        
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
/**
     * Initializes and sets up the floating horizontal scroll bar
     * that stays fixed at the top of the viewport during vertical scrolling.
     */
    initFloatingScrollBar() {
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
     * Gets the mapping of offer IDs to row indices
     * @returns {object} The mapping of offer IDs to row indices
     */
    getOfferIdToRowIndexMap() {
        return this.offerIdToRowIndexMap;
    }

    /**
     * Sets up event listeners for editable fields
     * @param {function} onFieldEdit - Callback function to be called when a field is edited
     */
    setupEditableFieldListeners(onFieldEdit) {
        if (!this.elements.previewContentContainer) {
            console.error('FeedDisplayManager: previewContentContainer element missing!');
            return;
        }

        // Add a delegated event listener for all editable fields
        this.elements.previewContentContainer.addEventListener('input', debounce((event) => {
            // Check if the target is an editable field
            if (event.target.classList.contains('editable-field')) {
                if (typeof onFieldEdit === 'function') {
                    onFieldEdit(event);
                }
            }
        }, 300)); // Reduced debounce time from 500ms to 300ms for more responsive feedback
    }
}

// Make globally available for backward compatibility
window.FeedDisplayManager = FeedDisplayManager;