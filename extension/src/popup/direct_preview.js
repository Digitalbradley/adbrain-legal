// Direct event listener for Preview Feed button
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DIRECT] Adding direct event listener to Preview Feed button');
    const previewButton = document.getElementById('previewFeed');
    const fileInput = document.getElementById('fileInput');
    const previewContent = document.getElementById('previewContent');
    
    if (previewButton) {
        console.log('[DIRECT] Found Preview Feed button, adding click listener');
        previewButton.addEventListener('click', function() {
            console.log('[DIRECT] Preview Feed button clicked');
            
            // Check if file is selected
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                alert('Please select a file first');
                return;
            }
            
            console.log('[DIRECT] Reading file:', fileInput.files[0].name);
            
            // Show loading state
            document.body.classList.add('is-loading');
            
            // Read the file
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvContent = e.target.result;
                console.log('[DIRECT] File read successfully, length:', csvContent.length);
                
                // Simple CSV parsing
                const lines = csvContent.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
                
                // Create table
                let tableHtml = '<table class="preview-table data-table"><thead><tr class="table-header">';
                headers.forEach(header => {
                    tableHtml += `<th>${header}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
                
                // Add rows (limit to 100)
                const rowCount = Math.min(lines.length - 1, 100);
                for (let i = 1; i <= rowCount; i++) {
                    if (!lines[i] || !lines[i].trim()) continue;
                    
                    tableHtml += `<tr id="row-${i}" data-row="${i}">`;
                    
                    // Parse CSV line properly
                    const values = [];
                    let currentVal = '';
                    let inQuotes = false;
                    const line = lines[i];
                    
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
                    
                    // Ensure values array has same length as headers
                    if (values.length > headers.length) {
                        values.length = headers.length;
                    } else {
                        while (values.length < headers.length) values.push('');
                    }
                    
                    // Add cells with appropriate styling
                    headers.forEach((header, index) => {
                        const value = values[index] || '';
                        
                        if (header === 'title' || header === 'description') {
                            // Define validation rules based on field type
                            const isDescription = header === 'description';
                            const minLength = isDescription ? 90 : 30; // Title min is 30
                            const currentLength = value.length;
                            
                            // Create editable cell for title and description with character count
                            tableHtml += `<td class="${header}-cell">
                                <div class="editable-field ${header}-field" contenteditable="true" data-field="${header}" data-row="${i}">${value}</div>
                                <div class="char-count">${currentLength} / ${minLength}</div>
                            </td>`;
                        } else if (header === 'price') {
                            // Special styling for price
                            tableHtml += `<td style="white-space: nowrap; color: #2E7D32;">${value}</td>`;
                        } else if (header === 'condition') {
                            // Special styling for condition
                            tableHtml += `<td style="white-space: nowrap; color: #1976D2;">${value}</td>`;
                        } else {
                            // Regular cell
                            tableHtml += `<td>${value}</td>`;
                        }
                    });
                    
                    tableHtml += '</tr>';
                }
                
                tableHtml += '</tbody></table>';
                
                // Display the table
                if (previewContent) {
                    previewContent.innerHTML = tableHtml;
                    console.log('[DIRECT] Preview content updated with table');
                    
                    // Initialize the floating scroll bar
                    initFloatingScrollBar();
                    
                    // Add character count to editable fields
                    updateCharacterCounts();
                }
                
                // Hide loading state
                document.body.classList.remove('is-loading');
            };
            
            reader.onerror = function(e) {
                console.error('[DIRECT] Error reading file:', e);
                alert('Error reading file');
                document.body.classList.remove('is-loading');
            };
            
            reader.readAsText(fileInput.files[0]);
        });
    } else {
        console.error('[DIRECT] Preview Feed button not found');
    }
});

// Function to initialize the floating scroll bar
function initFloatingScrollBar() {
    console.log('[DIRECT] Initializing floating scroll bar');
    
    // Get references to the elements
    const dataContainer = document.querySelector('.data-container');
    const floatingScroll = document.querySelector('.floating-scroll');
    const scrollTrack = document.querySelector('.scroll-track');
    const scrollThumb = document.querySelector('.scroll-thumb');
    
    if (!dataContainer || !floatingScroll || !scrollTrack || !scrollThumb) {
        console.error('[DIRECT] Required elements for floating scroll bar not found');
        return;
    }
    
    // Show the floating scroll bar
    floatingScroll.style.display = 'block';
    
    // Calculate and set initial thumb width based on table width vs container width
    const table = dataContainer.querySelector('.preview-table');
    if (!table) {
        console.error('[DIRECT] Preview table not found');
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

// Function to update character counts for editable fields
function updateCharacterCounts() {
    console.log('[DIRECT] Updating character counts for editable fields');
    
    const editableFields = document.querySelectorAll('.editable-field');
    editableFields.forEach(field => {
        const fieldType = field.dataset.field;
        if (fieldType === 'title' || fieldType === 'description') {
            const content = field.textContent || '';
            const currentLength = content.length;
            
            // Define validation rules based on field type
            const isDescription = fieldType === 'description';
            const minLength = isDescription ? 90 : 30; // Title min is 30
            const maxLength = isDescription ? 5000 : 150; // Title max is 150
            
            // Get the character count display element
            const charCountDisplay = field.nextElementSibling;
            if (charCountDisplay && charCountDisplay.classList.contains('char-count')) {
                charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                
                // Apply appropriate styling based on content length
                if (currentLength < minLength) {
                    field.classList.add('under-minimum');
                    field.classList.remove('over-limit');
                    charCountDisplay.style.color = '#dc3545'; // Red for error
                    
                    // Apply red background to invalid fields
                    field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    field.style.borderColor = '#dc3545';
                } else if (currentLength > maxLength) {
                    field.classList.remove('under-minimum');
                    field.classList.add('over-limit');
                    charCountDisplay.style.color = '#dc3545'; // Red for error
                    
                    // Apply red background to invalid fields
                    field.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    field.style.borderColor = '#dc3545';
                } else {
                    field.classList.remove('under-minimum');
                    field.classList.remove('over-limit');
                    charCountDisplay.style.color = '#28a745'; // Green for success
                    
                    // Apply green background to valid fields
                    field.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                    field.style.borderColor = '#28a745';
                }
            }
            
            // Add input event listener to update character count on edit
            field.addEventListener('input', function() {
                const content = this.textContent || '';
                const currentLength = content.length;
                const fieldType = this.dataset.field;
                const rowIndex = parseInt(this.dataset.row);
                
                if (charCountDisplay) {
                    charCountDisplay.textContent = `${currentLength} / ${minLength}`;
                    
                    // Check if this edit fixes a validation issue
                    const isValid = (fieldType === 'title' && currentLength >= 30) ||
                                   (fieldType === 'description' && currentLength >= 90);
                    
                    // If the field is now valid, remove the highlighting from the row
                    if (isValid) {
                        // Find the row
                        const row = this.closest('tr');
                        if (row) {
                            // Check if all fields in this row are valid
                            const allFieldsValid = checkAllFieldsValid(row);
                            if (allFieldsValid) {
                                // Remove highlighting
                                row.classList.remove('highlighted-row');
                                row.classList.remove('row-highlight');
                            }
                        }
                        
                        // Update any validation panels
                        updateValidationPanels(rowIndex, fieldType);
                    }
                    
                    if (currentLength < minLength) {
                        this.classList.add('under-minimum');
                        this.classList.remove('over-limit');
                        charCountDisplay.style.color = '#dc3545'; // Red for error
                        this.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        this.style.borderColor = '#dc3545';
                    } else if (currentLength > maxLength) {
                        this.classList.remove('under-minimum');
                        this.classList.add('over-limit');
                        charCountDisplay.style.color = '#dc3545'; // Red for error
                        this.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        this.style.borderColor = '#dc3545';
                    } else {
                        this.classList.remove('under-minimum');
                        this.classList.remove('over-limit');
                        charCountDisplay.style.color = '#28a745'; // Green for success
                        this.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                        this.style.borderColor = '#28a745';
                    }
                }
            });
        }
        
        /**
         * Checks if all editable fields in a row are valid
         * @param {HTMLElement} row The row element to check
         * @returns {boolean} True if all fields are valid, false otherwise
         */
        function checkAllFieldsValid(row) {
            if (!row) return false;
            
            const titleField = row.querySelector('.title-field');
            const descriptionField = row.querySelector('.description-field');
            
            let titleValid = true;
            let descriptionValid = true;
            
            if (titleField) {
                const titleContent = titleField.textContent || '';
                titleValid = titleContent.length >= 30;
            }
            
            if (descriptionField) {
                const descriptionContent = descriptionField.textContent || '';
                descriptionValid = descriptionContent.length >= 90;
            }
            
            return titleValid && descriptionValid;
        }
        
        /**
         * Updates validation panels when a field is edited
         * @param {number} rowIndex The row index
         * @param {string} fieldType The field type (title, description, etc.)
         */
        function updateValidationPanels(rowIndex, fieldType) {
            // Find any open validation panels
            const panels = document.querySelectorAll('.floating-validation-panel');
            
            panels.forEach(panel => {
                // Find issue items for this row and field
                const issueItems = panel.querySelectorAll(`.issue-item[data-row="${rowIndex}"][data-field="${fieldType}"]`);
                
                // Remove the issue items
                issueItems.forEach(item => {
                    const issueGroup = item.closest('div[style*="margin-bottom: 15px"]');
                    item.remove();
                    
                    // If this was the last issue in the group, remove the group
                    if (issueGroup && issueGroup.querySelectorAll('.issue-item').length === 0) {
                        issueGroup.remove();
                    }
                });
                
                // Update the issue count
                const remainingIssues = panel.querySelectorAll('.issue-item').length;
                const issueCountElement = panel.querySelector('span[style*="color: red"]');
                if (issueCountElement) {
                    issueCountElement.textContent = remainingIssues;
                    issueCountElement.style.color = remainingIssues > 0 ? 'red' : 'green';
                }
                
                // If no issues remain, update the panel content
                if (remainingIssues === 0) {
                    const issuesContainer = panel.querySelector('.validation-panel-content > div:last-child');
                    if (issuesContainer) {
                        issuesContainer.innerHTML = '<p style="color: green;">No issues found in the feed data!</p>';
                    }
                }
            });
        }
    });
}