/**
 * Manages the overall authentication state, coordinating between
 * GMC OAuth and Firebase Authentication.
 */
 class AuthManager { // Remove export keyword
     /**
      * @param {object} config - Configuration object.
     * @param {GMCApi} config.gmcApi - Instance of GMCApi.
     * @param {object} [config.firebaseAuth] - Firebase Auth instance (to be added later).
     */
    constructor(config = {}) {
        if (!config.gmcApi) {
            throw new Error("AuthManager requires a GMCApi instance.");
        }
        this.gmcApi = config.gmcApi;
        this.firebaseAuth = config.firebaseAuth || null; // Placeholder for Firebase Auth

        // --- State Properties ---
        this.gmcAuthenticated = this.gmcApi.isAuthenticated;
        this.firebaseUser = null; // Placeholder for Firebase user object
        
        console.log("AuthManager instantiated");
        this.isProUser = false; // Placeholder for Pro status
        this.lastError = null;

        // --- Event Listeners ---
        // TODO: Add listener for GMCApi state changes if GMCApi provides one
        // this.gmcApi.onAuthStateChanged(this.handleGmcStateChange.bind(this));

        // Add listener for Firebase Auth state changes
        // Ensure firebase.auth is available before adding listener
        if (firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(this.handleFirebaseStateChange.bind(this));
            console.log('AuthManager: Added Firebase onAuthStateChanged listener.');
        } else {
            console.warn('AuthManager: Firebase Auth SDK not available at initialization. Listener not added.');
            // Consider adding a mechanism to retry adding the listener later if needed
        }


        console.log('AuthManager initialized.');
    }

    /**
     * Returns the overall authentication status.
     * @returns {object} - Object containing gmcAuthenticated, firebaseAuthenticated, isProUser.
     */
    getAuthState() {
        return {
            gmcAuthenticated: this.gmcAuthenticated,
            firebaseAuthenticated: !!this.firebaseUser,
            isProUser: this.isProUser,
            gmcMerchantId: this.gmcApi.merchantId,
            firebaseUserId: this.firebaseUser?.uid || null,
            lastError: this.lastError
        };
    }

    /**
     * Initiates the GMC authentication flow.
     * @returns {Promise<boolean>} - True if GMC authentication is successful.
     */
    async authenticateGmc() {
        this.lastError = null;
        try {
            const success = await this.gmcApi.authenticate();
            this.gmcAuthenticated = success;
            // TODO: Potentially trigger Firebase sign-in/linking here if desired
            return success;
        } catch (error) {
            console.error("AuthManager: GMC Authentication failed", error);
            this.lastError = error;
            this.gmcAuthenticated = false;
            throw error; // Re-throw for UI handling
        }
    }

    /**
     * Handles GMC logout.
     * @returns {Promise<void>}
     */
    async logoutGmc() {
         this.lastError = null;
        try {
            await this.gmcApi.logout();
            this.gmcAuthenticated = false;
            // Note: This currently ONLY logs out of GMC.
            // A full logout might need to sign out of Firebase too.
        } catch (error) {
             console.error("AuthManager: GMC Logout failed", error);
             this.lastError = error;
             // Even on error, assume logged out locally
             this.gmcAuthenticated = false;
             throw error; // Re-throw for UI handling
        }
    }

    // --- Placeholder Firebase Methods (To be implemented later) ---

    /**
     * Initiates Firebase sign-in (e.g., with Google Popup).
     * @returns {Promise<firebase.auth.UserCredential>}
     */
    async signInWithFirebase() {
        this.lastError = null;
        console.log("AuthManager: Attempting Firebase sign-in...");
        try {
            // Ensure firebase.auth is available (loaded via background.js)
            if (!firebase || !firebase.auth) {
                throw new Error("Firebase Auth SDK not loaded.");
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            // TODO: Add scopes if needed, e.g., provider.addScope('profile'); provider.addScope('email');
            const userCredential = await firebase.auth().signInWithPopup(provider);
            console.log("AuthManager: Firebase sign-in successful", userCredential.user?.uid);
            this.firebaseUser = userCredential.user; // State updated by onAuthStateChanged listener
            // Pro status check will be triggered by the onAuthStateChanged listener
            // await this.checkProStatus(); // No need to call directly here
            return userCredential;
        } catch (error) {
            console.error("AuthManager: Firebase Sign-in failed", error);
            this.lastError = error;
            this.firebaseUser = null; // Ensure user is null on error
            this.isProUser = false;
             // Handle specific errors if needed (e.g., popup closed)
            if (error.code === 'auth/popup-closed-by-user') {
                 console.log("AuthManager: Firebase sign-in popup closed by user.");
                 // Don't necessarily throw an error, maybe return null or a specific status
                 return null; // Or re-throw if the caller needs to know
            }
            throw error; // Re-throw for UI handling
        }
    }

    /**
     * Signs the user out of Firebase.
     * @returns {Promise<void>}
     */
    async signOutFirebase() {
         this.lastError = null;
         console.log("AuthManager: Attempting Firebase sign-out...");
        try {
            // Ensure firebase.auth is available
            if (!firebase || !firebase.auth) {
                throw new Error("Firebase Auth SDK not loaded.");
            }
            await firebase.auth().signOut();
            console.log("AuthManager: Firebase sign-out successful.");
            // State (firebaseUser, isProUser) will be updated by onAuthStateChanged listener
            // this.firebaseUser = null;
            // this.isProUser = false;
        } catch (error) {
            console.error("AuthManager: Firebase Sign-out failed", error);
            this.lastError = error;
            // Even on error, assume logged out locally for safety?
            // The listener should handle the actual state based on Firebase.
            throw error; // Re-throw for UI handling
        }
    }

    /**
     * Checks the user's Pro subscription status (likely involves Firestore).
     * @returns {Promise<boolean>} - The current pro status after checking.
     */
    async checkProStatus() {
        // Reset status before check
        this.isProUser = false;

        if (!this.firebaseUser) {
            console.log("AuthManager.checkProStatus: No Firebase user logged in.");
            return false;
        }

        // Ensure Firestore SDK is available
        if (!firebase || !firebase.firestore) {
             console.error("AuthManager.checkProStatus: Firestore SDK not loaded.");
             // Throwing an error might be too disruptive, just log and return false
             // throw new Error("Firestore SDK not loaded.");
             return false;
        }

        const userId = this.firebaseUser.uid;
        console.log(`AuthManager.checkProStatus: Checking status for user ${userId}...`);

        try {
            // Assuming 'users/{userId}' document holds the profile/subscription info
            // If the instructions *strictly* meant a collection 'profile', the path would be different,
            // e.g., firebase.firestore().collection('users').doc(userId).collection('profile').doc('status').get()
            // but using the simpler document path first.
            const userDocRef = firebase.firestore().collection('users').doc(userId);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log("AuthManager.checkProStatus: User document data:", userData);
                // Check for the 'subscriptionStatus' field
                if (userData && userData.subscriptionStatus === 'pro') {
                    this.isProUser = true;
                } else {
                     console.log("AuthManager.checkProStatus: User document exists but subscriptionStatus is not 'pro'. Status:", userData?.subscriptionStatus);
                     this.isProUser = false; // Explicitly set to false
                }
            } else {
                console.log(`AuthManager.checkProStatus: No user document found for user ${userId}.`);
                this.isProUser = false; // No document means not pro
            }
        } catch (error) {
            console.error(`AuthManager.checkProStatus: Error fetching user document for ${userId}:`, error);
            this.isProUser = false; // Assume not pro on error
            // Optionally store this error in this.lastError?
            // this.lastError = new Error(`Failed to check pro status: ${error.message}`);
            // Re-throwing might disrupt the auth flow, so just return false for now.
            // throw error;
        }

        console.log(`AuthManager.checkProStatus: Final Pro status for ${userId}: ${this.isProUser}`);
        return this.isProUser;
    }

    // --- Internal State Handlers ---

    handleGmcStateChange(isAuthenticated) {
        console.log("AuthManager: GMC state changed:", isAuthenticated);
        this.gmcAuthenticated = isAuthenticated;
        // TODO: Notify listeners of state change
    }

    async handleFirebaseStateChange(user) { // Make async to await checkProStatus
        console.log("AuthManager: Firebase auth state changed. User:", user ? user.uid : 'null');
        const previousUserId = this.firebaseUser?.uid;
        this.firebaseUser = user;

        if (user) {
            // User is signed in.
            this.isProUser = false; // Reset pro status until checked
            this.lastError = null; // Clear previous auth errors
            console.log("AuthManager: User signed in, checking Pro status...");
            try {
                await this.checkProStatus(); // Check subscription status
                console.log(`AuthManager: Pro status checked. Is Pro: ${this.isProUser}`);
            } catch (error) {
                console.error("AuthManager: Error during checkProStatus after auth state change:", error);
                // Keep isProUser as false
                this.lastError = error; // Store the error related to status check
            }
        } else {
            // User is signed out.
            console.log("AuthManager: User signed out.");
            this.isProUser = false; // Reset pro status on sign out
            // Optionally clear GMC state too if a full logout is intended?
            // Or handle that separately via a combined logout function.
        }

        // TODO: Notify listeners/UI about the overall state change
        // This might involve a custom event system or calling update functions directly
        // Example: document.dispatchEvent(new CustomEvent('authStateChanged', { detail: this.getAuthState() }));

        // If the user ID changed (login/logout), log it
        if (previousUserId !== this.firebaseUser?.uid) {
            console.log(`AuthManager: Firebase User ID changed from ${previousUserId} to ${this.firebaseUser?.uid}`);
        }
    }
}

// Make globally available for now (consider modules later)
window.AuthManager = AuthManager;