// Simplified version of popup.js to fix the Preview Feed functionality
// Use global debounce function from popup_utils.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] Simplified popup.js loaded');
    
    // Get UI element references
    const fileInputEl = document.getElementById('fileInput');
    const previewButtonEl = document.getElementById('previewFeed');
    const previewContentContainer = document.getElementById('previewContent');
    
    console.log('[DEBUG] UI elements:', {
        fileInputEl,
        previewButtonEl,
        previewContentContainer
    });
    
    // Set up tab switching
    const setupTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        console.log('[DEBUG] Setting up tab switching with buttons:', tabButtons.length, 'panels:', tabPanels.length);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                console.log('[DEBUG] Tab clicked:', tabId);
                
                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                const panel = document.getElementById(`${tabId}-tab`);
                if (panel) {
                    panel.classList.add('active');
                    console.log('[DEBUG] Activated panel:', tabId);
                } else {
                    console.error('[DEBUG] Tab panel not found for ID:', tabId);
                }
            });
        });
    };
    
    // Initialize tabs
    setupTabs();
    
    // Set up event listeners
    if (fileInputEl) {
        fileInputEl.addEventListener('change', () => {
            console.log('[DEBUG] File input changed');
            if (previewButtonEl) {
                previewButtonEl.disabled = !fileInputEl.files?.length;
            }
        });
    }
    
    if (previewButtonEl) {
        console.log('[DEBUG] Setting up preview button click listener');
        previewButtonEl.addEventListener('click', handlePreview);
    }
    
    // Add a delegated event listener for all editable fields
    if (previewContentContainer) {
        previewContentContainer.addEventListener('input', window.debounce((event) => {
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
                    
                    console.log(`[FeedManager] Field "${fieldName}" (Row ${rowIndex}) met length reqs (${currentLength}).`);
                    
                    // Check if all fields in the row are valid before removing the needs-fix class
                    const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                    if (invalidFields.length === 0) {
                        row.classList.remove('needs-fix'); // Remove the persistent yellow highlight
                        row.classList.remove('validation-focus'); // Remove the validation focus marker
                        row.classList.add('fix-complete'); // Add temporary green success highlight
                        
                        // Remove row highlighting classes directly
                        row.classList.remove('row-highlight');
                        row.classList.remove('highlighted-row');
                        
                        // Notify validation systems to remove the issue from the panel
                        // First try the DirectValidationUI system
                        if (window.DirectValidationUI && typeof window.DirectValidationUI.markIssueAsFixed === 'function') {
                            console.log(`[FeedManager] Notifying DirectValidationUI to fix offerId: ${offerId}, field: ${fieldName}`);
                            window.DirectValidationUI.markIssueAsFixed(offerId, fieldName);
                        }
                        
                        // Then try the ValidationUIManager system
                        if (window.validationUIManager && typeof window.validationUIManager.markIssueAsFixed === 'function') {
                            console.log(`[FeedManager] Notifying ValidationUIManager to fix offerId: ${offerId}, field: ${fieldName}`);
                            window.validationUIManager.markIssueAsFixed(offerId, fieldName);
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
        }, 300)); // 300ms debounce time for responsive feedback
    }
    
    // Handle preview functionality
    async function handlePreview() {
        console.log('[DEBUG] handlePreview called');
        
        if (!fileInputEl || !fileInputEl.files || !fileInputEl.files[0]) {
            alert('Please select a file first');
            return;
        }
        
        try {
            console.log('[DEBUG] Reading file:', fileInputEl.files[0].name);
            
            // Show loading state
            document.body.classList.add('is-loading');
            
            const file = fileInputEl.files[0];
            const csvText = await readFileAsText(file);
            const data = parseCSV(csvText);
            
            await displayPreview(data, previewContentContainer);
            
            console.log('[DEBUG] Preview loaded successfully');
            
            // Initialize the floating scroll bar
            initFloatingScrollBar();
            
            // Reinitialize tab switching to ensure it works after floating scroll bar is set up
            setupTabs();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = `Preview loaded for ${file.name}`;
            document.body.appendChild(successMessage);
            setTimeout(() => {
                successMessage.classList.add('show');
                setTimeout(() => {
                    successMessage.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(successMessage);
                    }, 300);
                }, 2000);
            }, 100);
            
        } catch (error) {
            console.error('[DEBUG] Error in handlePreview:', error);
            alert(`Failed to preview file: ${error.message}. Please check the format.`);
        } finally {
            // Hide loading state
            document.body.classList.remove('is-loading');
        }
    }
    
    // Helper functions
    async function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
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
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (e) => reject(new Error(`File reading error: ${e.target.error}`));
            reader.readAsArrayBuffer(file);
        });
    }
    
    function parseCSV(csvText) {
        if (!csvText || !csvText.trim()) return [];
        
        const lines = csvText.split(/[\r\n]+/).filter(line => line.trim());
        if (lines.length < 1) throw new Error("CSV file appears empty or has no header row.");
        
        // Parse headers with proper handling of quoted values
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
        if (headers.length === 0) throw new Error("Could not parse headers from CSV.");
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Handle quoted values properly
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    if (inQuotes && line[j+1] === '"') {
                        currentVal += '"';
                        j++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal);
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            values.push(currentVal);
            
            // Handle row length mismatches
            if (values.length > headers.length) {
                console.warn(`Row ${i+1} has more values than headers. Truncating.`);
                values.length = headers.length;
            } else if (values.length < headers.length) {
                console.warn(`Row ${i+1} has fewer values than headers. Padding with empty strings.`);
                while (values.length < headers.length) values.push('');
            }
            
            const row = {};
            let hasValue = false;
            
            headers.forEach((header, index) => {
                if (header) {
                    const value = (values[index] || '').trim();
                    row[header] = value;
                    if (value) hasValue = true;
                }
            });
            
            if (hasValue) {
                data.push(row);
            }
        }
        
        console.log('[DEBUG] Parsed CSV data:', data.length, 'rows');
        return data;
    }
    
    function sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.normalize('NFKD')
            .replace(/[\u2022]/g, '•')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    function createEditableCell(content, type, rowIndex) {
        const cell = document.createElement('td');
        const field = document.createElement('div');
        field.className = `editable-field ${type}-field`;
        field.contentEditable = true;
        field.dataset.field = type;
        field.dataset.row = rowIndex;
        field.textContent = sanitizeText(content);

        const charCountDisplay = document.createElement('div');
        charCountDisplay.className = 'char-count';
        
        // Define correct min/max lengths based on type
        const isDescription = type === 'description';
        const minLength = isDescription ? 90 : 30; // Title min is 30
        const maxLength = isDescription ? 5000 : 150; // Title max is 150

        cell.appendChild(field);
        cell.appendChild(charCountDisplay);

        const updateDisplay = () => {
            const currentContent = field.textContent || '';
            const currentCount = currentContent.length;
            
            // Update character count display
            charCountDisplay.textContent = `${currentCount} / ${minLength}`;
            
            // Apply appropriate validation classes based on content length
            if (currentCount < minLength) {
                // Under minimum length - show error state
                field.classList.add('under-minimum');
                field.classList.remove('over-limit');
                charCountDisplay.style.color = '#dc3545'; // Red for error
                
                // Apply red background to invalid fields
                field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                field.style.borderColor = '#dc3545';
            } else if (currentCount > maxLength) {
                // Over maximum length - show error state
                field.classList.remove('under-minimum');
                field.classList.add('over-limit');
                charCountDisplay.style.color = '#dc3545'; // Red for error
                
                // Apply red background to invalid fields
                field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                field.style.borderColor = '#dc3545';
            } else {
                // Valid length - show success state
                field.classList.remove('under-minimum');
                field.classList.remove('over-limit');
                charCountDisplay.style.color = '#28a745'; // Green for success
                
                // Apply green background to valid fields
                field.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                field.style.borderColor = '#28a745';
            }
        };
        
        updateDisplay(); // Initial update
        
        // Force a recheck after a short delay to ensure styles are applied
        setTimeout(() => {
            updateDisplay();
        }, 100);
        
        // This listener is for updating the character count display and validation state
        field.addEventListener('input', window.debounce(updateDisplay, 300));
        
        return cell;
    }
    
    async function displayPreview(data, container) {
        if (!container) {
            console.error("[DEBUG] Preview container not found.");
            return;
        }
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="no-data-message">No data to display.</p>';
            return;
        }
        
        const headers = Object.keys(data[0] || {});
        if (headers.length === 0) {
            container.innerHTML = '<p class="no-data-message">Could not determine headers.</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'preview-table data-table';
        
        // Create table header
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headerRow.className = 'table-header';
        
        headers.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        
        // Create table body
        const tbody = table.createTBody();
        const offerIdToRowIndexMap = {}; // Map offerId to visual row index
        
        data.forEach((row, index) => {
            const tr = tbody.insertRow();
            tr.id = `row-${index + 1}`;
            tr.dataset.row = index + 1;
            
            const offerId = row['id']; // Assuming the unique ID column is 'id'
            if (offerId) {
                tr.dataset.offerId = offerId;
                offerIdToRowIndexMap[offerId] = index + 1; // Map offerId to visual row index
            }
            
            headers.forEach(key => {
                const content = row[key] || '';
                
                if (key === 'title' || key === 'description') {
                    const editableCell = createEditableCell(content, key, index + 1);
                    tr.appendChild(editableCell);
                } else {
                    const cell = tr.insertCell();
                    cell.textContent = content;
                    
                    // Add special styling for price column
                    if (key === 'price') {
                        cell.style.whiteSpace = 'nowrap';
                        cell.style.color = '#2E7D32';
                    }
                    
                    // Add special styling for condition column
                    if (key === 'condition') {
                        cell.style.whiteSpace = 'nowrap';
                        cell.style.color = '#1976D2';
                    }
                }
            });
        });
        
        container.innerHTML = '';
        container.appendChild(table);
        
        console.log(`[DEBUG] Displayed preview for ${data.length} products.`);
        
        // Validate all editable fields after the table is created
        setTimeout(() => {
            console.log('[DEBUG] Running post-display validation check on all editable fields');
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
    
    function initFloatingScrollBar() {
        const floatingScroll = document.querySelector('.floating-scroll');
        const dataContainer = document.querySelector('.data-container');
        const scrollThumb = document.querySelector('.scroll-thumb');
        
        if (!floatingScroll || !dataContainer || !scrollThumb) {
            console.warn('Floating scroll elements not found:', {
                floatingScroll,
                dataContainer,
                scrollThumb
            });
            
            // Try to find the elements with more specific selectors
            const specificDataContainer = document.getElementById('feed-tab');
            
            if (floatingScroll && specificDataContainer && scrollThumb) {
                console.log('Found elements with specific selectors, using these instead');
                initScrollWithElements(floatingScroll, specificDataContainer, scrollThumb);
                return;
            }
            
            return;
        }
        
        initScrollWithElements(floatingScroll, dataContainer, scrollThumb);
    }
    
    function initScrollWithElements(floatingScroll, dataContainer, scrollThumb) {
        // Show the floating scroll
        floatingScroll.style.display = 'block';
        
        // Calculate and update thumb width based on content
        const updateThumbWidth = () => {
            const containerWidth = dataContainer.clientWidth;
            const contentWidth = dataContainer.scrollWidth;
            const ratio = containerWidth / contentWidth;
            const thumbWidth = Math.max(40, Math.floor(ratio * containerWidth));
            scrollThumb.style.width = `${thumbWidth}px`;
            
            // Only show the scroll bar if there's content to scroll
            if (contentWidth <= containerWidth) {
                floatingScroll.style.display = 'none';
            } else {
                floatingScroll.style.display = 'block';
            }
        };
        
        // Update thumb position based on scroll position
        const updateThumbPosition = () => {
            const containerWidth = dataContainer.clientWidth;
            const contentWidth = dataContainer.scrollWidth;
            const scrollLeft = dataContainer.scrollLeft;
            const maxScroll = contentWidth - containerWidth;
            
            // Avoid division by zero
            if (maxScroll <= 0) return;
            
            const scrollRatio = scrollLeft / maxScroll;
            const trackWidth = floatingScroll.querySelector('.scroll-track').clientWidth;
            const thumbWidth = scrollThumb.clientWidth;
            const maxThumbPosition = trackWidth - thumbWidth;
            const thumbPosition = Math.floor(scrollRatio * maxThumbPosition);
            scrollThumb.style.left = `${thumbPosition}px`;
        };
        
        // Initialize
        updateThumbWidth();
        updateThumbPosition();
        
        // Add event listeners
        dataContainer.addEventListener('scroll', updateThumbPosition);
        window.addEventListener('resize', () => {
            updateThumbWidth();
            updateThumbPosition();
        });
        
        // Make the thumb draggable
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;
        
        scrollThumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseInt(scrollThumb.style.left || '0', 10);
            document.body.classList.add('no-select'); // Prevent text selection while dragging
            
            // Capture the initial mousedown as a mousemove event too
            // This ensures immediate response when clicking on the thumb
            onMouseMove(e);
            
            // Prevent default to avoid text selection
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                const deltaX = e.clientX - startX;
                const trackWidth = floatingScroll.querySelector('.scroll-track').clientWidth;
                const thumbWidth = scrollThumb.clientWidth;
                const maxThumbPosition = trackWidth - thumbWidth;
                
                let newLeft = Math.max(0, Math.min(startLeft + deltaX, maxThumbPosition));
                scrollThumb.style.left = `${newLeft}px`;
                
                // Update container scroll position
                const scrollRatio = newLeft / maxThumbPosition;
                const containerWidth = dataContainer.clientWidth;
                const contentWidth = dataContainer.scrollWidth;
                const maxScroll = contentWidth - containerWidth;
                dataContainer.scrollLeft = scrollRatio * maxScroll;
            });
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.body.classList.remove('no-select');
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Click on track to jump
        floatingScroll.querySelector('.scroll-track').addEventListener('click', (e) => {
            if (e.target === scrollThumb) return; // Ignore clicks on the thumb itself
            
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
                const trackRect = e.currentTarget.getBoundingClientRect();
                const clickPosition = e.clientX - trackRect.left;
                const trackWidth = e.currentTarget.clientWidth;
                const thumbWidth = scrollThumb.clientWidth;
                const maxThumbPosition = trackWidth - thumbWidth;
                
                // Calculate new thumb position (centered on click)
                let newLeft = Math.max(0, Math.min(clickPosition - (thumbWidth / 2), maxThumbPosition));
                
                // Add a smooth transition for the thumb
                scrollThumb.style.transition = 'left 0.2s ease-out';
                scrollThumb.style.left = `${newLeft}px`;
                
                // Update container scroll position with smooth behavior
                const scrollRatio = newLeft / maxThumbPosition;
                const containerWidth = dataContainer.clientWidth;
                const contentWidth = dataContainer.scrollWidth;
                const maxScroll = contentWidth - containerWidth;
                
                // Use smooth scrolling behavior
                dataContainer.style.scrollBehavior = 'smooth';
                dataContainer.scrollLeft = scrollRatio * maxScroll;
                
                // Reset transition after animation completes
                setTimeout(() => {
                    scrollThumb.style.transition = '';
                    dataContainer.style.scrollBehavior = '';
                }, 200);
            });
        });
        
        console.log('[DEBUG] Floating scroll bar initialized successfully');
    }
}); // End of DOMContentLoaded event listener