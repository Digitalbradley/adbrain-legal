/**
 * Defines the data structures used in Firestore for the AdBrain Feed Manager Pro features.
 * Based on monetization_implementation_plan.md
 */

/**
 * Represents the structure for a user's profile data in Firestore.
 * Path: users/{userId}/profile
 */
const UserProfileModel = {
    email: '', // string
    name: '', // string
    createdAt: null, // Firestore Timestamp
    subscriptionStatus: 'free', // "free" or "pro"
    subscriptionExpiry: null, // Firestore Timestamp or null
    // Add other relevant profile fields as needed
};

/**
 * Represents the structure for a single validation history entry in Firestore.
 * Path: users/{userId}/validationHistory/{validationId}
 */
const ValidationHistoryEntryModel = {
    timestamp: null, // Firestore Server Timestamp
    feedId: '', // string (e.g., filename or a generated ID)
    totalProducts: 0, // number
    validProducts: 0, // number
    issues: [], // array of issue objects (structure TBD, but likely similar to current validation results)
    summary: { // Summary counts for quick display
        titleIssues: 0, // number
        descriptionIssues: 0, // number
        otherIssues: 0 // number
    },
    // Add other relevant history fields (e.g., source 'gmc' or 'local')
};

/**
 * Represents the structure for user-specific preferences in Firestore.
 * Path: users/{userId}/preferences
 */
const UserPreferencesModel = {
    // Example preference:
    emailNotificationsEnabled: true, // boolean
    // Add other preferences as needed (e.g., default validation settings)
};

/**
 * Represents the structure for scheduled validation configuration.
 * This might be part of UserPreferencesModel or a separate subcollection.
 * Example Path: users/{userId}/scheduledValidationConfig/{configId} (or within preferences)
 */
const ScheduledValidationConfigModel = {
    enabled: false, // boolean
    frequency: 'daily', // 'daily', 'weekly'
    dayOfWeek: null, // number (0-6 for Sunday-Saturday) if frequency is 'weekly'
    feedUrl: '', // string (URL to fetch for validation) - Or reference to stored feed?
    notifyEmail: true, // boolean
    lastRunTimestamp: null, // Firestore Timestamp
};

// Note: These are just structural definitions for planning and implementation reference.
// They are not classes to be instantiated directly in this form.
// Actual implementation might use classes or simply ensure objects adhere to these shapes.

// Make available if needed (though likely just for reference)
// window.UserProfileModel = UserProfileModel;
// window.ValidationHistoryEntryModel = ValidationHistoryEntryModel;
// window.UserPreferencesModel = UserPreferencesModel;
// window.ScheduledValidationConfigModel = ScheduledValidationConfigModel;