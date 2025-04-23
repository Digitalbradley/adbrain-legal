# Plan: Refactor for Real GMC Integration

Based on analysis of the codebase (`manifest.json`, `src/`, `lib/`) as of 2025-04-01.

## Current State Summary:

*   **Authentication:** Multiple conflicting approaches exist (`localStorage` in `login.js` & `api.js`, `chrome.storage.local` in `background/auth.js`, `chrome.identity` called from multiple places). The core `GMCApi` (`lib/gmc/api.js`) is currently hardcoded to `testMode = true`, bypassing real auth. The most robust approach (`src/background/auth.js`) seems unused.
*   **Validation:** Primarily client-side. `src/lib/analyzer.js` checks title/description length and price format within the popup UI. `lib/gmc/validator.js` checks for required/recommended fields and URL/price formats locally when the "Validate Feed" button is clicked. No actual GMC API validation call is being made in the main workflow.
*   **UI:** A feature-rich UI exists in `popup.html`/`popup.js` (opened in a new tab after login) for loading, previewing, editing, searching, and exporting feeds, along with displaying results from the client-side validation checks.
*   **Background:** The service worker (`background.js`) mainly fetches auth tokens on demand.

## Proposed Plan:

**Phase 1: Unify Authentication**
*Goal: Implement a single, robust authentication flow using `chrome.identity` and `chrome.storage.local`.*
1.  **Consolidate Auth Logic:** Choose one place to manage authentication (e.g., adapt `src/background/auth.js` or integrate its logic into `lib/gmc/api.js`).
2.  **Consistent Usage:** Update `login.js`, `popup.js`, and `background.js` to use the consolidated auth logic.
3.  **Use `chrome.storage`:** Store tokens exclusively using `chrome.storage.local`. Remove `localStorage` usage for tokens.
4.  **Enable Real Auth:** Remove the `testMode = true` flag in `lib/gmc/api.js`.
5.  **Pass Token:** Ensure the valid token is reliably passed to and used by `GMCApi` for API calls.
6.  **(Optional UX):** Improve the login flow (e.g., update popup directly instead of opening a new tab).

**Phase 2: Implement Real GMC Validation**
*Goal: Replace client-side checks with actual GMC API validation.*
1.  **Confirm API Endpoint:** Research and implement the correct Content API endpoint for validation (e.g., `products.insert` with `dryRun=true` or `productstatuses`) in `lib/gmc/api.js`.
2.  **Call API:** Modify `lib/gmc/validator.js` to call the real validation method in `gmcApi` instead of only local checks.
3.  **Parse Response:** Adapt code to handle the actual API response format.
4.  **Update UI:** Ensure `popup.js` clearly displays results from *real* GMC validation, distinguishing them from any remaining useful client-side checks.

**Phase 3: Code Cleanup**
*Goal: Remove redundant code and improve consistency.*
1.  **Remove Redundancy:** Delete unused auth/validation code, conflicting storage methods.
2.  **Error Handling:** Standardize error handling.
3.  **Refactor:** Review interactions between classes.

## Mermaid Diagram:

```mermaid
graph TD
    subgraph Phase 1: Authentication
        P1_1[1.1: Consolidate Auth Logic] --> P1_2[1.2: Consistent Usage];
        P1_2 --> P1_3[1.3: Use chrome.storage];
        P1_3 --> P1_4[1.4: Remove Test Mode];
        P1_4 --> P1_5[1.5: Pass Token to API];
        P1_5 --> P1_6[1.6: (Optional) Improve Login UX];
    end

    subgraph Phase 2: Real GMC Validation
        P2_1[2.1: Implement API Endpoint] --> P2_2[2.2: Call API in Validator];
        P2_2 --> P2_3[2.3: Parse Real Response];
        P2_3 --> P2_4[2.4: Update UI Display];
    end

    subgraph Phase 3: Cleanup
        P3_1[3.1: Remove Unused Code] --> P3_2[3.2: Consistent Error Handling];
        P3_2 --> P3_3[3.3: Refactor Interactions];
    end

    P1_6 --> P2_1;
    P2_4 --> P3_1;

    style Phase 1 fill:#f9f,stroke:#333,stroke-width:2px
    style Phase 2 fill:#ccf,stroke:#333,stroke-width:2px
    style Phase 3 fill:#cfc,stroke:#333,stroke-width:2px