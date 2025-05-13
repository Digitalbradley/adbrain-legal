# Content Type Validation Improvements

## Overview

This document outlines the improvements made to the Content Type Validator module as part of the medium-term goals in the refactoring plan. The Content Type Validator is responsible for ensuring that data in each column of the feed matches the expected format (e.g., URLs in link fields, text in title fields).

## Key Improvements

### 1. Enhanced Validation Rules

The validation rules have been significantly enhanced to provide more comprehensive validation:

- **More Sophisticated Pattern Matching**: Added robust regular expressions for validating URLs, prices, emails, dates, and other common field types.
- **Length Validation**: Added context-aware thresholds for different field types (e.g., titles should be 30-150 characters).
- **Special Character Validation**: Added validation for HTML and special characters that might cause issues in feeds.
- **Currency Validation**: Added support for multiple currencies with proper decimal place validation.

### 2. Severity Levels

Added a severity system to differentiate between different types of validation issues:

- **ERROR**: Critical issues that should be fixed (e.g., invalid URLs, wrong format).
- **WARNING**: Issues that might affect performance but aren't critical (e.g., title too short).
- **INFO**: Informational messages that might be helpful (e.g., using HTTP instead of HTTPS).

### 3. Suggested Fixes

Added automatic fix suggestions for common issues:

- **URL Fixes**: Automatically adding "https://" to URLs that are missing protocols.
- **Format Fixes**: Correcting price formats, availability values, and condition values.
- **Character Fixes**: Removing HTML and special characters from text fields.

### 4. Additional Field Support

Added support for more field types commonly found in product feeds:

- **GTIN**: Global Trade Item Number validation.
- **MPN**: Manufacturer Part Number validation.
- **Brand**: Brand name validation.

### 5. Custom Validation Rules

Added support for custom validation rules:

- **Additional Validators**: Each field can have multiple validators with different severity levels.
- **Custom Validator API**: Added an API to add custom validators for any field.

### 6. Improved Debugging

Added comprehensive debugging support:

- **Debug Logging**: Added detailed logging for validation operations.
- **Self-Test**: Enhanced self-test functionality to verify the module is working correctly.

### 7. Better Organization

Improved the organization of the code:

- **Constants**: Moved validation thresholds, regular expressions, and other constants to the top of the file.
- **Helper Functions**: Added helper functions for common operations.
- **Modular Design**: Separated validation logic from formatting and display logic.

## New Features

### 1. Group Issues by Severity

Added a new function to group validation issues by severity level, making it easier to display and prioritize issues:

```javascript
const groupedIssues = ContentTypeValidator.groupIssuesBySeverity(issues);
// Returns: { error: [...], warning: [...], info: [...] }
```

### 2. Get Suggested Fixes

Added a new function to get suggested fixes for validation issues:

```javascript
const fixes = ContentTypeValidator.getSuggestedFixes(issues);
// Returns: { field1: 'fixed value', field2: 'fixed value' }
```

### 3. Validate Individual Fields

Added a new function to validate individual fields:

```javascript
const issues = ContentTypeValidator.validateField('title', 'Product Title');
// Returns: Array of issues for the specified field
```

### 4. Add Custom Validators

Added a new function to add custom validators:

```javascript
ContentTypeValidator.addCustomValidator('custom_field', {
  validate: (value) => value.length > 10,
  message: 'should be more than 10 characters',
  severity: ContentTypeValidator.SEVERITY.WARNING,
  fix: (value) => value.padEnd(11, 'x')
});
```

## Integration with Existing Code

The enhanced Content Type Validator maintains backward compatibility with the existing code:

- The original `validate` and `formatIssues` functions still work as before.
- The original validators are still available but have been enhanced.
- The module is still exposed globally as `window.ContentTypeValidator`.

## Testing

A comprehensive test suite has been created for the Content Type Validator:

- **Unit Tests**: Tests for each validator and function.
- **Integration Tests**: Tests for the module as a whole.
- **Edge Cases**: Tests for empty values, invalid inputs, and other edge cases.

## Next Steps

1. **Integration with UI**: Enhance the UI to display validation issues with severity levels.
2. **User-Defined Rules**: Allow users to define their own validation rules.
3. **Batch Fixes**: Add support for fixing multiple issues at once.
4. **Performance Optimization**: Optimize validation for large datasets.

## Conclusion

The enhanced Content Type Validator provides a more robust and flexible validation system for product feeds. It helps users identify and fix issues in their data, improving the quality of their feeds and reducing errors.