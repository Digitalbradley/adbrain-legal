# AdBrain Feed Manager - Front-End Testing Plan

## Overview

This document provides a concise testing plan for the AdBrain Feed Manager extension, focusing on the remaining tasks identified in the front_end_testing_results.md file. It's designed to be a quick reference for future agents to understand what needs to be tested and how to approach it.

## Quick Reference for Future Agents

### Key Files to Review First
1. `docs/refactoring/old/module_documentation.md` - Core architecture and module relationships
2. `docs/refactoring/next_agent_front_end_testing_instructions.md` - Specific testing instructions
3. `docs/refactoring/front_end_testing_results.md` - Current testing status and results
4. `src/popup/auth_mock.js` - For modifying pro/free user status

### Testing Priorities
1. ✅ Improve row highlighting style (COMPLETED)
2. Test Pro features with mock free account
3. Test edge cases
4. Document all results in front_end_testing_results.md

### Critical Functionality to Preserve
- Validation Details Modal functionality
- Tab Switching functionality
- Row Highlighting functionality (now fixed and working correctly)

## Detailed Testing Tasks

### 1. Row Highlighting Style Improvement (COMPLETED)

**Original Issue:**
The row highlighting was not working because the CSS was targeting the row elements but not the cells within them.

**Solution Implemented:**
```css
/* Apply highlighting to the row and its cells */
.row-highlight {
    animation: highlight-row 3s ease-out;
}

.row-highlight td {
    background-color: #fff3cd !important; /* Apply to cells for better visibility */
}

/* Make the highlighted row stand out more */
.highlighted-row td {
    background-color: #fff3cd !important; /* Softer yellow */
    border-left: 4px solid #fd7e14 !important; /* Orange border */
}
```

**Result:**
Row highlighting now works correctly. When clicking on "Go to Row" in the validation details panel, the corresponding row in the feed preview is properly highlighted.

### 2. Pro Features Testing

**How to Test Free User Experience:**
1. Modify `src/popup/auth_mock.js`:
   ```javascript
   // Change this line
   this.isProUser = true;
   // To
   this.isProUser = false;
   ```
2. Test the following features:
   - Validation History Limitation (free users: 7 days only)
   - Custom Validation Rules (free users: upgrade prompts)
   - Scheduled Validation (free users: upgrade prompts)
   - Bulk Export/Import (free users: upgrade prompts)
3. Document findings in front_end_testing_results.md
4. Revert the change to auth_mock.js

### 3. Edge Case Testing

**Test Cases:**
1. **Invalid Data**
   - Empty feed
   - Malformed data
   - Missing required fields

2. **Large Feeds**
   - Feed with >1000 rows
   - Monitor memory usage and performance

3. **Error Handling**
   - Network errors (disconnect internet)
   - Firebase errors (invalid authentication)
   - Missing dependencies

**Detailed Testing Steps:**

#### Preparation
1. Locate the test files in `tests/test_data/`:
   - `empty_feed.csv` - An empty CSV file
   - `malformed_feed.csv` - A CSV with incorrect formatting
   - `missing_fields_feed.csv` - A CSV missing required fields
   - `large_feed.csv` - A CSV with >1000 rows

#### Testing Invalid Data

1. **Empty Feed Test**:
   - Click the "Choose File" button in the extension
   - Select `tests/test_data/empty_feed.csv`
   - Click the "Preview Feed" button
   - Expected: An error message should appear indicating the feed is empty
   - Document the actual behavior in `front_end_testing_results.md`

2. **Malformed Data Test**:
   - Click the "Choose File" button in the extension
   - Select `tests/test_data/malformed_feed.csv`
   - Click the "Preview Feed" button
   - Expected: An error message should appear indicating the CSV is malformed
   - Document the actual behavior in `front_end_testing_results.md`

3. **Missing Required Fields Test**:
   - Click the "Choose File" button in the extension
   - Select `tests/test_data/missing_fields_feed.csv`
   - Click the "Preview Feed" button
   - Click the "Validate Feed" button
   - Expected: The validation should identify and highlight the missing required fields
   - Document the actual behavior in `front_end_testing_results.md`

#### Testing Large Feeds

1. **Large Feed Performance Test**:
   - Open Chrome DevTools (F12)
   - Switch to the "Performance" tab
   - Start recording
   - Click the "Choose File" button in the extension
   - Select `tests/test_data/large_feed.csv`
   - Click the "Preview Feed" button
   - Observe loading time and UI responsiveness
   - Stop recording and analyze the performance metrics
   - Document the findings in `front_end_testing_results.md`

2. **Large Feed Validation Test**:
   - With the large feed loaded, click the "Validate Feed" button
   - Observe the validation process time and UI responsiveness
   - Check if pagination works correctly with the large dataset
   - Document the findings in `front_end_testing_results.md`

#### Testing Error Handling

1. **Network Error Test**:
   - Open the browser console (F12)
   - Enter `window.simulateGMCNetworkError()` in the console
   - Click the "Validate Feed" button
   - Expected: An error message should appear indicating a network error
   - Document the actual behavior in `front_end_testing_results.md`
   - Reset with `window.resetGMCMock()`

2. **Firebase Error Test**:
   - Open the browser console (F12)
   - Enter `window.simulateFirestoreError()` in the console
   - Click the "Validation History" tab
   - Expected: An error message should appear indicating a Firebase error
   - Document the actual behavior in `front_end_testing_results.md`
   - Reset with `window.resetFirebaseMock()`

3. **Authentication Error Test**:
   - Open the browser console (F12)
   - Enter `window.simulateAuthError()` in the console
   - Click the "Validate Feed" button
   - Expected: An error message should appear indicating an authentication error
   - Document the actual behavior in `front_end_testing_results.md`
   - Reset with `window.resetAuthMock()`

4. **Missing Dependencies Test**:
   - Open the browser console (F12)
   - Enter `window.GMCValidator = undefined;` in the console
   - Click the "Validate Feed" button
   - Expected: An error message should appear indicating a missing dependency
   - Document the actual behavior in `front_end_testing_results.md`
   - Refresh the extension to reset

## Documentation Format

For each test, document in front_end_testing_results.md:
1. Test Case ID and Description
2. Steps Performed
3. Expected Result
4. Actual Result
5. Console Logs (relevant portions)
6. Screenshots (if applicable)
7. Issues Found (if any)
8. Recommendations

## Agent Handoff

After completing testing:
1. Update the "Agent Handoff Documentation" section in front_end_testing_results.md
2. Include summary of work completed
3. Document current status of testing
4. Provide explicit next steps for the following agent
5. If you modified auth_mock.js, document the changes and how to revert them