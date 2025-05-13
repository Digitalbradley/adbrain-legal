# FeedCoordinator Refactoring Plan

## Overview

This document outlines the plan for refactoring the FeedManager into a FeedCoordinator that focuses solely on orchestration responsibilities. This refactoring is part of the ongoing effort to improve the architecture of the AdBrain Feed Manager extension by breaking down the monolithic codebase into smaller, more focused modules.

## Current Status

The following modules have already been extracted from the original FeedManager:

1. **CSVParser**: Handles CSV parsing, validation, and error detection
2. **StatusManager**: Manages the feed status UI area
3. **FeedDisplayManager**: Handles display-related functionality

The current FeedManager still contains coordination logic mixed with some remaining display and parsing responsibilities. The goal is to transform it into a pure coordinator that orchestrates the interactions between these extracted modules.

## Refactoring Goals

1. **Separation of Concerns**: Ensure the FeedCoordinator focuses solely on coordination
2. **Clean Interfaces**: Establish clear interfaces between the FeedCoordinator and other modules
3. **Improved Testability**: Make the code more testable by reducing dependencies
4. **Better Error Handling**: Address the error handling issues identified in testing
5. **Maintainability**: Make the code easier to understand and maintain

## Detailed Refactoring Steps

### 1. Analyze Current FeedManager Responsibilities

#### Coordination Responsibilities (to keep in FeedCoordinator)
- Initializing and managing other modules
- Handling file input events
- Coordinating the feed preview workflow
- Managing the validation process
- Coordinating between validation and display modules
- Error handling and coordination

#### Display/Parsing Responsibilities (to remove or delegate)
- Any remaining CSV parsing logic (should be delegated to CSVParser)
- Any remaining display logic (should be delegated to FeedDisplayManager)
- Any remaining status update logic (should be delegated to StatusManager)

### 2. Design FeedCoordinator Interface

#### Constructor
```javascript
/**
 * @param {object} elements - DOM element references
 * @param {object} managers - Other manager instances
 */
constructor(elements, managers) {
    // Initialize with required elements and managers
}
```

#### Public Methods
```javascript
/**
 * Initializes the FeedCoordinator
 */
initialize() {
    // Set up event listeners and initialize modules
}

/**
 * Handles the preview button click event
 */
async handlePreview() {
    // Coordinate the preview process
}

/**
 * Gets the corrected table data from the display manager
 * @returns {Array<object>} The corrected table data
 */
getCorrectedTableData() {
    // Delegate to display manager
}

/**
 * Gets the applied corrections from the display manager
 * @returns {Array<object>} The applied corrections
 */
getAppliedCorrections() {
    // Delegate to display manager
}

/**
 * Navigates to a specific row in the feed preview
 * @param {number} rowIndex - The row index to navigate to
 * @param {string} fieldToFocus - The field to focus within the row
 */
navigateToRow(rowIndex, fieldToFocus) {
    // Delegate to display manager
}
```

### 3. Implementation Plan

#### Step 1: Create FeedCoordinator Class
- Create a new file `src/popup/feed_coordinator.js`
- Implement the basic class structure with constructor and initialization

#### Step 2: Move Coordination Logic
- Move coordination logic from FeedManager to FeedCoordinator
- Ensure all dependencies are properly injected
- Implement proper error handling

#### Step 3: Update References
- Update all references to FeedManager in other files
- Ensure backward compatibility where needed

#### Step 4: Clean Up and Test
- Remove the old FeedManager class or mark it as deprecated
- Test the new implementation thoroughly
- Document any issues and their resolutions

### 4. Testing Strategy

#### Unit Tests
- Test initialization and constructor
- Test coordination methods
- Test error handling
- Test interactions with other modules

#### Integration Tests
- Test the entire workflow from CSV upload to validation
- Test interactions between FeedCoordinator and other modules
- Test error handling across module boundaries

## Implementation Details

### FeedCoordinator Class Structure

```javascript
// Import modules
import { CSVParser } from './csv_parser.js';
import { StatusManager } from './status_manager.js';
import { FeedDisplayManager } from './feed_display_manager.js';

/**
 * Coordinates feed operations between different modules.
 * Acts as the central orchestrator for feed loading, parsing, display, and validation.
 */
class FeedCoordinator {
    /**
     * @param {object} elements - DOM element references
     * @param {HTMLInputElement} elements.fileInput
     * @param {HTMLButtonElement} elements.previewButton
     * @param {HTMLElement} elements.previewContentContainer
     * @param {object} managers - Other manager instances
     * @param {LoadingManager} managers.loadingManager
     * @param {ErrorManager} managers.errorManager
     * @param {SearchManager} managers.searchManager
     * @param {MonitoringSystem} managers.monitor
     * @param {ValidationUIManager} managers.validationUIManager
     * @param {StatusManager} [managers.statusManager] - Optional, will be created if not provided
     * @param {FeedDisplayManager} [managers.displayManager] - Optional, will be created if not provided
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers;
        
        // Validate required elements and managers
        this.validateDependencies();
        
        // Initialize modules if not provided
        this.initializeModules();
        
        // Initialize the coordinator
        this.initialize();
    }
    
    /**
     * Validates that all required dependencies are provided
     * @private
     */
    validateDependencies() {
        // Check required elements
        if (!this.elements.fileInput || !this.elements.previewButton || !this.elements.previewContentContainer) {
            console.error('FeedCoordinator: Required DOM elements missing!', this.elements);
        }
        
        // Check required managers
        if (!this.managers.loadingManager || !this.managers.errorManager || !this.managers.searchManager || !this.managers.monitor) {
            console.error('FeedCoordinator: Required managers missing!', this.managers);
        }
        
        // Just log a warning if validationUIManager is missing
        if (!this.managers.validationUIManager) {
            console.warn('FeedCoordinator: ValidationUIManager not available during initialization. Will attempt to use it if it becomes available later.');
        }
    }
    
    /**
     * Initializes required modules if not provided
     * @private
     */
    initializeModules() {
        // Initialize StatusManager if not provided
        if (!this.managers.statusManager) {
            console.log('[DEBUG] Creating StatusManager instance');
            this.managers.statusManager = new StatusManager();
        }
        
        // Initialize FeedDisplayManager if not provided
        if (!this.managers.displayManager) {
            console.log('[DEBUG] Creating FeedDisplayManager instance');
            this.managers.displayManager = new FeedDisplayManager(this.elements, this.managers);
            
            // Set up event listeners for editable fields
            this.managers.displayManager.setupEditableFieldListeners(this.handleFieldEdit.bind(this));
        }
    }
    
    /**
     * Initializes the FeedCoordinator
     */
    initialize() {
        console.log('[DEBUG] Initializing FeedCoordinator...');
        
        // Check if ContentTypeValidator is available
        this.checkContentTypeValidator();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    // Additional methods will be implemented here
}

export { FeedCoordinator };
```

### Key Methods to Implement

1. **setupEventListeners**: Set up event listeners for file input and preview button
2. **handlePreview**: Coordinate the preview process
3. **readFileAsText**: Read the file as text
4. **handleFieldEdit**: Handle editable field events
5. **getCorrectedTableData**: Get corrected table data from display manager
6. **getAppliedCorrections**: Get applied corrections from display manager
7. **navigateToRow**: Navigate to a specific row in the feed preview

## Potential Challenges and Mitigations

### 1. Complex Dependencies
- **Challenge**: The FeedManager has many dependencies and is referenced by multiple modules
- **Mitigation**: Use dependency injection and ensure all dependencies are properly documented

### 2. Event Handling
- **Challenge**: Ensuring event handlers are properly transferred or maintained
- **Mitigation**: Carefully map all event handlers and ensure they are properly bound to the new FeedCoordinator

### 3. Backward Compatibility
- **Challenge**: Ensuring the refactored code works with existing code without breaking changes
- **Mitigation**: Maintain the same public API where possible and provide clear documentation for any changes

### 4. Error Handling
- **Challenge**: Improving error handling while maintaining the user experience
- **Mitigation**: Implement structured error handling with clear error messages and proper delegation to the ErrorManager

## Timeline and Milestones

1. **Analysis and Design**: 1 day
   - Analyze current FeedManager responsibilities
   - Design FeedCoordinator interface
   - Document the plan

2. **Implementation**: 2-3 days
   - Create FeedCoordinator class
   - Move coordination logic
   - Update references

3. **Testing**: 1-2 days
   - Create unit tests
   - Create integration tests
   - Document issues and resolutions

4. **Documentation and Cleanup**: 1 day
   - Update documentation
   - Clean up code
   - Finalize the refactoring

## Conclusion

This refactoring plan provides a structured approach to transforming the FeedManager into a FeedCoordinator that focuses solely on coordination responsibilities. By following this plan, we can improve the architecture of the AdBrain Feed Manager extension, making it more maintainable, testable, and robust.