/**
 * Manages the Settings tab UI and functionality, including scheduled validation configuration.
 */
class SettingsManager {
    /**
     * @param {object} elements - DOM element references for the settings tab.
     * @param {object} managers - Shared manager instances.
     * @param {AuthManager} managers.authManager
     * @param {ErrorManager} managers.errorManager
     * @param {LoadingManager} managers.loadingManager
     * @param {MonitoringSystem} managers.monitor
     */
    constructor(elements, managers) {
        this.elements = elements; // Will contain refs to settings form elements
        this.managers = managers;

        if (!this.managers.authManager) throw new Error("SettingsManager requires AuthManager.");
        if (!this.managers.errorManager) console.warn("SettingsManager: ErrorManager not provided.");
        if (!this.managers.loadingManager) console.warn("SettingsManager: LoadingManager not provided.");

        // Get references to specific settings elements
        this.elements.enableScheduleToggle = document.getElementById('enableSchedule');
        this.elements.scheduleOptionsDiv = document.getElementById('scheduleOptions');
        this.elements.scheduleFrequencySelect = document.getElementById('scheduleFrequency');
        this.elements.weeklyOptionsDiv = document.getElementById('weeklyOptions');
        this.elements.scheduleDayOfWeekSelect = document.getElementById('scheduleDayOfWeek');
        this.elements.scheduleTimeSelect = document.getElementById('scheduleTime');
        this.elements.enableEmailNotificationsToggle = document.getElementById('enableEmailNotifications');
        this.elements.saveScheduleButton = document.getElementById('saveSchedule');
        this.elements.scheduleUpgradePrompt = document.getElementById('scheduleUpgradePrompt');
        this.elements.settingsSection = document.querySelector('.schedule-config'); // The main container div for schedule

        // --- Custom Rule Elements ---
        this.elements.customRulesSection = document.getElementById('customRulesSection');
        this.elements.customRulesListDiv = document.getElementById('customRulesList');
        this.elements.addNewRuleBtn = document.getElementById('addNewRuleBtn');
        this.elements.ruleEditorForm = document.getElementById('ruleEditorForm');
        this.elements.ruleIdInput = document.getElementById('ruleId'); // Hidden input
        this.elements.ruleNameInput = document.getElementById('ruleNameInput');
        this.elements.ruleFieldSelect = document.getElementById('ruleFieldSelect');
        this.elements.ruleTypeSelect = document.getElementById('ruleTypeSelect');
        this.elements.ruleParametersContainer = document.getElementById('ruleParametersContainer');
        this.elements.ruleEnabledToggle = document.getElementById('ruleEnabledToggle');
        this.elements.saveRuleBtn = document.getElementById('saveRuleBtn');
        this.elements.testRuleBtn = document.getElementById('testRuleBtn');
        this.elements.cancelRuleBtn = document.getElementById('cancelRuleBtn');
        this.elements.customRulesUpgradePrompt = document.getElementById('customRulesUpgradePrompt');
        // --------------------------

        console.log("SettingsManager instantiated.");
    }

    /**
     * Initializes the settings tab, sets up listeners, and loads initial data.
     */
    async initialize() {
        console.log("Initializing SettingsManager...");
        this.setupEventListeners();
        await this.applyFeatureGating(); // Check Pro status and gate sections
        if (this.isPro) { // Only load data if user is Pro
             await this.loadSettings(); // Load schedule settings
             await this.loadCustomRules(); // Load custom rules
        }
        this.updateOptionsVisibility(); // Update schedule options visibility
    }

    /**
     * Checks Pro status and enables/disables the settings section accordingly.
     */
    async applyFeatureGating() {
        const authState = this.managers.authManager.getAuthState();
        this.isPro = authState.isProUser; // Store pro status for later use

        console.log(`SettingsManager: User isPro = ${this.isPro}`);

        if (!this.elements.settingsSection || !this.elements.scheduleUpgradePrompt) {
             console.error("Settings section or upgrade prompt element not found.");
             return;
        }

        if (this.isPro) {
            // User is Pro: Enable controls, hide prompt
            this.elements.settingsSection.classList.remove('feature-locked');
            this.elements.scheduleUpgradePrompt.style.display = 'none';
            // Ensure all relevant inputs/buttons within are enabled (might need more specific selectors)
            this.elements.settingsSection.querySelectorAll('input, select, button').forEach(el => el.disabled = false);

        } else {
            // User is Free: Disable controls, show prompt
            this.elements.settingsSection.classList.add('feature-locked');
            this.elements.scheduleUpgradePrompt.style.display = 'block';
             // Ensure all relevant inputs/buttons within are disabled
            this.elements.settingsSection.querySelectorAll('input, select, button').forEach(el => {
                 // Don't disable the upgrade button itself if it's inside the section
                 if (!el.classList.contains('upgrade-button')) {
                     el.disabled = true;
                 }
            });
             // Explicitly disable the main toggle if not pro
             if(this.elements.enableScheduleToggle) this.elements.enableScheduleToggle.disabled = true;
        }
         // Ensure initial visibility is correct after enabling/disabling schedule toggle
         this.updateOptionsVisibility();

        // --- Gate Custom Rules Section ---
        if (!this.elements.customRulesSection || !this.elements.customRulesUpgradePrompt) {
            console.error("Custom rules section or upgrade prompt element not found.");
            // Don't return, gating might still apply to schedule section
        } else {
            if (this.isPro) {
                this.elements.customRulesSection.classList.remove('feature-locked');
                this.elements.customRulesUpgradePrompt.style.display = 'none';
                this.elements.customRulesSection.querySelectorAll('button, input, select').forEach(el => el.disabled = false);
            } else {
                this.elements.customRulesSection.classList.add('feature-locked');
                this.elements.customRulesUpgradePrompt.style.display = 'block';
                this.elements.customRulesSection.querySelectorAll('button, input, select').forEach(el => {
                    if (!el.classList.contains('upgrade-button')) {
                        el.disabled = true;
                    }
                });
                // Ensure editor form is hidden if not pro
                this.hideRuleEditor();
            }
        }
        // --------------------------------

    }


    /**
     * Sets up event listeners for the settings controls.
     */
    setupEventListeners() {
        if (!this.elements.enableScheduleToggle || !this.elements.scheduleFrequencySelect || !this.elements.saveScheduleButton) {
            console.error("SettingsManager: Could not find all required elements for event listeners.");
            return;
        }

        // Toggle visibility of schedule options
        this.elements.enableScheduleToggle.addEventListener('change', () => {
            this.updateOptionsVisibility();
        });

        // Toggle visibility of weekly options
        this.elements.scheduleFrequencySelect.addEventListener('change', () => {
            this.updateOptionsVisibility();
        });

        // Save button
        this.elements.saveScheduleButton.addEventListener('click', async () => {
            await this.saveSettings();
        });

        // Handle upgrade button click (optional, could be handled globally)
        const upgradeButton = this.elements.scheduleUpgradePrompt?.querySelector('.upgrade-button');
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => {
                console.log("Upgrade button clicked in settings.");
                // TODO: Implement navigation or action for upgrade
                alert("Upgrade functionality not yet implemented.");
            });
        }

        // --- Custom Rules Listeners ---
        this.elements.addNewRuleBtn?.addEventListener('click', () => this.showRuleEditor());
        this.elements.cancelRuleBtn?.addEventListener('click', () => this.hideRuleEditor());
        this.elements.saveRuleBtn?.addEventListener('click', async () => await this.saveRule());
        this.elements.testRuleBtn?.addEventListener('click', () => alert("Rule testing not implemented yet.")); // Placeholder for test button
        this.elements.ruleTypeSelect?.addEventListener('change', (e) => this.updateRuleParametersUI(e.target.value)); // Update params UI on type change

        // Listener for edit/delete buttons in the list is added dynamically in displayCustomRules
        // -----------------------------

        console.log("SettingsManager event listeners set up.");
    }

    /**
     * Updates the visibility of schedule options based on the current selections.
     */
    updateOptionsVisibility() {
        const scheduleEnabled = this.elements.enableScheduleToggle?.checked && !this.elements.enableScheduleToggle?.disabled;
        const frequency = this.elements.scheduleFrequencySelect?.value;

        if (this.elements.scheduleOptionsDiv) {
            this.elements.scheduleOptionsDiv.style.display = scheduleEnabled ? 'block' : 'none';
        }
        if (this.elements.weeklyOptionsDiv) {
            this.elements.weeklyOptionsDiv.style.display = (scheduleEnabled && frequency === 'weekly') ? 'block' : 'none';
        }
    }

    /**
     * Loads the current schedule settings from Firestore.
     */
    async loadSettings() {
        console.log("Loading schedule settings from Firestore...");
        this.managers.loadingManager?.showLoading('Loading settings...');

        const userId = this.managers.authManager.getAuthState().firebaseUserId;
        if (!userId) {
            console.error("Cannot load settings: No user ID.");
            this.managers.loadingManager?.hideLoading();
            return;
        }

        try {
            // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                 throw new Error("Firestore SDK not available.");
            }
            const db = firebase.firestore();
            // Assuming settings are stored directly in the user's document or a dedicated 'settings' subcollection
            // Let's assume they are in userDoc.scheduledValidation based on plan example
            const userDocRef = db.collection('users').doc(userId);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const scheduleData = userData.scheduledValidation || {}; // Get schedule data or empty object

                console.log("Loaded schedule settings:", scheduleData);

                // Populate UI elements
                if (this.elements.enableScheduleToggle) {
                    this.elements.enableScheduleToggle.checked = scheduleData.enabled || false;
                }
                if (this.elements.scheduleFrequencySelect) {
                    this.elements.scheduleFrequencySelect.value = scheduleData.frequency || 'daily';
                }
                if (this.elements.scheduleDayOfWeekSelect) {
                    this.elements.scheduleDayOfWeekSelect.value = scheduleData.dayOfWeek !== undefined ? String(scheduleData.dayOfWeek) : '1'; // Default Monday
                }
                 if (this.elements.scheduleTimeSelect) {
                    this.elements.scheduleTimeSelect.value = scheduleData.time || '00:00'; // Default 00:00 UTC
                }
                if (this.elements.enableEmailNotificationsToggle) {
                    this.elements.enableEmailNotificationsToggle.checked = scheduleData.notificationsEnabled || false;
                }

                // Update visibility based on loaded settings
                this.updateOptionsVisibility();

            } else {
                console.log("User document not found, using default settings.");
                // Ensure UI reflects default state
                 this.updateOptionsVisibility();
            }
             this.managers.monitor?.logOperation('load_schedule_settings', 'success', { userId });

        } catch (error) {
            console.error("Error loading schedule settings:", error);
            this.managers.errorManager?.showError("Failed to load settings.");
            this.managers.monitor?.logError(error, 'loadSettings');
        } finally {
            this.managers.loadingManager?.hideLoading();
        }
    }

    /**
     * Saves the current schedule settings to Firestore.
     */
    async saveSettings() {
         if (!this.isPro) {
             this.managers.errorManager?.showError("Scheduled validation is a Pro feature. Please upgrade.");
             return;
         }

        console.log("Saving schedule settings to Firestore...");
        this.managers.loadingManager?.showLoading('Saving settings...');

        const userId = this.managers.authManager.getAuthState().firebaseUserId;
        if (!userId) {
            console.error("Cannot save settings: No user ID.");
            this.managers.errorManager?.showError("Authentication error. Cannot save settings.");
            this.managers.loadingManager?.hideLoading();
            return;
        }

        try {
             // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                 throw new Error("Firestore SDK not available.");
            }
            const db = firebase.firestore();
            const userDocRef = db.collection('users').doc(userId);

            const settingsToSave = {
                scheduledValidation: { // Store under a specific key
                    enabled: this.elements.enableScheduleToggle?.checked || false,
                    frequency: this.elements.scheduleFrequencySelect?.value || 'daily',
                    dayOfWeek: this.elements.scheduleFrequencySelect?.value === 'weekly'
                                ? parseInt(this.elements.scheduleDayOfWeekSelect?.value, 10)
                                : null, // Store day only if weekly
                    time: this.elements.scheduleTimeSelect?.value || '00:00',
                    notificationsEnabled: this.elements.enableEmailNotificationsToggle?.checked || false,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }
            };

            console.log("Settings to save:", settingsToSave);

            // Use update with merge: true to avoid overwriting other user data
            await userDocRef.set(settingsToSave, { merge: true });

            console.log("Schedule settings saved successfully.");
            this.managers.errorManager?.showSuccess("Settings saved!", 2000);
            this.managers.monitor?.logOperation('save_schedule_settings', 'success', { userId });

        } catch (error) {
            console.error("Error saving schedule settings:", error);
            this.managers.errorManager?.showError("Failed to save settings.");
            this.managers.monitor?.logError(error, 'saveSettings');
        } finally {
            this.managers.loadingManager?.hideLoading();
        }
    }

   // --- Custom Rule Management Methods ---

   async loadCustomRules() {
       if (!this.isPro) return; // Should already be gated, but double-check
       console.log("Loading custom rules...");
       if (!this.elements.customRulesListDiv) {
            console.error("Custom rules list element not found.");
            return;
       }
       this.elements.customRulesListDiv.innerHTML = '<p>Loading rules...</p>';

       const userId = this.managers.authManager?.getAuthState()?.firebaseUserId;
       if (!userId) {
           this.elements.customRulesListDiv.innerHTML = '<p>Please sign in to load custom rules.</p>';
           return;
       }

       // Ensure Firestore is available (using helper or direct check)
       if (!(await this._ensureFirestore())) {
            this.elements.customRulesListDiv.innerHTML = '<p>Error connecting to database.</p>';
            return;
       }

       try {
           const db = firebase.firestore();
           const rulesCollectionRef = db.collection('users').doc(userId).collection('customRules');
           const querySnapshot = await rulesCollectionRef.orderBy('name', 'asc').get(); // Sort by name

           const rules = [];
           if (!querySnapshot.empty) {
               querySnapshot.forEach(doc => {
                   rules.push({ id: doc.id, ...doc.data() });
               });
           }
           this.displayCustomRules(rules);
            this.managers.monitor?.logOperation('load_custom_rules', 'success', { userId, count: rules.length });

       } catch (error) {
           console.error("Error loading custom rules:", error);
           this.elements.customRulesListDiv.innerHTML = '<p>Error loading rules.</p>';
           this.managers.errorManager?.showError("Failed to load custom rules.");
           this.managers.monitor?.logError(error, 'loadCustomRules');
       }
   }

   displayCustomRules(rules) {
       if (!this.elements.customRulesListDiv) return;

       if (!rules || rules.length === 0) {
           this.elements.customRulesListDiv.innerHTML = '<p>No custom rules defined yet.</p>';
           return;
       }

       // Simple list display for now
       let listHtml = '<ul>';
       rules.forEach(rule => {
           listHtml += `
               <li data-rule-id="${rule.id}">
                   <span class="rule-name">${rule.name || 'Unnamed Rule'}</span>
                   <span class="rule-status ${rule.enabled ? 'enabled' : 'disabled'}">(${rule.enabled ? 'Enabled' : 'Disabled'})</span>
                   <button class="edit-rule-btn modern-button tiny" data-rule-id="${rule.id}">Edit</button>
                   <button class="delete-rule-btn modern-button tiny danger" data-rule-id="${rule.id}">&times;</button>
               </li>
           `;
       });
       listHtml += '</ul>';
       this.elements.customRulesListDiv.innerHTML = listHtml;

       // Add event listeners for edit/delete buttons within the list
       this.elements.customRulesListDiv.querySelectorAll('.edit-rule-btn').forEach(btn => {
           btn.addEventListener('click', (e) => this.showRuleEditor(e.currentTarget.dataset.ruleId));
       });
       this.elements.customRulesListDiv.querySelectorAll('.delete-rule-btn').forEach(btn => {
           btn.addEventListener('click', (e) => this.deleteRule(e.currentTarget.dataset.ruleId));
       });
   }

   showRuleEditor(ruleId = null) {
       if (!this.isPro || !this.elements.ruleEditorForm) return;
       console.log(`Showing rule editor for rule ID: ${ruleId || 'new'}`);

       // TODO: If ruleId is provided, load rule data from Firestore and populate form
       if (ruleId) {
           alert("Editing existing rules not implemented yet.");
           // Placeholder: Load data for ruleId and populate form fields
           // this.elements.ruleIdInput.value = ruleId;
           // this.elements.ruleNameInput.value = loadedRule.name;
           // ... etc ...
       } else {
           // Reset form for new rule
           // Check if reset method exists before calling
           if (typeof this.elements.ruleEditorForm.reset === 'function') {
                this.elements.ruleEditorForm.reset();
           } else {
                // Manual reset for non-form elements or as fallback
                this.elements.ruleNameInput.value = '';
                this.elements.ruleFieldSelect.value = 'title';
                this.elements.ruleTypeSelect.value = '';
                this.elements.ruleEnabledToggle.checked = true;
                // Clear dynamic params container
                this.elements.ruleParametersContainer.innerHTML = '';
           }
            this.elements.ruleIdInput.value = ''; // Ensure hidden ID is cleared
       }

       this.elements.ruleEditorForm.style.display = 'block';
   }

   hideRuleEditor() {
       if (!this.elements.ruleEditorForm) return;
       this.elements.ruleEditorForm.style.display = 'none';
       // Optionally reset form fields here as well
       // if (typeof this.elements.ruleEditorForm.reset === 'function') { this.elements.ruleEditorForm.reset(); }
   }

   async saveRule() {
       if (!this.isPro) return;
      console.log("Attempting to save custom rule...");
      this.managers.loadingManager?.showLoading('Saving rule...');

      const ruleId = this.elements.ruleIdInput.value; // Check if editing or adding new
      const isNewRule = !ruleId;

      try {
          // 1. Get User ID & Ensure Firestore
          const userId = this.managers.authManager?.getAuthState()?.firebaseUserId;
          if (!userId) throw new Error("User not authenticated.");
          if (!(await this._ensureFirestore())) throw new Error("Database connection failed.");

          // 2. Get common form data
          const ruleName = this.elements.ruleNameInput.value.trim();
          const field = this.elements.ruleFieldSelect.value;
          const type = this.elements.ruleTypeSelect.value;
          const enabled = this.elements.ruleEnabledToggle.checked;

          // 3. Basic Validation
          if (!ruleName) throw new Error("Rule Name is required.");
          if (!field) throw new Error("Apply to Field is required.");
          if (!type) throw new Error("Rule Type is required.");

          // 4. Get type-specific parameters
          const parameters = this._getRuleParametersFromForm(type);
          if (parameters === null) { // Indicates an error getting parameters
               throw new Error("Invalid or missing parameters for the selected rule type.");
          }


          // 5. Construct rule data object
          const ruleData = {
              name: ruleName,
              field: field,
              type: type,
              parameters: parameters,
              enabled: enabled,
              // Add created/modified timestamps
              modified: firebase.firestore.FieldValue.serverTimestamp(),
          };
          if (isNewRule) {
              ruleData.created = firebase.firestore.FieldValue.serverTimestamp();
          }

          console.log("Rule data to save:", ruleData);

          // 6. Save to Firestore
          const db = firebase.firestore();
          const rulesCollectionRef = db.collection('users').doc(userId).collection('customRules');

          if (isNewRule) {
              const docRef = await rulesCollectionRef.add(ruleData);
              console.log(`New rule added with ID: ${docRef.id}`);
               this.managers.monitor?.logOperation('save_custom_rule', 'success_add', { userId, ruleId: docRef.id });
          } else {
              const docRef = rulesCollectionRef.doc(ruleId);
              // Use set with merge to update or create if somehow deleted between edit and save
              await docRef.set(ruleData, { merge: true });
              console.log(`Rule updated with ID: ${ruleId}`);
               this.managers.monitor?.logOperation('save_custom_rule', 'success_update', { userId, ruleId });
          }

          this.managers.errorManager?.showSuccess("Rule saved successfully!", 2000);
          this.hideRuleEditor();
          await this.loadCustomRules(); // Refresh the list

      } catch (error) {
          console.error("Error saving custom rule:", error);
          this.managers.errorManager?.showError(`Failed to save rule: ${error.message}`);
          this.managers.monitor?.logError(error, 'saveRule');
      } finally {
           this.managers.loadingManager?.hideLoading();
      }
   }

  /**
   * Helper method to extract rule parameters from the dynamic form section.
   * @param {string} ruleType - The selected rule type.
   * @returns {object|null} The parameters object or null if validation fails.
   */
  _getRuleParametersFromForm(ruleType) {
      const params = {};
      try {
          switch (ruleType) {
              case 'length':
                  const minLength = document.getElementById('ruleParamMinLength')?.value;
                  const maxLength = document.getElementById('ruleParamMaxLength')?.value;
                  // Basic validation: ensure they are numbers if provided
                  params.min = minLength !== '' ? parseInt(minLength, 10) : null;
                  params.max = maxLength !== '' ? parseInt(maxLength, 10) : null;
                  if ((params.min !== null && isNaN(params.min)) || (params.max !== null && isNaN(params.max))) {
                       console.error("Invalid length parameters provided."); return null;
                  }
                   if ((params.min !== null && params.min < 0) || (params.max !== null && params.max < 0)) {
                       console.error("Length parameters cannot be negative."); return null;
                   }
                   if (params.min !== null && params.max !== null && params.min > params.max) {
                        console.error("Min length cannot be greater than max length."); return null;
                   }
                  break;
              case 'pattern':
                  params.pattern = document.getElementById('ruleParamPattern')?.value.trim();
                  params.flags = document.getElementById('ruleParamFlags')?.value.trim() || ''; // Default to empty flags
                  if (!params.pattern) { console.error("Pattern is required for pattern rule."); return null; }
                   // Optional: Validate regex pattern? Can be complex.
                  break;
              case 'required_words':
              case 'forbidden_words':
                  const wordsText = document.getElementById('ruleParamWords')?.value.trim();
                  params.words = wordsText ? wordsText.split(',').map(w => w.trim()).filter(w => w) : [];
                  params.caseSensitive = document.getElementById('ruleParamCaseSensitive')?.checked || false;
                  if (params.words.length === 0) { console.error("At least one word is required for word rules."); return null; }
                  break;
              default:
                   console.log("No parameters needed for this rule type or type unknown.");
                  break; // No parameters needed or type not handled yet
          }
          return params;
      } catch (e) {
           console.error("Error getting parameters from form:", e);
           return null; // Indicate error
      }
  }


    async deleteRule(ruleId) {
       if (!this.isPro || !ruleId) return;
       if (!confirm(`Are you sure you want to delete rule ID: ${ruleId}?`)) return;

      console.log(`Attempting to delete rule ID: ${ruleId}`);
      this.managers.loadingManager?.showLoading('Deleting rule...');

      try {
          // 1. Get User ID & Ensure Firestore
          const userId = this.managers.authManager?.getAuthState()?.firebaseUserId;
          if (!userId) throw new Error("User not authenticated.");
          if (!(await this._ensureFirestore())) throw new Error("Database connection failed.");

          // 2. Delete document
          const db = firebase.firestore();
          const ruleDocRef = db.collection('users').doc(userId).collection('customRules').doc(ruleId);
          await ruleDocRef.delete();

          console.log(`Rule ${ruleId} deleted successfully.`);
          this.managers.errorManager?.showSuccess("Rule deleted.", 1500);
          this.managers.monitor?.logOperation('delete_custom_rule', 'success', { userId, ruleId });

          // 3. Refresh the list
          await this.loadCustomRules();

      } catch (error) {
          console.error(`Error deleting rule ${ruleId}:`, error);
          this.managers.errorManager?.showError(`Failed to delete rule: ${error.message}`);
          this.managers.monitor?.logError(error, 'deleteRule');
      } finally {
          this.managers.loadingManager?.hideLoading();
      }
   }

   // Helper to ensure Firestore is available (similar to previous checks)
   async _ensureFirestore() {
       if (typeof firebase !== 'undefined' && firebase.firestore) {
           return true;
       }
       try {
           const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
           if (!bg || !bg.firebase || !bg.firebase.firestore) {
               throw new Error("Firestore not found on background page either.");
           }
           window.firebase = bg.firebase;
           console.warn("Firestore SDK accessed via background page.");
           return true;
       } catch (bgError) {
           console.error("Error accessing Firestore SDK via background page:", bgError);
           this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
           return false;
       }
   }

  /**
   * Updates the rule parameters section of the editor form based on the selected rule type.
   * @param {string} ruleType - The selected rule type (e.g., 'length', 'pattern').
   */
  updateRuleParametersUI(ruleType) {
      if (!this.elements.ruleParametersContainer) return;
      this.elements.ruleParametersContainer.innerHTML = ''; // Clear existing params

      console.log(`Updating parameters UI for rule type: ${ruleType}`);

      // TODO: Implement dynamic form generation based on ruleType
      switch (ruleType) {
          case 'length':
              this.elements.ruleParametersContainer.innerHTML = `
                  <div class="form-group">
                      <label for="ruleParamMinLength">Min Length:</label>
                      <input type="number" id="ruleParamMinLength" min="0">
                  </div>
                  <div class="form-group">
                      <label for="ruleParamMaxLength">Max Length:</label>
                      <input type="number" id="ruleParamMaxLength" min="0">
                  </div>
              `;
              break;
          case 'pattern':
               this.elements.ruleParametersContainer.innerHTML = `
                  <div class="form-group">
                      <label for="ruleParamPattern">Regex Pattern:</label>
                      <input type="text" id="ruleParamPattern" placeholder="e.g., ^[A-Z0-9]+$">
                  </div>
                   <div class="form-group">
                       <label for="ruleParamFlags">Regex Flags (optional):</label>
                       <input type="text" id="ruleParamFlags" placeholder="e.g., i">
                   </div>
              `;
              break;
          case 'required_words':
          case 'forbidden_words':
               this.elements.ruleParametersContainer.innerHTML = `
                  <div class="form-group">
                      <label for="ruleParamWords">Words (comma-separated):</label>
                      <textarea id="ruleParamWords" rows="3"></textarea>
                  </div>
                   <div class="form-group">
                       <label><input type="checkbox" id="ruleParamCaseSensitive"> Case Sensitive</label>
                   </div>
              `;
              break;
          // Add cases for other rule types
          default:
              // No parameters needed or type not selected
              break;
      }
  }


  // --- End Custom Rule Management Methods ---

}

// Make globally available if needed, or handle via modules/imports in popup.js
window.SettingsManager = SettingsManager;