/**
 * Handles fetching and applying user-defined custom validation rules to feed data.
 */
class CustomRuleValidator {
    /**
     * @param {object} managers - Shared manager instances.
     * @param {AuthManager} managers.authManager
     * @param {ErrorManager} managers.errorManager
     * @param {MonitoringSystem} managers.monitor
     */
    constructor(managers) {
        this.managers = managers;
        this.customRules = []; // Cache for loaded rules

        if (!this.managers.authManager) throw new Error("CustomRuleValidator requires AuthManager.");
        // ErrorManager and Monitor are optional but recommended
        if (!this.managers.errorManager) console.warn("CustomRuleValidator: ErrorManager not provided.");
        if (!this.managers.monitor) console.warn("CustomRuleValidator: MonitoringSystem not provided.");

        console.log("CustomRuleValidator instantiated.");
    }

    /**
     * Fetches the enabled custom validation rules for the current user from Firestore.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of rule objects.
     */
    async fetchCustomRules() {
        console.log("Fetching custom rules...");
        this.customRules = []; // Clear cache

        const userId = this.managers.authManager?.getAuthState()?.firebaseUserId;
        if (!userId) {
            console.log("Cannot fetch custom rules: User not authenticated with Firebase.");
            return [];
        }

        // Ensure Firestore is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error("Cannot fetch custom rules: Firestore SDK not available.");
             // Attempt to access via background page as a fallback?
             try {
                 const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                 if (!bg || !bg.firebase || !bg.firebase.firestore) {
                     throw new Error("Firestore not found on background page either.");
                 }
                 window.firebase = bg.firebase;
                 console.warn("Firestore SDK accessed via background page for fetchCustomRules.");
             } catch (bgError) {
                 console.error("Error accessing Firestore SDK via background page:", bgError);
                 this.managers.errorManager?.showError("Internal Error: Cannot connect to database service for custom rules.");
                 return [];
             }
        }


        try {
            const db = firebase.firestore();
            const rulesCollectionRef = db.collection('users').doc(userId).collection('customRules');
            // Fetch only enabled rules, potentially order by priority later if needed
            const querySnapshot = await rulesCollectionRef.where('enabled', '==', true).get();

            if (!querySnapshot.empty) {
                querySnapshot.forEach(doc => {
                    this.customRules.push({ id: doc.id, ...doc.data() });
                });
                console.log(`Fetched ${this.customRules.length} enabled custom rules.`);
            } else {
                console.log("No enabled custom rules found for this user.");
            }
             this.managers.monitor?.logOperation('fetch_custom_rules', 'success', { userId, count: this.customRules.length });
             return this.customRules;

        } catch (error) {
            console.error("Error fetching custom rules:", error);
            this.managers.errorManager?.showError("Failed to load custom validation rules.");
            this.managers.monitor?.logError(error, 'fetchCustomRules');
            return []; // Return empty on error
        }
    }

    /**
     * Validates feed data against the loaded custom rules.
     * @param {Array<object>} feedData - The array of product data objects.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of issue objects found by custom rules.
     */
    async validate(feedData) {
        console.log("Applying custom validation rules...");
        const customIssues = [];

        if (!this.customRules || this.customRules.length === 0) {
            console.log("No custom rules loaded or defined to apply.");
            return customIssues; // No rules to apply
        }
        if (!feedData || feedData.length === 0) {
             console.log("No feed data provided for custom validation.");
            return customIssues;
        }


        // TODO: Implement the core validation logic here.
        // This will involve iterating through feedData and applying each rule in this.customRules.
        // Need to handle different rule types (length, pattern, required_words, etc.)
        // and parameters stored within each rule object.
        // Remember to add relevant details to the issue objects (rowIndex, field, type, message, ruleId, priority).

        console.warn("Custom rule validation logic not yet implemented.");
        this.managers.monitor?.logOperation('apply_custom_rules', 'skipped', { reason: 'not_implemented', ruleCount: this.customRules.length, productCount: feedData.length });


        // Placeholder: Return empty array for now
        return customIssues;
    }

    // --- Helper methods for specific rule types (to be implemented) ---

    _validateLength(value, params) {
        // Placeholder
        return true;
    }

    _validatePattern(value, params) {
        // Placeholder
        return true;
    }

    _validateRequiredWords(value, params) {
         // Placeholder
        return true;
    }

     _validateForbiddenWords(value, params) {
         // Placeholder
        return true;
    }

}

// Make globally available if needed
window.CustomRuleValidator = CustomRuleValidator;