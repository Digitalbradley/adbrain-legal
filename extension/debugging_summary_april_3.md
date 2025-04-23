# Debugging Summary: Validation Panel Issue (April 3, 2025)

## Goal

Fix the bug where editing an editable field (specifically `title` or `description`) in the feed preview table does not remove the corresponding error/warning entry from the floating validation panel. This was identified as a regression after refactoring `popup.js` into manager classes.

## Initial Problem Analysis (`refactoring_debug_plan.md`)

*   The core issue was identified as a mismatch between the visual row index (`data-row` attribute in the table) and the `rowIndex` provided by the validator (used in the panel's `data-row` attribute).
*   The `FeedManager` was passing the visual row index, while the `ValidationUIManager` was expecting the validator's row index to find and remove the issue item.

## Debugging Steps & Attempts

1.  **OfferId Mapping:**
    *   **Action:** Modified `FeedManager` to store an `offerId`-to-visual-`rowIndex` map and pass `offerId` to `ValidationUIManager.markIssueAsFixed`. Modified `ValidationUIManager` to store an `offerId`-to-validator-`rowIndex` map and use the passed `offerId` to look up the correct validator `rowIndex` for removal. Added `offerId` to mock issues in `lib/gmc/api.js`.
    *   **Result:** Issue persisted. Logs indicated `markIssueAsFixed` was still failing to find the element.

2.  **Dependency Injection & Listener Debugging:**
    *   **Action:** Added detailed logging to `markIssueAsFixed` and `monitorFieldForFix`. Found that `markIssueAsFixed` wasn't being called at all initially. Identified a circular dependency issue in `src/popup/popup.js` where managers were instantiated in the wrong order, preventing `FeedManager` from getting a reference to `ValidationUIManager`.
    *   **Action:** Refactored manager instantiation in `popup.js` using a shared `managers` object, populated after all instances were created, and setting cross-references explicitly.
    *   **Result:** The "manager not available" error was resolved. `markIssueAsFixed` was now called correctly when fixing the **title** field, and the title warning was successfully removed from the panel. However, fixing the **description** field still failed to remove its warning.

3.  **Mock Data Correction (Description):**
    *   **Action:** Updated mock data generation in `lib/gmc/api.js` to include warnings for descriptions shorter than 90 characters.
    *   **Result:** Description warnings correctly appeared in the panel, but removal still failed when the description was fixed.

4.  **Event Listener Investigation:**
    *   **Hypothesis:** An old event listener (e.g., for 'title') might not be removed correctly and could be firing when the 'description' field is edited, passing the wrong field name ('title') to `markIssueAsFixed`.
    *   **Action:** Refactored `monitorFieldForFix` in `FeedManager` to take the `field` element directly, get `actualFieldName` from `field.dataset.field`, and use robust listener management (`_fixListener` property) to ensure only one listener is active and uses the correct field name.
    *   **Result:** Issue persisted for description. Logs confirmed `markIssueAsFixed` was *still* receiving `fieldName`='title' when the description was fixed, despite the code changes.
    *   **Action (Diagnostic):** Temporarily removed the `debounce` wrapper around the event handler in `monitorFieldForFix`.
    *   **Result:** Issue persisted.
    *   **Action (Diagnostic):** Added a specific log inside `checkAndNotify` just before calling `markIssueAsFixed` to confirm the value of `actualFieldName`.
    *   **Result:** User confirmed the issue still persists (description warning not removed). The logs showed `fieldName`='title' being passed to `markIssueAsFixed`.

## Current Status

*   The core logic for mapping `offerId` to the correct validator `rowIndex` seems functional.
*   The dependency injection between managers in `popup.js` is corrected.
*   Mock data generation includes `offerId` and checks for both title and description length.
*   **Fixing the `title` field correctly removes its warning from the panel.**
*   **Fixing the `description` field *fails* to remove its warning.** Logs consistently show that `ValidationUIManager.markIssueAsFixed` receives `fieldName`='title' in this scenario, even though the code in `FeedManager.monitorFieldForFix` appears to correctly determine and pass `actualFieldName`='description'.

## Next Steps for Investigation

The root cause appears to be related to the event handling for the description field, specifically why the `actualFieldName` variable seems to have the incorrect value ('title') within the `checkAndNotify` function's execution context when triggered by an input event on the description field.

1.  **Re-examine Listener Scope/Closure:** Deeply investigate the scope and closure within `FeedManager.monitorFieldForFix` and its inner `checkAndNotify` function. Is there any way `actualFieldName` could be captured incorrectly from a previous execution context related to the title field?
2.  **Event Delegation:** Consider an alternative approach using event delegation. Attach a single 'input' listener to the table body (`tbody`) instead of individual fields. Inside the listener, check `event.target` to identify the specific `.editable-field` that was changed, get its `data-field` and parent row's `data-offer-id`, perform the length check, and call `markIssueAsFixed`. This avoids attaching/detaching listeners dynamically during navigation.
3.  **Verify Element Selection:** Double-check the DOM structure and the selectors used in `navigateToRow` and `monitorFieldForFix` to ensure the correct `field` element is consistently being targeted, especially for the description.

## Relevant Files for Context

*   `src/popup/feed_manager.js`: Contains `navigateToRow` and `monitorFieldForFix` (event listener logic).
*   `src/popup/validation_ui_manager.js`: Contains `markIssueAsFixed` (issue removal logic) and `setupRowNavigation`.
*   `src/popup/popup.js`: Contains manager instantiation and dependency injection logic.
*   `lib/gmc/api.js`: Contains mock data generation (`generateMockValidationResults`).
*   `refactoring_debug_plan.md`: Original plan document.