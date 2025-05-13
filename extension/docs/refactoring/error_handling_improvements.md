    # Error Handling Improvements for AdBrain Feed Manager

## Current Behavior

Based on testing with various feed types:

1. **Empty Feeds**: The extension loads the feed without error messages
2. **Partially Empty Feeds**: The extension loads the feed and shows empty fields with 0/30 or 0/90 character counts
3. **Malformed Feeds**: The extension attempts to display whatever data it can parse without showing any error messages
4. **No Console Errors**: No errors are logged to the console for any of these cases

## Proposed Improvements

### 1. Enhanced CSV Parsing Error Detection

The current `parseCSV` method in `feed_manager.js` has limited error detection and reporting. We should enhance it to:

- Detect and report specific parsing issues
- Provide clear error messages with row numbers
- Log detailed information to the console
- Show user-friendly error messages in the UI

### Implementation Plan

#### Step 1: Enhance the `parseCSV` method in `feed_manager.js`

```javascript
parseCSV(csvText) {
    console.log('[DEBUG] ==================== PARSING CSV ====================');
    console.log('[DEBUG] parseCSV called with text length:', csvText ? csvText.length : 0);
    
    // Track errors and warnings
    const errors = [];
    const warnings = [];
    
    if (!csvText || !csvText.trim()) {
        const error = "Empty feed: The CSV file appears to be empty or contains only whitespace.";
        console.error('[DEBUG] ' + error);
        errors.push({ type: 'empty_feed', message: error });
        throw new Error(error);
    }
    
    const lines = csvText.split(/[\r\n]+/).filter(line => line.trim());
    console.log('[DEBUG] CSV contains', lines.length, 'non-empty lines');
    
    if (lines.length < 1) {
        const error = "Empty feed: No rows found in the CSV file.";
        console.error('[DEBUG] ' + error);
        errors.push({ type: 'empty_feed', message: error });
        throw new Error(error);
    }
    
    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
    console.log('[DEBUG] CSV headers:', headers);
    
    if (headers.length === 0 || headers.every(h => !h)) {
        const error = "Invalid CSV format: Could not parse headers from CSV.";
        console.error('[DEBUG] ' + error);
        errors.push({ type: 'invalid_headers', message: error });
        throw new Error(error);
    }
    
    // Check for required headers
    const requiredHeaders = ['id', 'title', 'description', 'link', 'image_link'];
    const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
    
    if (missingHeaders.length > 0) {
        const error = `Missing required headers: ${missingHeaders.join(', ')}. These fields are required for feed validation.`;
        console.error('[DEBUG] ' + error);
        errors.push({ type: 'missing_headers', message: error, missingHeaders });
        warnings.push({ type: 'missing_headers_warning', message: error });
    }
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]; 
        if (!line.trim()) continue;
        
        // Parse values with improved error handling
        const values = [];
        let currentVal = '';
        let inQuotes = false;
        let unclosedQuote = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (inQuotes && line[j+1] === '"') {
                    currentVal += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                    if (!inQuotes) {
                        unclosedQuote = false;
                    } else {
                        unclosedQuote = true;
                    }
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal);
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        
        // Check for unclosed quotes at end of line
        if (unclosedQuote) {
            const warning = `Row ${i+1}: Unclosed quotation mark detected. This may cause parsing issues.`;
            console.warn('[DEBUG] ' + warning);
            warnings.push({ type: 'unclosed_quote', row: i+1, message: warning });
        }
        
        values.push(currentVal);
        
        // Check for inconsistent column count
        if (values.length !== headers.length) {
            const warning = `Row ${i+1}: Inconsistent number of columns. Expected ${headers.length}, found ${values.length}.`;
            console.warn('[DEBUG] ' + warning);
            
            if (values.length > headers.length) {
                warnings.push({ 
                    type: 'too_many_columns', 
                    row: i+1, 
                    message: warning,
                    expected: headers.length,
                    found: values.length
                });
                console.warn(`Row ${i+1} truncated.`);
                values.length = headers.length;
            } else {
                warnings.push({ 
                    type: 'too_few_columns', 
                    row: i+1, 
                    message: warning,
                    expected: headers.length,
                    found: values.length
                });
                console.warn(`Row ${i+1} padded.`);
                while (values.length < headers.length) values.push('');
            }
        }
        
        // Create row object
        const row = {};
        let hasValue = false;
        
        headers.forEach((header, index) => {
            if (header) {
                const value = (values[index] || '').trim();
                row[header] = value;
                if (value) hasValue = true;
            }
        });
        
        // Check for empty required fields
        const emptyRequiredFields = [];
        requiredHeaders.forEach(field => {
            if (headers.includes(field) && (!row[field] || row[field].trim() === '')) {
                emptyRequiredFields.push(field);
            }
        });
        
        if (emptyRequiredFields.length > 0) {
            const warning = `Row ${i+1}: Missing required values for fields: ${emptyRequiredFields.join(', ')}.`;
            console.warn('[DEBUG] ' + warning);
            warnings.push({ 
                type: 'empty_required_fields', 
                row: i+1, 
                fields: emptyRequiredFields,
                message: warning
            });
        }
        
        if (hasValue) data.push(row);
    }
    
    // Check if we have any data rows
    if (data.length === 0) {
        const error = "Empty feed: No valid data rows found in the CSV file.";
        console.warn("[DEBUG] " + error);
        errors.push({ type: 'no_data_rows', message: error });
        
        // Only throw if we have no data AND there are serious errors
        if (errors.length > 0) {
            throw new Error(error);
        }
    } else {
        console.log('[DEBUG] Successfully parsed CSV data with', data.length, 'rows');
        console.log('[DEBUG] First row sample:', data[0]);
    }
    
    // If we have warnings but no errors, we'll still return the data but store the warnings
    if (warnings.length > 0) {
        this.lastParseWarnings = warnings;
        
        // Log a summary of warnings
        console.warn(`[DEBUG] CSV parsed with ${warnings.length} warnings.`);
        
        // Show a warning to the user via the error manager if available
        if (this.managers && this.managers.errorManager) {
            const warningMessage = `Feed loaded with ${warnings.length} potential issues. Check console for details.`;
            this.managers.errorManager.showWarning(warningMessage);
        }
    }
    
    // If we have errors, throw an exception with details
    if (errors.length > 0) {
        const errorMessage = errors.map(e => e.message).join('\n');
        const error = new Error(errorMessage);
        error.details = { errors, warnings };
        throw error;
    }
    
    return data;
}
```

#### Step 2: Update the `handlePreview` method to handle structured errors

```javascript
async handlePreview() {
    console.log('[DEBUG] ==================== PREVIEW FEED BUTTON CLICKED ====================');
    // ... existing code ...
    
    try {
        // ... existing code ...
        
        const csvText = await this.readFileAsText(file);
        
        try {
            const data = this.parseCSV(csvText);
            await this.displayPreview(data);
            
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
                
                // Show the warning to the user
                errorManager.showWarning(warningMessage, 8000); // Show for longer duration
            }
            
            // ... rest of existing code ...
            
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
                
                errorManager.showError(errorMessage);
            } else {
                // Fall back to simple error message for unstructured errors
                errorManager.showError(`Failed to preview file: ${parseError.message}. Please check the format.`);
            }
            
            monitor.logError(parseError, 'parseCSV');
            monitor.logOperation('preview', 'failed', { reason: 'parse_error' });
            return;
        }
        
        // ... rest of existing code ...
        
    } catch (error) {
        // ... existing error handling ...
    }
}
```

#### Step 3: Add a `showWarning` method to the `ErrorManager` class

```javascript
// Add to lib/ui/errors.js
showWarning(message, duration = 5000) {
    const warningElement = document.createElement('div');
    warningElement.className = 'warning-message';
    warningElement.textContent = message;
    
    // Style differently from errors
    warningElement.style.backgroundColor = '#fff3cd';
    warningElement.style.color = '#856404';
    warningElement.style.borderColor = '#ffeeba';
    
    this.errorContainer.appendChild(warningElement);
    
    setTimeout(() => {
        warningElement.classList.add('fade-out');
        setTimeout(() => {
            if (warningElement.parentNode === this.errorContainer) {
                this.errorContainer.removeChild(warningElement);
            }
        }, 300);
    }, duration);
}
```

### Expected Results

With these improvements:

1. **Empty Feeds**: Clear error message explaining the feed is empty
2. **Malformed Feeds**: Detailed error messages identifying specific issues:
   - Missing required headers
   - Inconsistent column counts with row numbers
   - Unclosed quotation marks with row numbers
   - Empty required fields with row numbers
3. **Partially Valid Feeds**: Warnings about potential issues while still loading the feed
4. **Console Logs**: Detailed error and warning information in the console

### Testing Plan

1. Test with various malformed feeds:
   - CSV with missing headers
   - CSV with inconsistent columns
   - CSV with unclosed quotes
   - CSV with empty required fields
   - Completely empty CSV

2. Verify that appropriate error messages are displayed
3. Check console logs for detailed error information
4. Ensure warnings are shown for feeds with minor issues

### Future Enhancements

1. Add a "CSV Requirements" section to the help documentation
2. Implement a CSV validator that can be run before attempting to parse
3. Add a "Fix Issues" feature that can automatically correct common CSV problems
4. Provide more visual indicators in the UI for rows with issues

## Content-Type Validation

### Overview

In addition to structural validation, we need to implement content-type validation that checks if the data in each column matches the expected format. This is different from the character count validation that happens with "Validate Feed" - we're checking the type of content, not just its length.

### Expected Content Types by Column

Based on Google Merchant Center requirements, here's what each column should contain:

| Column | Expected Content | Validation Rule |
|--------|-----------------|-----------------|
| id | Alphanumeric identifier | Should contain only letters, numbers, underscores, and hyphens |
| title | Product name/description | Should NOT be a URL; Should NOT contain excessive punctuation or ALL CAPS |
| description | Detailed product description | Should NOT be a URL; Should contain meaningful text |
| link | Product page URL | Must be a valid URL (starting with http:// or https://) |
| image_link | Product image URL | Must be a valid URL (starting with http:// or https://) |
| price | Product price with currency | Should match pattern: number + optional decimal + space + currency code |
| availability | Availability status | Should be one of: "in stock", "out of stock", "preorder", "backorder" |
| condition | Product condition | Should be one of: "new", "used", "refurbished" |
| brand | Brand name | Should be text, not a URL or number |
| gtin | Global Trade Item Number | Should be a numeric string of 8, 12, 13, or 14 digits |
| mpn | Manufacturer Part Number | Should be alphanumeric |
| google_product_category | Google category | Should be a valid Google category ID or path |

### Implementation Approach

1. **Define Content Type Validators**:
   ```javascript
   const contentTypeValidators = {
       id: {
           validate: (value) => /^[A-Za-z0-9_-]+$/.test(value),
           message: 'should be alphanumeric (may include underscores and hyphens)'
       },
       title: {
           validate: (value) => !value.startsWith('http') && !value.includes('://'),
           message: 'should not be a URL'
       },
       description: {
           validate: (value) => !value.startsWith('http') && !value.includes('://'),
           message: 'should not be a URL'
       },
       link: {
           validate: (value) => value.startsWith('http') && value.includes('://'),
           message: 'should be a valid URL (starting with http:// or https://)'
       },
       image_link: {
           validate: (value) => value.startsWith('http') && value.includes('://'),
           message: 'should be a valid URL (starting with http:// or https://)'
       },
       price: {
           validate: (value) => /^[0-9]+(\.[0-9]+)?\s[A-Z]{3}$/.test(value),
           message: 'should be a number followed by a currency code (e.g., "100.00 USD")'
       },
       availability: {
           validate: (value) => ['in stock', 'out of stock', 'preorder', 'backorder'].includes(value.toLowerCase()),
           message: 'should be one of: "in stock", "out of stock", "preorder", "backorder"'
       },
       condition: {
           validate: (value) => ['new', 'used', 'refurbished'].includes(value.toLowerCase()),
           message: 'should be one of: "new", "used", "refurbished"'
       }
   };
   ```

2. **Add Content Validation to parseCSV Method**:
   ```javascript
   // After creating the row object and checking for empty required fields
   
   // Check for content type issues
   const contentTypeIssues = [];
   headers.forEach((header, index) => {
       if (header && contentTypeValidators[header]) {
           const value = row[header];
           if (value && !contentTypeValidators[header].validate(value)) {
               contentTypeIssues.push({
                   field: header,
                   value: value,
                   message: contentTypeValidators[header].message
               });
           }
       }
   });
   
   if (contentTypeIssues.length > 0) {
       const warning = `Row ${i+1}: Content type issues detected: ${contentTypeIssues.map(issue =>
           `${issue.field} ${issue.message}`).join(', ')}`;
       console.warn('[DEBUG] ' + warning);
       warnings.push({
           type: 'content_type_issues',
           row: i+1,
           issues: contentTypeIssues,
           message: warning
       });
   }
   ```

3. **Update Warning Display in handlePreview Method**:
   ```javascript
   // Add to the warning message creation in handlePreview
   
   if (warningsByType.content_type_issues) {
       warningMessage += `- Content type issues detected in ${warningsByType.content_type_issues.length} rows\n`;
       
       // If there are only a few issues, show details
       if (warningsByType.content_type_issues.length <= 3) {
           warningsByType.content_type_issues.forEach(warning => {
               warningMessage += `  - Row ${warning.row}: ${warning.issues.map(issue =>
                   `${issue.field} ${issue.message}`).join(', ')}\n`;
           });
       }
   }
   ```

### Benefits of This Approach

1. **Separation of Concerns**: This validation is separate from the "Validate Feed" functionality, which focuses on character counts and other GMC requirements.

2. **Early Detection**: Issues are detected during CSV parsing, before the feed is displayed or validated.

3. **Non-Blocking**: Content type issues are treated as warnings, not errors, so the feed can still be loaded and previewed.

4. **Extensible**: New validators can be added easily for additional columns or more sophisticated validation rules.

### Testing Approach

1. Test with feeds containing various content type issues:
   - URLs in title or description fields
   - Non-URL values in link or image_link fields
   - Invalid price formats
   - Invalid availability or condition values

2. Verify that appropriate warnings are displayed
3. Check that the warnings don't interfere with the "Validate Feed" functionality
4. Ensure the feed still loads and displays correctly despite the warnings