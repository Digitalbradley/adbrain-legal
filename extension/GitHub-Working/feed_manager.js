// Utility function for debouncing (Copied from popup.js)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
        this.elements = elements;
        this.managers = managers; // Store loadingManager, errorManager, searchManager, monitor, validationUIManager
        // <<< Note: validationUIManager is now expected here due to popup.js changes

        if (!this.elements.fileInput || !this.elements.previewButton || !this.elements.previewContentContainer) {
            console.error('FeedManager: Required DOM elements missing!', elements);
        }
        // Updated check to include validationUIManager
        if (!this.managers.loadingManager || !this.managers.errorManager || !this.managers.searchManager || !this.managers.monitor || !this.managers.validationUIManager) {
             console.error('FeedManager: Required managers missing!', managers);
        }
        this.offerIdToRowIndexMap = {}; // Map offerId to visual row index

        this.initialize();
    }

    initialize() {
        console.log('Initializing FeedManager...');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', () => {
                if (this.elements.previewButton) {
                    this.elements.previewButton.disabled = !this.elements.fileInput.files?.length;
                }
            });
             if (this.elements.previewButton) {
                 this.elements.previewButton.disabled = !this.elements.fileInput.files?.length;
             }
        } else { console.error("FeedManager: fileInput element not provided."); }

        if (this.elements.previewButton) {
            this.elements.previewButton.addEventListener('click', () => this.handlePreview());
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
                        row.classList.add('needs-fix'); // Add persistent yellow highlight
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentLength}/${minLength}`);
                    } else if (currentLength > maxLength) {
                        // Over maximum length - show error state
                        event.target.classList.remove('under-minimum');
                        event.target.classList.add('over-limit');
                        row.classList.add('needs-fix'); // Add persistent yellow highlight
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentLength}/${maxLength}`);
                    } else {
                        // Valid length - show success state
                        event.target.classList.remove('under-minimum');
                        event.target.classList.remove('over-limit');
                        
                        console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) met length reqs (${currentLength}). Notifying UI Manager.`);
                        
                        // Check if all fields in the row are valid before removing the needs-fix class
                        const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                        if (invalidFields.length === 0) {
                            row.classList.remove('needs-fix'); // Remove the persistent yellow highlight
                            row.classList.add('fix-complete'); // Add temporary green success highlight
                            
                            // Notify ValidationUIManager to remove the issue from the panel
                            if (this.managers.validationUIManager && typeof this.managers.validationUIManager.markIssueAsFixed === 'function') {
                                console.log(`[FeedManager] Notifying UI Manager to fix offerId: ${offerId}, field: ${fieldName}`);
                                this.managers.validationUIManager.markIssueAsFixed(offerId, fieldName);
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
            }, 300)); // Reduced debounce time from 500ms to 300ms for more responsive feedback
            console.log('[FeedManager] Added delegated input event listener to previewContentContainer');
        } else {
            console.error("FeedManager: previewContentContainer element not provided.");
        }
    }

    async handlePreview() {
        const { fileInput } = this.elements;
        // Ensure managers exist before destructuring
        const loadingManager = this.managers.loadingManager || { showLoading: ()=>{}, hideLoading: ()=>{} };
        const errorManager = this.managers.errorManager || { showError: alert, showSuccess: alert };
        const monitor = this.managers.monitor || { logOperation: ()=>{}, logError: console.error };
        const searchManager = this.managers.searchManager;

        try {
            monitor.logOperation('preview', 'started');

            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                errorManager.showError('Please select a file first');
                monitor.logOperation('preview', 'failed', { reason: 'no_file' });
                return;
            }

            loadingManager.showLoading('Processing feed...');

            const file = fileInput.files[0];
            const csvText = await this.readFileAsText(file);
            const data = this.parseCSV(csvText);

            await this.displayPreview(data);

            // Update search columns after display
            if (searchManager && typeof searchManager.updateSearchColumns === 'function') {
                searchManager.updateSearchColumns();
            } else {
                 console.warn("SearchManager not available or missing updateSearchColumns method.");
            }

            monitor.logOperation('preview', 'completed', { products: data.length, fileName: file.name });
            errorManager.showSuccess(`Preview loaded for ${file.name}`, 2000);

        } catch (error) {
            monitor.logError(error, 'handlePreview');
            errorManager.showError(`Failed to preview file: ${error.message}. Please check the format.`);
        } finally {
            loadingManager.hideLoading();
        }
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
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

    parseCSV(csvText) {
         if (!csvText || !csvText.trim()) return [];
        const lines = csvText.split(/[\r\n]+/).filter(line => line.trim());
        if (lines.length < 1) throw new Error("CSV file appears empty or has no header row.");
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
        if (headers.length === 0 || headers.every(h => !h)) throw new Error("Could not parse headers from CSV.");
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i]; if (!line.trim()) continue;
            const values = []; let currentVal = ''; let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') { if (inQuotes && line[j+1] === '"') { currentVal += '"'; j++; } else { inQuotes = !inQuotes; } }
                else if (char === ',' && !inQuotes) { values.push(currentVal); currentVal = ''; }
                else { currentVal += char; }
            }
            values.push(currentVal);
            if (values.length > headers.length) { console.warn(`Row ${i+1} truncated.`); values.length = headers.length; }
            else if (values.length < headers.length) { console.warn(`Row ${i+1} padded.`); while (values.length < headers.length) values.push(''); }
            const row = {}; let hasValue = false;
            headers.forEach((header, index) => { if (header) { const value = (values[index] || '').trim(); row[header] = value; if (value) hasValue = true; } });
            if (hasValue) data.push(row);
        }
        if (data.length === 0) console.warn("CSV parsed, but no data rows found.");
        return data;
    }

    async displayPreview(data) {
        const container = this.elements.previewContentContainer;
        if (!container) { console.error("Preview container not found."); return; }
        if (!data || data.length === 0) { container.innerHTML = '<p class="no-data-message">No data to display.</p>'; return; }
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
        container.innerHTML = ''; container.appendChild(table);
        console.log(`Displayed preview for ${data.length} products.`);
        
        // Initialize the floating scroll bar after the table is created
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
                    
                    // Apply appropriate validation classes
                    if (currentLength < minLength) {
                        field.classList.add('under-minimum');
                        field.classList.remove('over-limit');
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                        
                        // Mark the row as needing fix
                        const row = field.closest('tr');
                        if (row) {
                            row.classList.add('needs-fix');
                        }
                        
                        console.log(`[FeedManager] Post-display validation: Field "${fieldType}" is under minimum length (${currentLength}/${minLength})`);
                    } else if (currentLength > maxLength) {
                        field.classList.remove('under-minimum');
                        field.classList.add('over-limit');
                        
                        // Update the character count display
                        const charCountDisplay = field.nextElementSibling;
                        if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                            charCountDisplay.style.color = '#dc3545'; // Red for error
                        }
                        
                        // Mark the row as needing fix
                        const row = field.closest('tr');
                        if (row) {
                            row.classList.add('needs-fix');
                        }
                        
                        console.log(`[FeedManager] Post-display validation: Field "${fieldType}" exceeds maximum length (${currentLength}/${maxLength})`);
                    }
                }
            });
        }, 500); // Delay to ensure DOM is fully rendered
    }

    sanitizeText(text) {
         if (typeof text !== 'string') return '';
        return text.normalize('NFKD')
            .replace(/[\u2022]/g, '•').replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
            .replace(/\s+/g, ' ').trim();
    }

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
                
                // Mark the row as needing fix
                const row = field.closest('tr');
                if (row) {
                    row.classList.add('needs-fix');
                    
                    // If we have a validation UI manager, make sure it knows about this issue
                    const offerId = row.dataset.offerId;
                    if (offerId && this.managers.validationUIManager) {
                        console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) does NOT meet requirements. Length: ${currentCount}/${minLength}`);
                    }
                }
            } else if (currentCount > maxLength) {
                // Over maximum length - show error state
                field.classList.remove('under-minimum');
                field.classList.add('over-limit');
                charCountDisplay.style.color = '#dc3545'; // Red for error
                
                // Mark the row as needing fix
                const row = field.closest('tr');
                if (row) {
                    row.classList.add('needs-fix');
                    
                    // If we have a validation UI manager, make sure it knows about this issue
                    const offerId = row.dataset.offerId;
                    if (offerId && this.managers.validationUIManager) {
                        console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) exceeds maximum length. Length: ${currentCount}/${maxLength}`);
                    }
                }
            } else {
                // Valid length - show success state
                field.classList.remove('under-minimum');
                field.classList.remove('over-limit');
                charCountDisplay.style.color = '#28a745'; // Green for success
                
                // Check if the field meets requirements on initial load or update
                // This ensures fields that already meet requirements are validated immediately
                const row = field.closest('tr');
                if (row) {
                    const offerId = row.dataset.offerId;
                    if (offerId && this.managers.validationUIManager) {
                        console.log(`[FeedManager] Field "${type}" (Row ${rowIndex}) meets requirements on load/update. Length: ${currentCount}`);
                        // Notify ValidationUIManager to remove the issue
                        this.managers.validationUIManager.markIssueAsFixed(offerId, type);
                        
                        // Remove the needs-fix class if all fields in the row are valid
                        const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                        if (invalidFields.length === 0) {
                            row.classList.remove('needs-fix');
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
     * Extracts the current data from the preview table.
     * @returns {Array<object>} Array of product data objects.
     */
    getTableData() {
        const table = this.elements.previewContentContainer?.querySelector('table.preview-table');
        if (!table) { console.warn('No data table found for getTableData'); return []; }
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
      * Scrolls the preview table to a specific row and highlights it for fixing.
      * @param {number} rowIndex - The 1-based index of the row to navigate to.
      * @param {string} [fieldToFocus] - Optional field name to focus within the row.
      */
     navigateToRow(rowIndex, fieldToFocus = null) {
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

        // Remove row-highlight-scroll class from all rows
        this.elements.previewContentContainer?.querySelectorAll('tbody tr.row-highlight-scroll').forEach(row => {
            row.classList.remove('row-highlight-scroll');
        });

        // Add persistent highlight for fixing *before* scrolling/focusing
        targetRow.classList.add('needs-fix');

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
    * Initializes and sets up the floating horizontal scroll bar
    * that stays fixed at the top of the viewport during vertical scrolling.
    */
   initFloatingScrollBar() {
       // Get references to the elements
       const dataContainer = document.querySelector('.data-container');
       const floatingScroll = document.querySelector('.floating-scroll');
       const scrollTrack = document.querySelector('.scroll-track');
       const scrollThumb = document.querySelector('.scroll-thumb');
       
       if (!dataContainer || !floatingScroll || !scrollTrack || !scrollThumb) {
           console.error('Required elements for floating scroll bar not found');
           return;
       }
       
       // Show the floating scroll bar
       floatingScroll.style.display = 'block';
       
       // Calculate and set initial thumb width based on table width vs container width
       const table = dataContainer.querySelector('.preview-table');
       if (!table) {
           console.error('Preview table not found');
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
}

// Make globally available
window.FeedManager = FeedManager;