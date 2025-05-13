// src/popup/csv_parser.js

/**
 * CSV Parser Module
 *
 * Responsible for parsing CSV text, validating structure, and identifying basic issues.
 */
class CSVParser {
    constructor(options = {}) {
        // Options could include required headers, etc. in the future
        this.requiredHeaders = options.requiredHeaders || ['id', 'title', 'description', 'link', 'image_link'];
        console.log('[CSVParser] Initialized');
    }

    /**
     * Parses CSV text into an array of objects.
     * Also performs structural validation and content type validation (if validator provided).
     *
     * @param {string} csvText - The raw CSV text.
     * @param {object} [contentTypeValidator=null] - Optional ContentTypeValidator instance/object with a `validate` method.
     * @returns {{ data: Array<object>, errors: Array<object>, warnings: Array<object> }} - Parsed data, errors, and warnings.
     */
    parse(csvText, contentTypeValidator = null) {
        console.log('[CSVParser] ==================== PARSING CSV ====================');
        console.log('[CSVParser] parse called with text length:', csvText ? csvText.length : 0);
        console.log('[CSVParser] ContentTypeValidator provided:', !!contentTypeValidator);

        const errors = [];
        const warnings = [];
        const data = [];

        if (!csvText || !csvText.trim()) {
            const errorMsg = "Empty feed: The CSV file appears to be empty or contains only whitespace.";
            console.error('[CSVParser] ' + errorMsg);
            errors.push({ type: 'empty_feed', message: errorMsg });
            // Return early as there's nothing to parse
            return { data, errors, warnings };
        }

        const lines = csvText.split(/[\r\n]+/).filter(line => line.trim());
        console.log('[CSVParser] CSV contains', lines.length, 'non-empty lines');

        if (lines.length < 1) {
            const errorMsg = "Empty feed: No rows found in the CSV file.";
            console.error('[CSVParser] ' + errorMsg);
            errors.push({ type: 'empty_feed', message: errorMsg });
            return { data, errors, warnings };
        }

        // Parse headers
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
        console.log('[CSVParser] CSV headers:', headers);

        if (headers.length === 0 || headers.every(h => !h)) {
            const errorMsg = "Invalid CSV format: Could not parse headers from CSV.";
            console.error('[CSVParser] ' + errorMsg);
            errors.push({ type: 'invalid_headers', message: errorMsg });
            // Cannot proceed without headers
            return { data, errors, warnings };
        }

        // Check for required headers
        const missingHeaders = this.requiredHeaders.filter(required => !headers.includes(required));

        if (missingHeaders.length > 0) {
            const errorMsg = `Missing required headers: ${missingHeaders.join(', ')}. These fields are required for feed validation.`;
            console.error('[CSVParser] ' + errorMsg);
            // Treat missing headers as a warning for now, allowing partial preview
            warnings.push({ type: 'missing_headers_warning', message: errorMsg, missingHeaders });
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Parse values with improved error handling
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            let unclosedQuoteDetected = false; // Renamed to avoid conflict

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    if (inQuotes && line[j+1] === '"') { // Handle escaped quotes ""
                        currentVal += '"';
                        j++;
                    } else {
                        inQuotes = !inQuotes;
                        if (inQuotes) {
                            unclosedQuoteDetected = true; // Potential unclosed quote
                        } else {
                            unclosedQuoteDetected = false; // Quote closed
                        }
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal);
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
             // Add the last value
            values.push(currentVal);

            // Check for unclosed quotes at end of line
            if (inQuotes) { // If still in quotes at the end, it's unclosed
                const warningMsg = `Row ${i+1}: Unclosed quotation mark detected. This may cause parsing issues.`;
                console.warn('[CSVParser] ' + warningMsg);
                warnings.push({ type: 'unclosed_quote', row: i+1, message: warningMsg });
                unclosedQuoteDetected = true; // Confirm it was unclosed
            } else {
                 unclosedQuoteDetected = false; // Ensure it's false if quotes were balanced
            }


            // Check for inconsistent column count
            if (values.length !== headers.length) {
                const warningMsg = `Row ${i+1}: Inconsistent number of columns. Expected ${headers.length}, found ${values.length}.`;
                console.warn('[CSVParser] ' + warningMsg);

                if (values.length > headers.length) {
                    warnings.push({
                        type: 'too_many_columns',
                        row: i+1,
                        message: warningMsg,
                        expected: headers.length,
                        found: values.length
                    });
                    console.warn(`[CSVParser] Row ${i+1} truncated.`);
                    values.length = headers.length; // Truncate extra values
                } else {
                    warnings.push({
                        type: 'too_few_columns',
                        row: i+1,
                        message: warningMsg,
                        expected: headers.length,
                        found: values.length
                    });
                    console.warn(`[CSVParser] Row ${i+1} padded.`);
                    while (values.length < headers.length) values.push(''); // Pad missing values
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
            this.requiredHeaders.forEach(field => {
                // Only check if the header actually exists in the file
                if (headers.includes(field) && (!row[field] || row[field].trim() === '')) {
                    emptyRequiredFields.push(field);
                }
            });

            if (emptyRequiredFields.length > 0) {
                const warningMsg = `Row ${i+1}: Missing required values for fields: ${emptyRequiredFields.join(', ')}.`;
                console.warn('[CSVParser] ' + warningMsg);
                warnings.push({
                    type: 'empty_required_fields',
                    row: i+1,
                    fields: emptyRequiredFields,
                    message: warningMsg
                });
            }

            // Check for content type issues using the provided validator
            if (contentTypeValidator && typeof contentTypeValidator.validate === 'function') {
                try {
                    const contentTypeIssues = contentTypeValidator.validate(row, headers);
                    if (contentTypeIssues && contentTypeIssues.length > 0) {
                        const warningMsg = `Row ${i+1}: Content type issues detected.`; // Simplified message
                        console.warn(`[CSVParser] ${warningMsg} Issues:`, contentTypeIssues);
                        warnings.push({
                            type: 'content_type_issues',
                            row: i+1,
                            issues: contentTypeIssues, // Keep detailed issues
                            message: warningMsg
                        });
                    }
                } catch (error) {
                    console.error(`[CSVParser] Error during content type validation for row ${i+1}:`, error);
                    warnings.push({
                        type: 'content_type_error',
                        row: i+1,
                        message: `Error during content type validation: ${error.message}`
                    });
                }
            } else if (contentTypeValidator) {
                 console.warn(`[CSVParser] ContentTypeValidator provided but missing 'validate' method for row ${i+1}`);
            }


            if (hasValue) data.push(row);
        }

        // Check if we have any data rows after parsing
        if (data.length === 0 && errors.length === 0) {
            // If no errors were thrown but data is empty (e.g., only header row)
            const errorMsg = "Empty feed: No valid data rows found in the CSV file.";
            console.warn("[CSVParser] " + errorMsg);
            errors.push({ type: 'no_data_rows', message: errorMsg });
        } else if (data.length > 0) {
             console.log('[CSVParser] Successfully parsed CSV data with', data.length, 'rows');
             console.log('[CSVParser] First row sample:', data[0]);
        }

        console.log(`[CSVParser] Parsing finished. Errors: ${errors.length}, Warnings: ${warnings.length}`);
        return { data, errors, warnings };
    }
}

// Make globally available
window.CSVParser = CSVParser;