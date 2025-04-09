// Import OpenAI key
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
import { OPENAI_API_KEY } from './config.js';
function scrollToTableRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        // Scroll to row with offset for the sticky header
        const yOffset = -100; // Adjust this value based on your header height
        const y = row.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
        
        // Highlight effect
        row.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            row.style.backgroundColor = '';
        }, 2000);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // Get modal elements after DOM is loaded
    const infoButton = document.getElementById('infoButton');
    const infoModal = document.getElementById('infoModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const proButton = document.querySelector('.premium-badge');
    const proModal = document.getElementById('proModal');
    const exportButton = document.getElementById('exportButton');
    
    // Get UI elements
    const fileInput = document.getElementById('csvFile');
    const previewButton = document.getElementById('previewButton');
    const previewContent = document.getElementById('previewContent');

    // Only add event listeners if elements exist
    if (infoButton && infoModal && modalBackdrop && closeModalBtn) {
        function closeModal() {
            infoModal.style.display = 'none';
            modalBackdrop.style.display = 'none';
        }

        closeModalBtn.addEventListener('click', closeModal);

        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            infoModal.style.display = 'block';
            modalBackdrop.style.display = 'block';
        });

        modalBackdrop.addEventListener('click', closeModal);

        infoModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Pro modal functionality - only add if elements exist
    if (proButton && proModal) {
        proButton.addEventListener('click', (e) => {
            e.stopPropagation();
            proModal.style.display = 'block';
            modalBackdrop.style.display = 'block';
        });

        const closeProModalBtn = document.getElementById('closeProModalBtn');
        if (closeProModalBtn) {
            closeProModalBtn.addEventListener('click', () => {
                proModal.style.display = 'none';
                modalBackdrop.style.display = 'none';
            });
        }
      }
   
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            previewButton.disabled = false;
        }
    });

    // Handle preview button click
    previewButton.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a CSV file first.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvContent = e.target.result;
                const lines = csvContent.replace(/\r/g, '').split('\n');
                const headers = lines[0]
                    .split(',')
                    .map(header => header.trim().toLowerCase());

                console.log('Number of columns:', headers.length);
                console.log('Column names:', headers);
                console.log('First data row:', lines[1]);

                // Find important column indexes
                const categoryIndex = headers.indexOf('google_product_category');
                const titleIndex = headers.indexOf('title');
                const descriptionIndex = headers.indexOf('description');

                // Track categories and missing information
                let categories = new Set();
                let missingInfo = {
                    titles: 0,
                    descriptions: 0,
                    categories: 0
                };

                // Analyze the data
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    if (!values || values.length < headers.length) continue;

                    if (values[categoryIndex]) {
                        const mainCategory = values[categoryIndex].split('>')[0].trim();
                        categories.add(mainCategory);
                    } else {
                        missingInfo.categories++;
                    }

                    if (!values[titleIndex]?.trim()) missingInfo.titles++;
                    if (!values[descriptionIndex]?.trim()) missingInfo.descriptions++;
                }

                // Alert user if critical information is missing
                if (missingInfo.categories > 0 || missingInfo.titles > 0) {
                    const alert = `Feed Analysis:
    - Missing categories: ${missingInfo.categories} products
    - Missing titles: ${missingInfo.titles} products
    - Missing descriptions: ${missingInfo.descriptions} products

    Would you like to continue?`;
                    
                    if (!confirm(alert)) {
                        return;
                    }
                }

                // Create table HTML
                let tableHtml = `<table class="data-table">
                    <tr class="table-header">
                        <th><input type="checkbox" id="selectAll"></th>
                        <th>#</th>`;
                
                headers.forEach(header => {
                    tableHtml += `<th>${header}</th>`;
                });
                tableHtml += '</tr>';

                // Add data rows
                for (let i = 1; i < lines.length && i <= 100; i++) {
                    const line = lines[i].trim();
                    if (!line || line.toLowerCase().startsWith('id')) continue;
                    
                    const fields = [];
                    let inQuotes = false;
                    let currentField = '';
                    
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            fields.push(currentField.trim());
                            currentField = '';
                        } else {
                            currentField += char;
                        }
                    }
                    fields.push(currentField.trim());
                    
                    tableHtml += `<tr id="row-${i}">
    <td><input type="checkbox"></td>
    <td>${i}</td>`;
                    
                    headers.forEach((header, index) => {
                        let value = fields[index] ? fields[index].replace(/"/g, '').trim() : '';
                        
                        if (header.toLowerCase() === 'title') {
                            tableHtml += `
                            <td>
                                <div class="editable-container">
                                    <div class="editable-field title-field" 
                                         contenteditable="true" 
                                         data-max-length="70">${value}</div>
                                    <div class="char-count">
                                        ${value.length}/70 characters
                                    </div>
                                </div>
                            </td>`;
                        }
                        else if (header.toLowerCase() === 'description') {
                            tableHtml += `
                            <td>
                                <div class="editable-container">
                                    <div class="editable-field description-field" 
                                         contenteditable="true" 
                                         data-max-length="200">${value}</div>
                                    <div class="char-count">
                                        ${value.length}/200 characters
                                    </div>
                                </div>
                            </td>`;
                        }
                        else {
                            tableHtml += `<td>${value}</td>`;
                        }
                    });
                    
                    tableHtml += '</tr>';
                }
                tableHtml += '</table>';

                previewContent.innerHTML = tableHtml;

// Add event listeners for character counting
const titleFields = document.querySelectorAll('.title-field');
const descriptionFields = document.querySelectorAll('.description-field');

// Create debounced analysis function
const debouncedAnalysis = debounce(() => analyzeFeed(), 1000);

titleFields.forEach(field => {
    field.addEventListener('input', function() {
        updateCharCount(this, 70);
        debouncedAnalysis();
    });
});

descriptionFields.forEach(field => {
    field.addEventListener('input', function() {
        updateCharCount(this, 200);
        debouncedAnalysis();
    });
});

// Add Select All checkbox functionality
const selectAllCheckbox = document.getElementById('selectAll');
selectAllCheckbox.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.data-table input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
});

            } catch (error) {
                console.error('Error processing CSV:', error);
                alert('Error processing CSV file');
            }
        };
        
        reader.readAsText(file);
    }); 

// Synchronize top and bottom scrollbars
const floatingScroll = document.querySelector('.scroll-content');
const dataContainer = document.querySelector('.data-container');

// Export functionality
    exportButton.addEventListener('click', function() {
        const table = document.querySelector('.data-table');
        if (!table) {
            alert('Please load and preview a feed first before exporting.');
            return;
        }

        try {
            // Get headers
            const headers = [];
            table.querySelectorAll('tr:first-child th').forEach((th, index) => {
                // Skip the checkbox and row number columns
                if (index > 1) {
                    headers.push(th.textContent.trim());
                }
            });

            // Get data rows
            const rows = [];
            table.querySelectorAll('tr:not(:first-child)').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach((td, index) => {
                    // Skip the checkbox and row number columns
                    if (index > 1) {
                        // Handle editable fields
                        const editableField = td.querySelector('.editable-field');
                        if (editableField) {
                            row.push(editableField.textContent.trim());
                        } else {
                            row.push(td.textContent.trim());
                        }
                    }
                });
                if (row.length > 0) {
                    rows.push(row);
                }
            });

            // Create CSV content
            let csvContent = headers.join(',') + '\n';
            rows.forEach(row => {
                // Properly escape fields that contain commas
                const escapedRow = row.map(field => {
                    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                        return `"${field.replace(/"/g, '""')}"`;
                    }
                    return field;
                });
                csvContent += escapedRow.join(',') + '\n';
            });

            // Create and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'updated_feed.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            alert('Feed exported successfully!');
            
        } catch (error) {
            console.error('Error exporting feed:', error);
            alert('Error exporting feed. Please try again.');
        }
    });

// Add dropdown functionality
const mainDropdown = document.getElementById('mainDropdown');
mainDropdown.addEventListener('change', function(e) {
    const selectedValue = e.target.value;
    
    switch(selectedValue) {
        case 'analyze-feed':
            analyzeFeed();
            break;
        case 'validate-feed':
            // Future implementation
            alert('Coming soon in PRO version!');
            break;
        case 'check-errors':
            // Future implementation
            alert('Coming soon in PRO version!');
            break;
        case 'view-summary':
            // Future implementation
            alert('Coming soon in PRO version!');
            break;
        case 'pro':
            // Show upgrade modal
            alert('Upgrade features coming soon!');
            break;
    }
});

// Feed Health Analysis Function
function analyzeFeed() {
    const table = document.querySelector('.data-table');
    if (!table) {
        alert('Please load and preview a feed first before analyzing.');
        return;
    }

    try {
        // Get headers from the table
        const headers = Array.from(table.querySelectorAll('tr:first-child th'))
            .map(th => th.textContent.trim().toLowerCase());

        // Get all rows except header
        const rows = Array.from(table.querySelectorAll('tr:not(.table-header)'));
        const totalProducts = rows.length;
        
        // Initialize analysis object
        const analysis = {
            totalProducts,
            titleIssues: 0,
            descriptionIssues: 0,
            missingImages: 0,
            invalidPrices: 0,
            categories: new Set(),
            titleLengths: [],
            descriptionLengths: [],
            duplicateTitles: new Map(),
            duplicateDescriptions: new Map(),
            allCapsCount: 0,
            titleTooShort: 0,
            titleTooLong: 0,
            descTooShort: 0,
            descTooLong: 0
        };

        // Analyze each row
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');

// Find column indexes from headers
console.log("All headers:", headers.map((header, index) => `${index}: ${header}`));
const titleIndex = headers.indexOf('title');
const descriptionIndex = headers.indexOf('description');
const imageUrlIndex = headers.indexOf('image_link');
const priceIndex = headers.indexOf('price');
const categoryIndex = headers.indexOf('google_product_category');
console.log("Found indexes:", {
    titleIndex,
    descriptionIndex,
    imageUrlIndex,
    priceIndex,
    categoryIndex
});

// Get fields using the found indexes (NO +2 offset since headers already include the first two columns)
const titleField = cells[titleIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
const descriptionField = cells[descriptionIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
const imageUrl = cells[imageUrlIndex]?.textContent.trim() || '';
const price = cells[priceIndex]?.textContent.trim() || '';
console.log("Price value being checked:", price);
const category = cells[categoryIndex]?.textContent.trim() || '';           

// Track duplicates
            analysis.duplicateTitles.set(titleField, (analysis.duplicateTitles.get(titleField) || 0) + 1);
            analysis.duplicateDescriptions.set(descriptionField, (analysis.duplicateDescriptions.get(descriptionField) || 0) + 1);

            // Check title requirements
            if (titleField.length < 20) {
                analysis.titleTooShort++;
                analysis.titleIssues++;
            }
            if (titleField.length > 70) {
                analysis.titleTooLong++;
                analysis.titleIssues++;
            }
            if (titleField === titleField.toUpperCase() && titleField.length > 0) {
                analysis.allCapsCount++;
                analysis.titleIssues++;
            }
            analysis.titleLengths.push(titleField.length);

// Check description requirements
if (descriptionField) {
    let hasIssue = false;
    const descLength = descriptionField.length;
    
    // Modified length check - only consider it an issue if it's too short
    if (descLength < 70) {  // Changed from 100 since most descriptions are naturally between 70-200
        hasIssue = true;
        analysis.descTooShort++;
    }
    // Still check for too long but raised limit slightly
    if (descLength > 250) {  // Changed from 200 to give more flexibility
        hasIssue = true;
        analysis.descTooLong++;
    }
    
    if (hasIssue) {
        analysis.descriptionIssues++;
    }
    
    analysis.descriptionLengths.push(descLength);
}

            // Check image URLs
            if (!imageUrl.startsWith('https://')) {
                analysis.missingImages++;
            }

// Check prices - matches format like "449.56 USD"
if (price) {
    // First, log what we're actually getting
    console.log('Raw price value:', price);
    
    // Split the price into number and currency
    const parts = price.trim().split(' ');
    if (parts.length === 2) {
        const numericPart = parseFloat(parts[0]);
        const currencyPart = parts[1];
        
        // Only mark as invalid if either:
        // - The number isn't valid
        // - The currency isn't USD
        if (isNaN(numericPart) || currencyPart !== 'USD') {
            analysis.invalidPrices++;
        }
    } else {
        analysis.invalidPrices++;
    }
}

// Track unique categories only
if (category) {
    const categories = category.split('>').map(cat => cat.trim());
    categories.forEach(cat => {
        if (cat) {
            console.log("Adding category:", cat);
            analysis.categories.add(cat);
        }
    });
}
});

        // Count real duplicates (more than one occurrence)
        let duplicateTitleCount = 0;
        let duplicateDescCount = 0;
        analysis.duplicateTitles.forEach((count) => {
            if (count > 1) duplicateTitleCount++;
        });
analysis.duplicateDescriptions.forEach((count) => {
    if (count > 1) duplicateDescCount++;
});

// Create and show analysis report
        const analysisHtml = `
    <div class="analysis-report" style="
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
    <h3 style="color: #2B3A4D; margin: 0;">Feed Health Analysis</h3>
    <button class="close-analysis" style="background: none; border: none; color: #666; font-size: 20px; cursor: pointer; padding: 5px;">×</button>
</div>
        
        <!-- Feed Health Progress Bar -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px;">Overall Feed Health</h4>
            <div style="background: #f0f0f0; height: 24px; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #4CAF50, #8BC34A); 
                           width: ${Math.round((1 - (analysis.titleIssues + analysis.descriptionIssues)/(totalProducts * 2)) * 100)}%; 
                           height: 100%; 
                           transition: width 0.5s ease;">
                </div>
            </div>
            <div style="text-align: right; font-size: 14px; color: #666;">
                ${Math.round((1 - (analysis.titleIssues + analysis.descriptionIssues)/(totalProducts * 2)) * 100)}% Healthy
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="metric-card" style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                <h4>Overall Stats</h4>
                <p>Total Products: ${analysis.totalProducts}</p>
                <p>Categories: ${analysis.categories.size}</p>
            </div>
            <div class="metric-card" style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                <h4>Content Health</h4>
                <p>Title Issues: ${analysis.titleIssues} (${Math.round(analysis.titleIssues/totalProducts*100)}%)</p>
                <p>Description Issues: ${analysis.descriptionIssues} (${Math.round(analysis.descriptionIssues/totalProducts*100)}%)</p>
            </div>
            <div class="metric-card" style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                <h4>Technical Issues</h4>
                <p>Missing/Invalid Images: ${analysis.missingImages}</p>
                <p>Invalid Prices: ${analysis.invalidPrices}</p>
            </div>
        </div>

        ${analysis.titleIssues + analysis.descriptionIssues > 0 ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                <h4 style="color: #2B3A4D; margin-bottom: 10px;">Validation Issues</h4>
                ${rows.map((row, index) => {
                    const issues = [];
                    const titleField = row.querySelector('.title-field')?.textContent.trim() || '';
                    const descriptionField = row.querySelector('.description-field')?.textContent.trim() || '';
                    
                    if (titleField.length < 20 || titleField.length > 70) {
                        issues.push(`Title length (${titleField.length}) must be between 20-70 characters`);
                    }
                    if (descriptionField.length < 70 || descriptionField.length > 250) {
                        issues.push(`Description length (${descriptionField.length}) must be between 70-250 characters`);
                    }
                    
return issues.length > 0 ? `
    <div style="margin-bottom: 8px;">
        <strong style="cursor: pointer; color: #1976D2;" class="row-link" data-row-id="row-${index + 1}">Row ${index + 1}</strong>
        ${issues.map(issue => `
            <div style="margin-left: 15px; color: #dc3545; font-size: 13px; cursor: pointer;" class="issue-link" data-row-id="row-${index + 1}">• ${issue}</div>
        `).join('')}
    </div>

                    ` : '';
                }).join('')}
            </div>
        ` : ''}
    </div>
`

        // Remove any existing analysis report
        const existingReport = document.querySelector('.analysis-report');
        if (existingReport) {
            existingReport.remove();
        }

// Insert the analysis report before the data table
const dataContainer = document.querySelector('.data-container');
const analysisElement = document.createElement('div');
analysisElement.innerHTML = analysisHtml;
dataContainer.insertBefore(analysisElement, dataContainer.firstChild);

// Add event listeners for row links
function setupRowLinks() {
    document.querySelectorAll('.row-link, .issue-link').forEach(link => {
        link.addEventListener('click', function() {
            const rowId = this.getAttribute('data-row-id');
            scrollToTableRow(rowId);
        });
    });

    const closeButton = document.querySelector('.close-analysis');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const analysisReport = this.closest('.analysis-report');
            if (analysisReport) {
                analysisReport.remove();
            }
        });
    }
}

// Call the setup function
setupRowLinks();
    } catch (error) {
        console.error('Error analyzing feed:', error);
        alert('Error analyzing feed. Please try again.');
    }
}

   function updateScrollWidth() {
        const table = document.querySelector('.data-table');
        if (table) {
            const spacer = document.querySelector('.scroll-spacer');
            spacer.style.width = `${table.offsetWidth}px`;
        }
    }

    if (floatingScroll && dataContainer) {
        floatingScroll.addEventListener('scroll', () => {
            dataContainer.scrollLeft = floatingScroll.scrollLeft;
        });

        dataContainer.addEventListener('scroll', () => {
            floatingScroll.scrollLeft = dataContainer.scrollLeft;
        });
    }

    // Update scroll width when table content changes
    const observer = new MutationObserver(updateScrollWidth);
    observer.observe(document.querySelector('#previewContent'), { 
        childList: true, 
        subtree: true 
    });

}); // end of DOMContentLoaded

// Character counter function
window.updateCharCount = function(element, maxLength) {
    const content = element.innerText || element.textContent;
    const charCount = content.length;
    const countDisplay = element.nextElementSibling;
    
    countDisplay.textContent = `${charCount}/${maxLength} characters`;
    
    if (charCount > maxLength) {
        countDisplay.classList.add('error');
        element.classList.add('over-limit');
        countDisplay.style.color = '#dc3545'; // Red color for over limit
    } else {
        countDisplay.classList.remove('error');
        element.classList.remove('over-limit');
        countDisplay.style.color = '#666'; // Normal color
    }

    // Optional: Highlight the counter when close to limit (e.g., 90% of max)
    if (charCount > maxLength * 0.9 && charCount <= maxLength) {
        countDisplay.style.color = '#ffa500'; // Orange color for warning
    }
};