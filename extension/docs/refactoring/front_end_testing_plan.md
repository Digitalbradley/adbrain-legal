# AdBrain Feed Manager: Front-End Testing Plan

## Current Status

### What Has Been Tested
- CSV file upload functionality
- Feed preview display
- Basic UI elements and navigation

### Current Issues
- The "Validate Feed" button does not work
- No console logs appear when clicking the Validate Feed button
- Validation results are not displayed in the history tab

## Expected Behavior

1. **Validation Process**:
   - User clicks "Validate Feed" button
   - User is sent to the history tab with validation results
   - A new entry appears in the validation history table

2. **Validation Details**:
   - View details button is available for each validation entry
   - Clicking View Details opens a modal popup
   - Modal displays all validation errors/issues

3. **Error Navigation and Correction**:
   - Each error has a clickable link to navigate to the specific row
   - Clicking the link highlights the row in the feed preview
   - The row remains highlighted until errors are fixed
   - When errors are fixed, they are removed from the modal
   - Once all errors are fixed, the validation status updates

## Testing Plan

### Phase 1: Basic Functionality Testing

#### Test Case 1.1: Feed Loading and Preview
- **Objective**: Verify feed preview displays correctly
- **Steps**:
  1. Load a CSV file using the "Choose File" button
  2. Verify feed preview table displays correctly
  3. Check editable fields (title, description) have character count indicators
  4. Verify validation status of fields based on length requirements
- **Expected Result**: Feed data displays in a table with editable fields and character counts

#### Test Case 1.2: Tab Switching
- **Objective**: Verify tab navigation works correctly
- **Steps**:
  1. Click on each tab (Feed Preview, Validation History, Settings)
  2. Verify correct tab content is displayed
  3. Check tab switching after validation process
- **Expected Result**: Tabs switch correctly and display appropriate content

#### Test Case 1.3: Diagnose Validate Feed Button Issue
- **Objective**: Determine why the Validate Feed button isn't working and why no console logs appear
- **Steps**:
  1. Inspect the direct-validation-core.js file to verify event listener setup
  2. Check if the button ID matches what the code is looking for
  3. Add temporary console logs to track execution flow
  4. Click the Validate Feed button and observe console
- **Expected Result**: Identify why event listeners aren't firing or logs aren't appearing

#### Test Case 1.4: DOM Structure Verification
- **Objective**: Verify the DOM structure matches what the code expects
- **Steps**:
  1. Inspect the HTML structure of the Validate Feed button
  2. Compare with the selectors used in direct-validation-core.js
  3. Check for any CSS issues that might be preventing clicks
- **Expected Result**: Identify any mismatches between DOM structure and code expectations

### Phase 2: Fix Validation Process

#### Test Case 2.1: Event Listener Registration
- **Objective**: Ensure event listeners are properly registered for the Validate Feed button
- **Steps**:
  1. Modify direct-validation-core.js if needed to correctly target the button
  2. Add explicit console logs at each step of the validation process
  3. Test the button click again
- **Expected Result**: Console logs appear showing the validation process flow

#### Test Case 2.2: Data Extraction and Validation
- **Objective**: Verify feed data is correctly extracted and validated
- **Steps**:
  1. Check direct-validation-data.js functionality
  2. Ensure getTableData() correctly extracts data from the preview table
  3. Verify validateFeedData() properly identifies issues
- **Expected Result**: Feed data is correctly extracted and validated

#### Test Case 2.3: Tab Switching
- **Objective**: Ensure proper tab switching to the validation history tab
- **Steps**:
  1. Verify direct-validation-tabs.js functionality
  2. Check switchToValidationTab() implementation
  3. Test tab switching manually and through code
- **Expected Result**: Validation tab is correctly activated after validation

### Phase 3: Validation Results Display

#### Test Case 3.1: History Table Updates
- **Objective**: Ensure validation results appear in the history table
- **Steps**:
  1. Check direct-validation-history.js functionality
  2. Verify updateValidationHistory() correctly adds entries to the table
  3. Test with sample validation results
- **Expected Result**: New validation entries appear in the history table

#### Test Case 3.2: View Details Functionality
- **Objective**: Verify View Details button works and displays the modal
- **Steps**:
  1. Check setupViewDetailsButton() in direct-validation-history.js
  2. Verify displayValidationDetailsPopup() in direct-validation-ui.js
  3. Test clicking View Details button
- **Expected Result**: Modal popup appears with validation details

#### Test Case 3.3: Error Navigation
- **Objective**: Verify navigation from errors to feed rows
- **Steps**:
  1. Check setupRowNavigation() in direct-validation-ui.js
  2. Verify row highlighting and scrolling functionality
  3. Test clicking on error links in the modal
- **Expected Result**: Clicking error links navigates to and highlights the correct row

#### Test Case 3.4: Error Correction
- **Objective**: Verify error correction and status updates
- **Steps**:
  1. Fix errors in highlighted fields
  2. Verify errors are removed from the modal
  3. Check if validation status updates
- **Expected Result**: Fixed errors disappear from modal, validation status updates

### Phase 4: Pro Features Testing

#### Test Case 4.1: Validation History (Pro User)
- **Objective**: Verify pro users see full validation history
- **Steps**:
  1. Ensure auth_mock.js has isProUser set to true
  2. Perform multiple validations
  3. Check all history entries are visible
- **Expected Result**: All validation history entries are displayed

#### Test Case 4.2: Validation History (Free User)
- **Objective**: Verify free users see limited validation history
- **Steps**:
  1. Modify auth_mock.js to set isProUser to false
  2. Perform multiple validations
  3. Check only recent history entries are visible
- **Expected Result**: Only recent history (last 7 days) is displayed with upgrade prompts

#### Test Case 4.3: Custom Validation Rules
- **Objective**: Verify custom validation rules functionality
- **Steps**:
  1. Check if custom rules are fetched from Firestore
  2. Verify rules are applied during validation
  3. Test with both pro and free users
- **Expected Result**: Custom rules applied for pro users, upgrade prompts for free users

### Phase 5: Edge Case Testing

#### Test Case 5.1: Error Handling
- **Objective**: Verify proper error handling during validation
- **Steps**:
  1. Test validation with empty feed
  2. Test with malformed data
  3. Verify error messages are displayed correctly
- **Expected Result**: Appropriate error messages shown for different error conditions

#### Test Case 5.2: Large Feed Performance
- **Objective**: Test performance with large feeds
- **Steps**:
  1. Load a CSV with >1000 rows
  2. Perform validation
  3. Monitor performance and memory usage
- **Expected Result**: Application remains responsive with large datasets

#### Test Case 5.3: UI Responsiveness
- **Objective**: Verify UI remains responsive during validation
- **Steps**:
  1. Start validation process
  2. Attempt to interact with UI during validation
  3. Check loading indicators appear and disappear appropriately
- **Expected Result**: UI shows loading state but remains responsive

## Testing Methodology

For each test case, we will:
1. Document the test case ID and description
2. List the steps performed
3. Record the expected result
4. Note the actual result
5. Capture relevant console logs
6. Take screenshots if applicable
7. Document any issues found
8. Provide recommendations

## Next Steps

1. **Immediate Focus**: Fix the Validate Feed button functionality
   - Diagnose why no console logs appear
   - Ensure event listeners are properly registered
   - Verify the validation process flow

2. **Secondary Focus**: Ensure validation results display correctly
   - Fix history table updates
   - Ensure View Details button works
   - Verify error navigation and correction

3. **Final Focus**: Test pro features
   - Validation history limitations
   - Custom validation rules

## Handoff Documentation

### What Was Just Tested
- Initial examination of code structure
- Identification of key modules and their relationships
- Verification that CSV upload and preview functionality works

### Current Results
- CSV upload and preview functionality works as expected
- Validate Feed button does not work
- No console logs appear when clicking the button

### Next Steps for Testing
1. Diagnose why the Validate Feed button isn't working
2. Add console logs to track execution flow
3. Fix event listener registration if needed
4. Test the complete validation process flow

## Notes for Future Agents

- Always read the module documentation (docs/refactoring/old/module_documentation.md) first to understand the system architecture
- Focus on the relationships between the refactored direct validation modules
- Pay special attention to event listener registration and DOM interactions
- Document all console logs during testing to track execution flow
- When testing pro features, remember to modify auth_mock.js to switch between pro and free user experiences