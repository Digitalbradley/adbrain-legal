/**
 * Feed Format Validator
 * 
 * Validates CSV feed format before GMC validation, detecting common issues like:
 * - Missing required columns
 * - Malformed CSV structure
 * - Empty required fields
 * - Content type issues
 * 
 * This validator integrates with existing validation modules to provide early feedback
 * on feed issues before sending to GMC.
 */
class FeedFormatValidator {
    /**
     * Create a new FeedFormatValidator
     * @param {ContentTypeValidator} contentTypeValidator - Optional ContentTypeValidator instance
     * @param {CSVParser} csvParser - Optional CSVParser instance
     */
    constructor(contentTypeValidator, csvParser) {
        this.errors = [];
        this.contentTypeValidator = contentTypeValidator || (window.ContentTypeValidator ? new window.ContentTypeValidator() : null);
        this.csvParser = csvParser || (window.CSVParser ? new window.CSVParser() : null);
        
        // Required columns for a valid feed
        this.requiredColumns = ['id', 'title', 'description', 'link', 'image_link', 'price'];
        
        // Minimum character requirements
        this.minLengths = {
            title: 30,
            description: 90
        };
        
        // Maximum character limits
        this.maxLengths = {
            title: 150,
            description: 5000
        };
        
        console.log('[FeedFormatValidator] Initialized with:', {
            contentTypeValidator: !!this.contentTypeValidator,
            csvParser: !!this.csvParser
        });
    }
    
    /**
     * Validate a CSV file
     * @param {File} file - The CSV file to validate
     * @returns {Promise<object>} - Validation results with isValid flag and issues array
     */
    async validateFeed(file) {
        this.errors = [];
        
        try {
            console.log('[FeedFormatValidator] Starting validation of file:', file?.name);
            console.log('[FeedFormatValidator] File type:', file?.type);
            console.log('[FeedFormatValidator] File size:', file?.size, 'bytes');
            
            // Check if file exists
            if (!file) {
                console.error('[FeedFormatValidator] No file provided for validation');
                this.addError('no_file', 'No file provided for validation', 'error');
                return this.getResults();
            }
            
            // Check file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                console.error('[FeedFormatValidator] Invalid file type:', file.type);
                this.addError('invalid_file_type', 'File must be a CSV file', 'error');
                return this.getResults();
            }
            
            // Read the file content
            console.log('[FeedFormatValidator] Reading file content');
            const fileContent = await this.readFile(file);
            console.log('[FeedFormatValidator] File content length:', fileContent?.length || 0);
            console.log('[FeedFormatValidator] File content preview:', fileContent?.substring(0, 100) + '...');
            
            if (!fileContent) {
                console.error('[FeedFormatValidator] File is empty or could not be read');
                this.addError('empty_file', 'File is empty or could not be read', 'error');
                return this.getResults();
            }
            
            // Parse the CSV using the existing parser if available
            let parsedData;
            if (this.csvParser) {
                console.log('[FeedFormatValidator] Using CSVParser to parse file');
                const parseResult = await this.parseWithCSVParser(fileContent);
                
                // Add any parsing errors to our errors list
                if (parseResult.errors && parseResult.errors.length > 0) {
                    parseResult.errors.forEach(error => {
                        this.addError('csv_parse_error', error.message, 'error', error.row);
                    });
                }
                
                // Add any parsing warnings to our errors list as warnings
                if (parseResult.warnings && parseResult.warnings.length > 0) {
                    parseResult.warnings.forEach(warning => {
                        this.addError('csv_parse_warning', warning.message, 'warning', warning.row);
                    });
                }
                
                parsedData = parseResult.data;
            } else {
                console.log('[FeedFormatValidator] CSVParser not available, using simple parsing');
                parsedData = this.parseCSV(fileContent);
            }
            
            if (!parsedData || parsedData.length === 0) {
                this.addError('parse_error', 'Could not parse any data from the CSV file', 'error');
                return this.getResults();
            }
            
            console.log('[FeedFormatValidator] Successfully parsed CSV with', parsedData.length, 'rows');
            
            // Validate the parsed data
            await this.validateParsedData(parsedData);
            
            return this.getResults();
        } catch (error) {
            console.error('[FeedFormatValidator] Error during validation:', error);
            this.addError('validation_error', `Error during validation: ${error.message}`, 'error');
            return this.getResults();
        }
    }
    
    /**
     * Read a file and return its content as text
     * @param {File} file - The file to read
     * @returns {Promise<string>} - The file content
     */
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Parse CSV content using the CSVParser
     * @param {string} content - The CSV content to parse
     * @returns {Promise<object>} - The parsed data with any errors/warnings
     */
    async parseWithCSVParser(content) {
        try {
            // Use the parse method of the CSVParser
            return this.csvParser.parse(content, this.contentTypeValidator);
        } catch (error) {
            console.error('[FeedFormatValidator] Error using CSVParser:', error);
            return { data: [], errors: [{ message: `CSV parsing error: ${error.message}` }], warnings: [] };
        }
    }
    
    /**
     * Simple CSV parser as fallback if CSVParser is not available
     * @param {string} content - The CSV content to parse
     * @returns {Array<object>} - The parsed data as array of objects
     */
    parseCSV(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length !== headers.length) {
                this.addError('row_length_mismatch', `Row ${i} has ${values.length} columns, expected ${headers.length}`, 'warning', i);
                // Adjust values array to match headers length
                if (values.length < headers.length) {
                    values.push(...Array(headers.length - values.length).fill(''));
                } else {
                    values.length = headers.length;
                }
            }
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            
            // Add row index and offerId for easier reference
            row.rowIndex = i;
            row.offerId = row.id || `row-${i}`;
            
            data.push(row);
        }
        
        return data;
    }
    
    /**
     * Validate the parsed CSV data
     * @param {Array<object>} data - The parsed CSV data
     */
    async validateParsedData(data) {
        // Check for required columns
        this.checkRequiredColumns(data);
        
        // Check each row for issues
        data.forEach((row, index) => {
            const rowIndex = index + 1; // 1-based row index for display
            
            // Check for empty required fields
            this.checkEmptyRequiredFields(row, rowIndex);
            
            // Check for URLs in description field - ONLY show this in Feed Status
            this.checkUrlsInDescription(row, rowIndex);
            
            // Use ContentTypeValidator if available, but EXCLUDE title and description length validation
            if (this.contentTypeValidator) {
                this.validateContentTypes(row, rowIndex);
            }
            
            // Note: We're skipping field length checks for Feed Status display
            // as these should only be shown in the validation modal
        });
    }
    
    /**
     * Check if all required columns are present
     * @param {Array<object>} data - The parsed CSV data
     */
    checkRequiredColumns(data) {
        if (!data || data.length === 0) return;
        
        // Get the first row to check columns
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        // Find missing required columns
        const missingColumns = this.requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
            this.addError(
                'missing_columns',
                `Missing required columns: ${missingColumns.join(', ')}`,
                'error'
            );
        }
    }
    
    /**
     * Check for empty required fields in a row
     * @param {object} row - The row to check
     * @param {number} rowIndex - The row index (1-based)
     */
    checkEmptyRequiredFields(row, rowIndex) {
        const emptyFields = this.requiredColumns.filter(col => {
            return row[col] === undefined || row[col] === null || row[col].trim() === '';
        });
        
        if (emptyFields.length > 0) {
            this.addError(
                'empty_required_fields',
                `Row ${rowIndex}: Missing values for required fields: ${emptyFields.join(', ')}`,
                'error',
                rowIndex,
                null,
                row.id || `row-${rowIndex}`
            );
        }
    }
    
    /**
     * Check field lengths against minimum and maximum requirements
     * @param {object} row - The row to check
     * @param {number} rowIndex - The row index (1-based)
     */
    checkFieldLengths(row, rowIndex) {
        // This method is still used by the validation modal, but we don't want to show
        // these errors in the Feed Status section, so we're not adding them to the errors array.
        
        // Check title length
        if (row.title) {
            const titleLength = row.title.length;
            if (titleLength < this.minLengths.title || titleLength > this.maxLengths.title) {
                // We're not adding these errors to the feed status section
                // They will be handled by the validation modal instead
                console.log(`[FeedFormatValidator] Title length issue in row ${rowIndex}: ${titleLength} chars`);
            }
        }
        
        // Check description length
        if (row.description) {
            const descLength = row.description.length;
            if (descLength < this.minLengths.description || descLength > this.maxLengths.description) {
                // We're not adding these errors to the feed status section
                // They will be handled by the validation modal instead
                console.log(`[FeedFormatValidator] Description length issue in row ${rowIndex}: ${descLength} chars`);
            }
        }
    }
    
    /**
     * Check for URLs in description field
     * @param {object} row - The row to check
     * @param {number} rowIndex - The row index (1-based)
     */
    checkUrlsInDescription(row, rowIndex) {
        if (row.description) {
            // Simple URL detection regex
            const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
            
            if (urlRegex.test(row.description)) {
                console.log(`[FeedFormatValidator] Found URL in description field at row ${rowIndex}: ${row.description}`);
                
                this.addError(
                    'url_in_description',
                    `Description contains a URL, which is not recommended for product descriptions.`,
                    'warning',
                    rowIndex,
                    'description',
                    row.id || `row-${rowIndex}`
                );
            }
        }
    }
    
    /**
     * Validate content types using ContentTypeValidator
     * @param {object} row - The row to validate
     * @param {number} rowIndex - The row index (1-based)
     */
    validateContentTypes(row, rowIndex) {
        try {
            console.log(`[FeedFormatValidator] Validating content types for row ${rowIndex}`);
            console.log(`[FeedFormatValidator] Row data:`, row);
            
            // Get the headers from the row
            const headers = Object.keys(row);
            console.log(`[FeedFormatValidator] Headers:`, headers);
            
            // Check if description field contains a URL
            if (row.description && row.description.includes('http')) {
                console.log(`[FeedFormatValidator] Found URL in description field: ${row.description}`);
            }
            
            // Call the validate method of ContentTypeValidator
            console.log(`[FeedFormatValidator] ContentTypeValidator available:`, !!this.contentTypeValidator);
            if (!this.contentTypeValidator) {
                console.error(`[FeedFormatValidator] ContentTypeValidator not available, skipping content type validation`);
                return;
            }
            
            console.log(`[FeedFormatValidator] Calling ContentTypeValidator.validate`);
            const contentTypeIssues = this.contentTypeValidator.validate(row, headers);
            console.log(`[FeedFormatValidator] ContentTypeValidator returned ${contentTypeIssues?.length || 0} issues`);
            
            // Add any content type issues to our errors list
            if (contentTypeIssues && contentTypeIssues.length > 0) {
                console.log(`[FeedFormatValidator] Content type issues found:`, contentTypeIssues);
                
                // Filter out ALL title and description validation errors
                const filteredIssues = contentTypeIssues.filter(issue => {
                    // Skip if marked as title/description issue
                    if (issue.isTitleDescriptionIssue) {
                        console.log(`[FeedFormatValidator] Skipping issue marked as title/description issue: ${issue.message}`);
                        return false;
                    }
                    
                    // Skip ALL title and description validation errors
                    if (issue.field === 'title' || issue.field === 'description') {
                        console.log(`[FeedFormatValidator] Skipping ${issue.field} issue for feed status: ${issue.message}`);
                        return false;
                    }
                    
                    // Also skip any issue message that contains "title" or "description"
                    if (issue.message && (
                        issue.message.toLowerCase().includes('title') ||
                        issue.message.toLowerCase().includes('description')
                    )) {
                        console.log(`[FeedFormatValidator] Skipping issue with title/description in message: ${issue.message}`);
                        return false;
                    }
                    
                    return true;
                });
                
                console.log(`[FeedFormatValidator] After filtering, ${filteredIssues.length} issues remain`);
                
                // Add remaining issues to the errors list
                filteredIssues.forEach(issue => {
                    console.log(`[FeedFormatValidator] Adding content type issue: ${issue.field} - ${issue.message}`);
                    this.addError(
                        'content_type_issue',
                        issue.message || `Invalid ${issue.field} format`,
                        issue.severity || 'warning',
                        rowIndex,
                        issue.field,
                        row.id || `row-${rowIndex}`
                    );
                });
            }
        } catch (error) {
            console.error('[FeedFormatValidator] Error validating content types:', error);
        }
    }
    
    /**
     * Add an error to the errors array
     * @param {string} type - The error type
     * @param {string} message - The error message
     * @param {string} severity - The error severity (error, warning, info)
     * @param {number} rowIndex - The row index (1-based)
     * @param {string} field - The field with the error
     * @param {string} offerId - The offer ID for the row
     */
    addError(type, message, severity = 'error', rowIndex = null, field = null, offerId = null) {
        this.errors.push({
            type,
            message,
            severity,
            rowIndex,
            field,
            offerId
        });
    }
    
    /**
     * Get the validation results
     * @returns {object} - The validation results
     */
    getResults() {
        return {
            isValid: this.errors.filter(e => e.severity === 'error').length === 0,
            issues: this.errors,
            errorCount: this.errors.filter(e => e.severity === 'error').length,
            warningCount: this.errors.filter(e => e.severity === 'warning').length,
            infoCount: this.errors.filter(e => e.severity === 'info').length,
            totalIssues: this.errors.length
        };
    }
}

// Make globally available
window.FeedFormatValidator = FeedFormatValidator;