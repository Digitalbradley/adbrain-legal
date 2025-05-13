# Feed Error UI System Plan

## Overview

This document outlines a plan for creating a new error UI system specifically for detecting and displaying errors in malformed feeds. This system will be separate from the existing validation system and will focus on informing users about format/structure issues in their feeds immediately after upload, before they proceed to the validation step.

## Goals

1. Create a user-friendly UI for displaying feed format/structure errors
2. Provide clear guidance on how to fix these errors
3. Design the UI to look and behave like a professional SaaS product
4. Ensure the system is separate from the existing validation system

## Components

### 1. Feed Format Validator

This component will be responsible for detecting format/structure errors in feeds during upload. It will check for issues such as:

- Missing required columns
- Malformed CSV structure
- Incorrect data types
- Empty required fields
- Duplicate entries
- Character encoding issues

```javascript
class FeedFormatValidator {
    constructor() {
        this.errors = [];
    }

    validateFeed(feedData) {
        this.errors = [];
        
        // Check for required columns
        this.checkRequiredColumns(feedData);
        
        // Check for malformed CSV structure
        this.checkCSVStructure(feedData);
        
        // Check for data type issues
        this.checkDataTypes(feedData);
        
        // Check for empty required fields
        this.checkEmptyRequiredFields(feedData);
        
        // Check for duplicate entries
        this.checkDuplicateEntries(feedData);
        
        // Check for character encoding issues
        this.checkCharacterEncoding(feedData);
        
        return {
            isValid: this.errors.length === 0,
            errors: this.errors
        };
    }
    
    // Implementation of validation methods...
}
```

### 2. Error UI Manager

This component will be responsible for displaying the errors detected by the Feed Format Validator. It will provide a user-friendly interface for viewing and understanding the errors.

```javascript
class FeedErrorUIManager {
    constructor(elements) {
        this.elements = elements;
        this.errorContainer = null;
    }
    
    displayErrors(errors) {
        if (!errors || errors.length === 0) {
            this.hideErrorUI();
            return;
        }
        
        this.createErrorUI(errors);
    }
    
    createErrorUI(errors) {
        // Create error UI container if it doesn't exist
        if (!this.errorContainer) {
            this.errorContainer = document.createElement('div');
            this.errorContainer.className = 'feed-error-container';
            this.elements.feedPreviewContainer.insertBefore(
                this.errorContainer, 
                this.elements.feedPreviewContainer.firstChild
            );
        }
        
        // Create error UI content
        this.errorContainer.innerHTML = this.formatErrors(errors);
        
        // Add event listeners for collapsible sections
        this.setupEventListeners();
    }
    
    formatErrors(errors) {
        // Format errors for display
        // Implementation...
    }
    
    setupEventListeners() {
        // Add event listeners for collapsible sections
        // Implementation...
    }
    
    hideErrorUI() {
        if (this.errorContainer) {
            this.errorContainer.remove();
            this.errorContainer = null;
        }
    }
}
```

### 3. Integration with Feed Manager

The Feed Format Validator and Error UI Manager will be integrated with the existing Feed Manager to detect and display errors during feed upload.

```javascript
// In feed_manager.js

async handlePreview() {
    // ... existing code ...
    
    try {
        // ... existing code ...
        
        // Parse the CSV file
        const data = await CSVParser.parseCSV(file);
        
        // Validate feed format
        const formatValidator = new FeedFormatValidator();
        const formatValidationResult = formatValidator.validateFeed(data);
        
        // Display format errors if any
        if (!formatValidationResult.isValid) {
            this.managers.errorUIManager.displayErrors(formatValidationResult.errors);
            
            // Still display the feed preview even if there are format errors
            this.displayFeedPreview(data);
            return;
        }
        
        // If no format errors, hide the error UI
        this.managers.errorUIManager.hideErrorUI();
        
        // ... existing code ...
    } catch (error) {
        // ... existing code ...
    }
}
```

## UI Design

The error UI will be designed to be user-friendly and professional, with a focus on clarity and aesthetics. It will include:

1. A collapsible error section at the top of the feed preview area
2. A summary of the errors with a count
3. Detailed error messages with guidance on how to fix them
4. Visual indicators for the severity of each error
5. Links to documentation or examples for more complex issues

### Mockup

```
+-------------------------------------------------------+
| Feed Preview                                          |
+-------------------------------------------------------+
| ▼ Feed Format Errors (3)                              |
|                                                       |
|   ⚠️ Missing required columns: 'price', 'availability'|
|      Required columns must be included in your feed.  |
|      [Learn More]                                     |
|                                                       |
|   ⚠️ Malformed CSV structure in rows: 15, 23, 42      |
|      These rows have an incorrect number of columns.  |
|      [View Details]                                   |
|                                                       |
|   ⚠️ Empty required fields in 5 rows                  |
|      Required fields cannot be empty.                 |
|      [View Details]                                   |
+-------------------------------------------------------+
| id | title | description | link | ... |               |
+-------------------------------------------------------+
| ... feed preview table ...                            |
```

## CSS Styling

The error UI will be styled to match the overall design of the extension, with a focus on clarity and professionalism. Here's a sample of the CSS:

```css
.feed-error-container {
    margin-bottom: 20px;
    border: 1px solid #f8d7da;
    border-radius: 4px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feed-error-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: #f8d7da;
    color: #721c24;
    cursor: pointer;
    border-radius: 4px 4px 0 0;
}

.feed-error-header:hover {
    background-color: #f5c6cb;
}

.feed-error-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.feed-error-count {
    background-color: #721c24;
    color: white;
    border-radius: 50%;
    padding: 2px 8px;
    font-size: 14px;
    font-weight: bold;
}

.feed-error-content {
    padding: 15px;
    max-height: 300px;
    overflow-y: auto;
}

.feed-error-item {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #f5c6cb;
}

.feed-error-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.feed-error-title {
    display: flex;
    align-items: center;
    font-weight: 600;
    margin-bottom: 5px;
}

.feed-error-icon {
    margin-right: 8px;
    font-size: 18px;
}

.feed-error-message {
    margin-left: 26px;
    color: #555;
}

.feed-error-action {
    margin-left: 26px;
    margin-top: 8px;
}

.feed-error-action a {
    color: #0066cc;
    text-decoration: none;
    font-size: 14px;
}

.feed-error-action a:hover {
    text-decoration: underline;
}
```

## Implementation Plan

### Phase 1: Core Components

1. Create the FeedFormatValidator class
   - Implement basic validation methods
   - Add tests for validation logic

2. Create the FeedErrorUIManager class
   - Implement UI creation and display methods
   - Add CSS styles for the error UI

3. Integrate with Feed Manager
   - Update handlePreview method to use the new validator
   - Initialize the error UI manager

### Phase 2: Enhanced Validation

1. Add more sophisticated validation rules
   - Check for semantic errors in data
   - Add validation for specific feed types (Google, Facebook, etc.)

2. Improve error messages and guidance
   - Add more detailed error descriptions
   - Include specific examples of how to fix each error

### Phase 3: UI Enhancements

1. Add interactive features to the error UI
   - Add ability to filter errors by type or severity
   - Add ability to navigate to specific rows with errors

2. Add visual enhancements
   - Add animations for expanding/collapsing error sections
   - Add icons and colors to indicate error severity

## Testing Plan

1. Unit Tests
   - Test FeedFormatValidator methods
   - Test FeedErrorUIManager methods

2. Integration Tests
   - Test integration with Feed Manager
   - Test error detection and display flow

3. UI Tests
   - Test error UI rendering
   - Test interactive features

4. User Testing
   - Get feedback from users on the error UI
   - Iterate based on feedback

## Conclusion

This new error UI system will provide users with clear and actionable information about format/structure issues in their feeds, helping them to fix these issues before proceeding to the validation step. The system will be designed to be user-friendly and professional, with a focus on clarity and aesthetics.