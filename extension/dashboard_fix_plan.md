# AdBrain Dashboard Loading Fix Plan

## Current Issue
The extension currently fails to load the main popup (`popup.html`) after login, showing an "Error: Extension failed to load core components..." message. Console logs indicate `net::ERR_FILE_NOT_FOUND` for `analyzer.js` and `custom_rule_validator.js`.

## Root Cause
The script paths in popup.html are incorrect:
- The custom_rule_validator.js file exists in `src/lib/validation/` but is being loaded from `../../lib/validation/custom_rule_validator.js`
- Similarly, analyzer.js exists in `lib/validation/` but is being loaded from `../../lib/validation/analyzer.js`

## Simple Fix Plan

### Step 1: Fix Script Paths in popup.html
We need to correct the paths in popup.html to properly reference the files:

```html
<!-- Change this line -->
<script src="../../lib/validation/analyzer.js"></script>
<!-- To this -->
<script src="../lib/validation/analyzer.js"></script>

<!-- Change this line -->
<script src="../../lib/validation/custom_rule_validator.js"></script>
<!-- To this -->
<script src="../lib/validation/custom_rule_validator.js"></script>
```

### Step 2: Test Dashboard Loading
After fixing the paths:
1. Test if the popup loads without the "core components" error
2. Check if the basic UI elements appear correctly
3. Test basic functionality like file selection

### Step 3: Incremental Testing
If the dashboard loads successfully:
1. Test the feed preview functionality
2. If it works, great! If not, we can add logging to diagnose without changing background.js

## Implementation Steps
1. Switch to Code mode to make the necessary changes to popup.html
2. Fix the script paths in popup.html
3. Test if the popup loads without errors
4. Test basic functionality

This approach keeps the background.js file in its current minimal state for testing purposes, focusing only on getting the dashboard to load properly first.