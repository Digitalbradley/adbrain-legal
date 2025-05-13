# AdBrain Feed Manager Refactoring Project

## Overview

This directory contains documentation for the AdBrain Feed Manager refactoring project. The primary goal is to refactor the monolithic `feed_manager.js` file (over 1500 lines) into smaller, more focused modules with clear separation of concerns while preserving all existing functionality.

## Important Documentation

### Project Context
- [AdBrain Feed Manager Guide](./adbrain_feed_manager_guide.md) - Overview of the project and implementation approach
- [Module Documentation](./module_documentation.md) - Comprehensive documentation of all modules in the extension
- [GMC Title Description Requirements](../instructions/GMC_Title_Description_Requirements.md) - Google Merchant Center requirements

### Refactoring Plans
- [Feed Manager Refactoring Plan](./feed_manager_refactoring_plan.md) - Comprehensive plan for refactoring the feed_manager.js file
- [Error Handling Improvements](./error_handling_improvements.md) - Detailed plan for content-type validation

### Testing Results
- [Front End Testing Results](./front_end_testing_results.md) - Results of front-end testing including content-type validation

### Progress Tracking
- [Refactoring Progress and Next Steps](./refactoring_progress_and_next_steps.md) - Current status and next steps for the refactoring project

## Key Files to Examine

Before starting any refactoring work, you should examine these key files:

1. `src/popup/feed_manager.js` - The file to be refactored
2. `src/popup/content_type_validator.js` - Content type validation module
3. `src/popup/direct-validation-*.js` files - Handle the "Validate Feed" functionality
4. `src/popup/popup.html` - Main HTML file
5. `src/popup/popup.css` - Main CSS file
6. `src/popup/script_loader.js` - Handles script loading order

## Instructions for New Agents

1. **Read the Documentation**: Start by reading the documentation files listed above to understand the project context, current implementation, and refactoring goals.

2. **Examine the Current Implementation**: Look at the key files to understand how the current implementation works, especially how `feed_manager.js` interacts with other modules.

3. **Review the Refactoring Plan**: Carefully review the [Feed Manager Refactoring Plan](./feed_manager_refactoring_plan.md) to understand the proposed module structure and implementation strategy.

4. **Check Current Progress**: Review the [Refactoring Progress and Next Steps](./refactoring_progress_and_next_steps.md) to see what has been accomplished and what needs to be done next.

5. **Make Incremental Changes**: Implement changes in small, testable increments. After each change, test thoroughly to ensure functionality is preserved.

6. **Document Your Work**: Update the [Refactoring Progress and Next Steps](./refactoring_progress_and_next_steps.md) file with what you've accomplished and what the next steps should be.

7. **Create Subtasks**: When requested, create a new subtask in code mode with a summary of what needs to be done next. Do NOT create a new file for this.

## Critical Requirements

1. **Preserve Existing Functionality**: The refactoring must preserve all existing functionality exactly as it is. Users should not notice any difference in how the feed is displayed, how editable cells work, or how validation results are presented.

2. **Maintain Compatibility**: Ensure that the refactored code works with existing modules, especially the direct-validation modules that handle the "Validate Feed" functionality.

3. **Test Thoroughly**: Test each change thoroughly to ensure no regression in functionality.

## Development Workflow

1. **Understand**: Read documentation and examine code
2. **Plan**: Decide on the next incremental change
3. **Implement**: Make the change
4. **Test**: Verify functionality is preserved
5. **Document**: Update progress tracking
6. **Repeat**: Move to the next incremental change

Remember: The primary goal is to improve the code architecture while ensuring the user experience remains unchanged.