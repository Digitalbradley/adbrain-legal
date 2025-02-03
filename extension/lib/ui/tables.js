class TableManager {
    constructor() {
        this.previewContent = document.querySelector('.data-container');
        this.selectAllCheckbox = null;
    }

    initialize() {
        this.setupTableObserver();
        this.setupScrollSync();
    }

    setupScrollSync() {
        const container = document.querySelector('.data-container');
        const scrollContent = document.querySelector('.scroll-content');
        
        if (!container || !scrollContent) return;

        // Clear existing content
        scrollContent.innerHTML = '';

        // Create scroll track and thumb
        const scrollTrack = document.createElement('div');
        scrollTrack.className = 'scroll-track';
        const scrollThumb = document.createElement('div');
        scrollThumb.className = 'scroll-thumb';
        scrollTrack.appendChild(scrollThumb);
        scrollContent.appendChild(scrollTrack);

        // Update thumb size and position
        const updateThumb = () => {
            const containerWidth = container.clientWidth;
            const scrollWidth = container.scrollWidth;
            const thumbWidth = Math.max((containerWidth / scrollWidth) * 100, 10); // Minimum thumb width of 10%
            const scrollLeft = (container.scrollLeft / (scrollWidth - containerWidth)) * (100 - thumbWidth);
            
            scrollThumb.style.width = `${thumbWidth}%`;
            scrollThumb.style.transform = `translateX(${scrollLeft}%)`;
            
            // Show/hide scroll bar based on content width
            scrollContent.style.display = scrollWidth > containerWidth ? 'block' : 'none';
        };

        // Initial update
        setTimeout(updateThumb, 100); // Small delay to ensure content is loaded

        // Sync container scroll with thumb
        container.addEventListener('scroll', updateThumb);

        // Handle thumb drag
        let isDragging = false;
        let startX;
        let scrollLeft;

        scrollThumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            scrollThumb.style.cursor = 'grabbing';
            startX = e.pageX - scrollThumb.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const x = e.pageX - scrollContent.getBoundingClientRect().left;
            const walk = (x - startX) * 3; // Scroll speed multiplier
            container.scrollLeft = scrollLeft + walk;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            scrollThumb.style.cursor = 'grab';
        });

        // Handle window resize
        window.addEventListener('resize', updateThumb);

        // Store updateThumb function for external calls
        this.updateThumb = updateThumb;
    }

    setupTableObserver() {
        const observer = new MutationObserver((mutations) => {
            this.updateScrollWidth();
            // Update scroll thumb after content changes
            if (this.updateThumb) {
                setTimeout(this.updateThumb, 100);
            }
        });
        
        if (this.previewContent) {
            observer.observe(this.previewContent, { 
                childList: true, 
                subtree: true,
                characterData: true
            });
        }
    }

    updateScrollWidth() {
        const table = document.querySelector('.data-table');
        if (table) {
            const spacer = document.querySelector('.scroll-spacer');
            if (spacer) {
                spacer.style.width = `${table.offsetWidth}px`;
            }
        }
    }

    renderTable(headers, data) {
        let tableHtml = `<table class="data-table">
            <tr class="table-header">
                <th><input type="checkbox" id="selectAll"></th>
                <th>#</th>`;
        
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr>';

        // Only render data rows, not headers again
        data.forEach((row, index) => {
            tableHtml += this.renderTableRow(row, index + 1, headers);
        });

        tableHtml += '</table>';
        
        if (this.previewContent) {
            this.previewContent.innerHTML = tableHtml;
            this.setupSelectAllFunctionality();
            this.setupEditableFields();
            
            // Add data-field attributes to cells
            const table = this.previewContent.querySelector('.data-table');
            if (table) {
                const rows = table.querySelectorAll('tr:not(.table-header)');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    headers.forEach((header, index) => {
                        if (cells[index + 2]) { // +2 for checkbox and row number columns
                            cells[index + 2].setAttribute('data-field', header);
                        }
                    });
                });
            }
        }
    }

    renderTableRow(rowData, rowIndex, headers) {
        // Add back the row ID for clickable links
        let rowHtml = `<tr id="row-${rowIndex}">
            <td><input type="checkbox"></td>
            <td>${rowIndex}</td>`;
        
        headers.forEach(header => {
            const value = rowData[header] || '';
            
            if (header.toLowerCase() === 'title') {
                rowHtml += this.renderEditableCell(value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'), 'title', 70);
            }
            else if (header.toLowerCase() === 'description') {
                rowHtml += this.renderEditableCell(value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'), 'description', 200);
            }
            else {
                rowHtml += `<td data-field="${header}">${value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')}</td>`;
            }
        });
        
        return rowHtml + '</tr>';
    }

    renderEditableCell(value, fieldType, maxLength) {
        return `
            <td data-field="${fieldType}">
                <div class="editable-container">
                    <div class="editable-field ${fieldType}-field" 
                         contenteditable="true" 
                         data-max-length="${maxLength}">${value}</div>
                    <div class="char-count">
                        ${value.length}/${maxLength} characters
                    </div>
                </div>
            </td>`;
    }

    setupSelectAllFunctionality() {
        this.selectAllCheckbox = document.getElementById('selectAll');
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.data-table input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.selectAllCheckbox.checked;
                });
            });
        }
    }

    setupEditableFields() {
        const titleFields = document.querySelectorAll('.title-field');
        const descriptionFields = document.querySelectorAll('.description-field');

        titleFields.forEach(field => {
            field.addEventListener('input', () => this.updateCharCount(field, 70));
        });

        descriptionFields.forEach(field => {
            field.addEventListener('input', () => this.updateCharCount(field, 200));
        });
    }

    updateCharCount(element, maxLength) {
        const content = element.innerText || element.textContent;
        const charCount = content.length;
        const countDisplay = element.nextElementSibling;
        
        countDisplay.textContent = `${charCount}/${maxLength} characters`;
        
        if (charCount > maxLength) {
            countDisplay.classList.add('error');
            element.classList.add('over-limit');
            countDisplay.style.color = '#dc3545';
        } else {
            countDisplay.classList.remove('error');
            element.classList.remove('over-limit');
            countDisplay.style.color = '#666';
        }

        if (charCount > maxLength * 0.9 && charCount <= maxLength) {
            countDisplay.style.color = '#ffa500';
        }
    }

    scrollToTableRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            const yOffset = -100;
            const y = row.getBoundingClientRect().top + window.pageYOffset + yOffset;
            
            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
            
            // Add highlight animation
            row.classList.add('highlight-row');
            setTimeout(() => {
                row.classList.remove('highlight-row');
            }, 2000);
        }
    }
}

// Make it globally available
window.TableManager = TableManager;
