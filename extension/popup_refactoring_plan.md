# Refactoring Plan for src/popup/popup.js

## 1. Introduction

The `src/popup/popup.js` file has grown significantly (over 1400 lines) and combines multiple responsibilities, including core popup logic, UI management, background communication, utility functions, and extensive mock implementations for development/debugging. This complexity makes the file difficult to maintain, debug, and understand, potentially leading to errors.

**Goal:** Refactor `popup.js` into smaller, more focused modules (ideally under 500 lines each) to improve separation of concerns, maintainability, and testability. This refactoring will be performed in small, incremental, testable steps.

## 2. Analysis of Current `popup.js` Structure

The file currently handles:

*   **Utility Functions:** `debounce`, `updateCharCount`.
*   **`PopupManager` Class (Core Logic):**
    *   Initialization and Dependency Injection for various UI managers.
    *   Asynchronous setup (`initializePopup`).
    *   Background script communication (`sendMessageToBackground`).
    *   UI Element Setup (`setupElements`).
    *   Event Listener Setup (`setupEventListeners`).
    *   Tab Management (`setupTabs`).
    *   Core Event Handling (`handleDropdownChange`, `triggerGMCValidation`, `verifyOrAuthenticateGMC`, `handleLogout`).
*   **Mock Implementations (Large Block):** Definitions for mock `firebase`, `GMCApi`, `GMCValidator`, `AuthManager`, `StatusBarManager`, `ValidationUIManager`, `FeedManager`, `BulkActionsManager`, `SettingsManager`, `MonitoringSystem`.
*   **Initialization Code:** Instantiation of `PopupManager`.

## 3. Proposed New Structure

We will break down `popup.js` into the following files:

1.  **`src/popup/popup.js` (Refactored):**
    *   Contains the `PopupManager` class.
    *   Focuses on:
        *   Instantiating and managing dependencies between *real* manager modules (imported).
        *   Core initialization flow (`initializePopup`).
        *   Top-level event listener setup (`setupEventListeners`), potentially delegating complex handlers.
        *   Orchestrating communication with the background script (potentially via an imported messaging module).
    *   Imports utilities, mocks (conditionally), and potentially handler modules.
2.  **`src/popup/popup_utils.js`:**
    *   Contains general utility functions (`debounce`, `updateCharCount`).
    *   Exports these functions.
3.  **`src/popup/popup_mocks.js`:**
    *   Contains *all* mock implementations currently embedded in `popup.js`.
    *   Exports a single initialization function (e.g., `initializeMocks`) that sets up all mocks on the `window` object or returns a mocks object. This allows mocks to be loaded conditionally.
4.  **`src/popup/popup_event_handlers.js` (Potential - Phase 3):**
    *   If `PopupManager` remains too complex after Phases 1 & 2.
    *   Contains functions for handling specific complex events (e.g., `handleGmcAuth`, `handleFirebaseLogin`, `handleLogout`).
    *   Exported functions would be imported and called by `PopupManager`.
5.  **`src/popup/popup_message_handler.js` (Potential - Phase 3):**
    *   If `PopupManager` remains too complex.
    *   Contains the `sendMessageToBackground` logic, potentially abstracting the mock fallbacks.
    *   Exports the message sending function.

```mermaid
graph TD
    subgraph "Original Structure"
        A[popup.js (1400+ lines)] --> B(Utils)
        A --> C(PopupManager Core)
        A --> D(Event Handlers)
        A --> E(Messaging Logic)
        A --> F(Mock Implementations)
    end

    subgraph "Proposed Structure (Phase 1 & 2)"
        G[popup.js (Refactored)] -- imports --> H[popup_utils.js]
        G -- imports --> I[popup_mocks.js]
        G -- instantiates/uses --> J(Other Managers: Feed, Validation, Settings...)

        I --> K(Mock Firebase)
        I --> L(Mock Auth)
        I --> M(Mock GMC API)
        I --> N(...)
    end

    subgraph "Proposed Structure (Phase 3 - Optional)"
         G -- imports/uses --> O[popup_event_handlers.js]
         G -- imports/uses --> P[popup_message_handler.js]
    end

    style F fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#f9f,stroke:#333,stroke-width:2px
```

## 4. Incremental Refactoring Plan

**Phase 1: Extract Utilities**

1.  **Create File:** Create `src/popup/popup_utils.js`.
2.  **Move Code:** Cut `debounce` and `updateCharCount` functions from `popup.js` and paste into `popup_utils.js`. Export them (e.g., `export { debounce, updateCharCount };`).
3.  **Update Usage:**
    *   In `popup.js`, add `import { debounce, updateCharCount } from './popup_utils.js';` at the top.
    *   Remove the original function definitions.
    *   Ensure `debounce` is used correctly where needed.
    *   For `updateCharCount`, either ensure it's still assigned to `window` if called directly from HTML (`window.updateCharCount = updateCharCount;`) or refactor HTML `oninput` handlers to call it via the `PopupManager` instance or another relevant manager (like `FeedManager`). Assigning to `window` is simpler for now.
4.  **Test:**
    *   Reload the extension.
    *   Verify character counters in editable fields (like in Feed Preview) still update correctly.
    *   Verify any UI elements using `debounce` (e.g., search input) still function as expected.

**Phase 2: Extract Mocks**

1.  **Create File:** Create `src/popup/popup_mocks.js`.
2.  **Move Code:**
    *   Identify the entire block of mock definitions in `popup.js` (starting around `if (typeof MonitoringSystem === 'undefined')` or `if (typeof firebase === 'undefined')` and ending after the last mock class definition, likely before the `PopupManager` instantiation).
    *   Cut this entire block and paste it into `popup_mocks.js`.
3.  **Encapsulate Mocks:** In `popup_mocks.js`, wrap the entire pasted code block inside an exported function:
    ```javascript
    export function initializeMocks() {
        console.log("Initializing Mocks...");

        // --- Paste ALL mock definitions here ---
        if (typeof MonitoringSystem === 'undefined') {
            class MonitoringSystem { /* ... */ }
            window.MonitoringSystem = MonitoringSystem;
        }
        if (typeof firebase === 'undefined') {
            window.firebase = { /* ... */ };
            window.firebase.firestore.FieldValue = { /* ... */ };
            window.firebase.firestore.Timestamp = { /* ... */ };
        }
        if (typeof GMCApi === 'undefined') {
            window.GMCApi = class GMCApi { /* ... */ };
        }
        // ... etc for all other mocks (GMCValidator, AuthManager, ...)

        console.log("Mocks Initialized.");
    }
    ```
4.  **Import and Call Mocks:**
    *   In `popup.js`, add `import { initializeMocks } from './popup_mocks.js';` at the top.
    *   Call `initializeMocks();` as the *very first line* of executable code in `popup.js` (before the `PopupManager` class definition or instantiation) to ensure mocks are globally available before any other code runs.
5.  **Test:**
    *   Reload the extension.
    *   Verify the "Initializing Mocks..." console log appears.
    *   Verify the popup loads and operates correctly *using the mocks*. Check:
        *   Initial auth status displayed by `StatusBarManager`.
        *   Ability to "connect" to mock GMC.
        *   Ability to "validate" using mock `GMCValidator`.
        *   Ability to load mock "Validation History".
        *   Absence of errors related to undefined mock classes/objects.

**Phase 3: Refactor PopupManager (Optional, based on size after Phase 2)**

1.  **Analyze:** Check the line count and complexity of `popup.js`. If still > 500-600 lines or overly complex, proceed.
2.  **Identify Target:** Choose a specific responsibility (e.g., Tab Management, Auth Event Handling, Message Sending).
3.  **Create File:** Create the corresponding file (e.g., `src/popup/popup_tab_manager.js`).
4.  **Move Logic:** Extract the relevant functions/logic (e.g., `setupTabs`, `handleTabClick`) into the new file and export them.
5.  **Update Usage:** Import the new module in `popup.js` and modify `PopupManager` to use the imported functions/module, removing the old internal logic.
6.  **Test:** Reload the extension and thoroughly test the specific functionality that was moved (e.g., clicking tabs, logging in/out).
7.  **Repeat:** Repeat steps 2-6 for other responsibilities if further refactoring is needed.

## 5. Testing Strategy

*   **After Each Phase/Sub-step:** Reload the unpacked extension in the browser.
*   **Core Functionality Checks:**
    *   Does the popup open without console errors?
    *   Does the initial UI state (auth status, buttons) look correct (based on mocks)?
    *   Can you interact with core elements (file input, preview, validate, auth buttons, tabs, history refresh)?
*   **Specific Checks (based on phase):**
    *   Phase 1: Check character counters, debounced inputs.
    *   Phase 2: Check all functions relying on mocks (auth, validation, history loading). Ensure "Initializing Mocks..." log appears.
    *   Phase 3: Check the specific functionality moved (e.g., tab switching works, logout works).
*   **Browser DevTools:** Monitor the console for errors and check network requests (though most should be mocked).

This incremental approach minimizes risk and allows for verification at each stage.