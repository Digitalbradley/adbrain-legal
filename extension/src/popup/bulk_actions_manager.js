/**
 * Manages the Bulk Actions section UI and functionality,
 * including feed export and correction templates.
 */
class BulkActionsManager {
    /**
     * @param {object} elements - DOM element references for the bulk actions section.
     * @param {object} managers - Shared manager instances.
     * @param {AuthManager} managers.authManager
     * @param {FeedManager} managers.feedManager
     * @param {ErrorManager} managers.errorManager
     * @param {LoadingManager} managers.loadingManager
     * @param {MonitoringSystem} managers.monitor
     */
    constructor(elements, managers) {
        this.elements = elements; // Contains refs to export buttons, template list, etc.
        this.managers = managers;
        this.isPro = false; // Track pro status locally

        if (!this.managers.authManager) throw new Error("BulkActionsManager requires AuthManager.");
        if (!this.managers.feedManager) throw new Error("BulkActionsManager requires FeedManager.");
        if (!this.managers.errorManager) console.warn("BulkActionsManager: ErrorManager not provided.");
        if (!this.managers.loadingManager) console.warn("BulkActionsManager: LoadingManager not provided.");

        // Get specific element references
        this.elements.section = document.getElementById('bulkActionsSection');
        this.elements.exportCsvBtn = document.getElementById('exportCsvBtn');
        this.elements.exportXmlBtn = document.getElementById('exportXmlBtn');
        this.elements.templatesListDiv = document.getElementById('templatesList');
        this.elements.saveCurrentBtn = document.getElementById('saveCurrentAsTemplateBtn');
        this.elements.newTemplateForm = document.getElementById('newTemplateForm');
        this.elements.templateNameInput = document.getElementById('templateNameInput');
        this.elements.saveTemplateBtn = document.getElementById('saveTemplateBtn');
        this.elements.cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
        this.elements.upgradePrompt = document.getElementById('bulkActionsUpgradePrompt');

        console.log("BulkActionsManager instantiated.");
    }

    /**
     * Initializes the manager, sets up listeners, applies gating, and loads templates.
     */
    async initialize() {
        console.log("Initializing BulkActionsManager...");
        this.setupEventListeners();
        await this.applyFeatureGating(); // Check Pro status first
        if (this.isPro) {
            await this.loadTemplates(); // Load templates if Pro
        }
    }

    /**
     * Checks Pro status and enables/disables the section accordingly.
     */
    async applyFeatureGating() {
        const authState = this.managers.authManager.getAuthState();
        this.isPro = authState.isProUser;

        console.log(`BulkActionsManager: User isPro = ${this.isPro}`);

        if (!this.elements.section || !this.elements.upgradePrompt) {
            console.error("Bulk actions section or upgrade prompt element not found.");
            return;
        }

        if (this.isPro) {
            // User is Pro: Enable controls, hide prompt
            this.elements.section.classList.remove('feature-locked');
            this.elements.upgradePrompt.style.display = 'none';
            this.elements.section.querySelectorAll('button, input').forEach(el => {
                 // Don't enable the save/cancel buttons within the hidden form initially
                 if (!this.elements.newTemplateForm?.contains(el)) {
                    el.disabled = false;
                 }
            });
        } else {
            // User is Free: Disable controls, show prompt
            this.elements.section.classList.add('feature-locked');
            this.elements.upgradePrompt.style.display = 'block';
            this.elements.section.querySelectorAll('button, input').forEach(el => {
                if (!el.classList.contains('upgrade-button')) {
                    el.disabled = true;
                }
            });
             // Ensure template form is hidden if not pro
             this.hideSaveTemplateForm();
        }
    }

    /**
     * Sets up event listeners for the bulk actions controls.
     */
    setupEventListeners() {
        // Export Buttons
        this.elements.exportCsvBtn?.addEventListener('click', () => this.handleExport('csv'));
        this.elements.exportXmlBtn?.addEventListener('click', () => this.handleExport('xml'));

        // Template Buttons
        this.elements.saveCurrentBtn?.addEventListener('click', () => this.showSaveTemplateForm());
        this.elements.cancelTemplateBtn?.addEventListener('click', () => this.hideSaveTemplateForm());
        this.elements.saveTemplateBtn?.addEventListener('click', async () => await this.saveTemplate());

        // Handle upgrade button click
        this.elements.upgradePrompt?.querySelector('.upgrade-button')?.addEventListener('click', () => {
            console.log("Upgrade button clicked in bulk actions.");
            // TODO: Implement navigation or action for upgrade
            alert("Upgrade functionality not yet implemented.");
        });

        console.log("BulkActionsManager event listeners set up.");
    }

    /**
     * Handles the feed export process.
     * @param {'csv' | 'xml'} format - The desired export format.
     */
    async handleExport(format) {
        if (!this.isPro) {
            this.managers.errorManager?.showError("Exporting feeds is a Pro feature.");
            return;
        }
        console.log(`Exporting feed as ${format}...`);
        this.managers.loadingManager?.showLoading(`Exporting as ${format.toUpperCase()}...`);

        try {
            // 1. Get potentially corrected feed data from FeedManager
            const feedData = this.managers.feedManager.getCorrectedTableData();
            if (!feedData || feedData.length === 0) {
                throw new Error("No feed data available to export.");
            }

            // 2. Convert data to the chosen format (CSV/XML)
            let exportContent;
            let contentType;
            let fileExtension = format;

            if (format === 'csv') {
                exportContent = this.convertToCSV(feedData);
                contentType = 'text/csv;charset=utf-8;';
            } else if (format === 'xml') {
                exportContent = this.convertToXML(feedData);
                contentType = 'application/xml;charset=utf-8;';
            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }

            // 3. Trigger download
            const blob = new Blob([exportContent], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `corrected_feed_${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
            document.body.appendChild(a); // Required for Firefox
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`Feed exported successfully as ${format}.`);
            this.managers.errorManager?.showSuccess(`Feed exported as ${format.toUpperCase()}.`, 2000);
            this.managers.monitor?.logOperation('export_feed', 'success', { format, itemCount: feedData.length });

            // TODO: Track export history in Firebase (as per plan)

        } catch (error) {
            console.error(`Error exporting feed as ${format}:`, error);
            this.managers.errorManager?.showError(`Export failed: ${error.message}`);
            this.managers.monitor?.logError(error, `handleExport(${format})`);
        } finally {
            this.managers.loadingManager?.hideLoading();
        }
    }

    // --- Basic Data Conversion Helpers ---

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);

        // Function to escape a single CSV field
        const escapeCsvField = (field) => {
            const stringField = String(field ?? ''); // Ensure it's a string
            if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const csvRows = [
            headers.map(escapeCsvField).join(','), // Header row
            ...data.map(row =>
                headers.map(header => escapeCsvField(row[header])).join(',')
            )
        ];
        return csvRows.join('\r\n');
    }

    convertToXML(data) {
        // Basic XML structure - requires significant enhancement for real feed formats (e.g., Google Shopping)
        if (!data || data.length === 0) return '<?xml version="1.0" encoding="UTF-8"?>\n<products/>';

        // Improved basic XML escaping
        const escapeXml = (unsafe) => {
            return String(unsafe ?? '').replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '<';
                    case '>': return '>';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '"';
                }
                return c; // Should not happen with the regex
            });
        };

        // Simple mapping - assumes flat structure and valid XML tag names from headers
        const headers = Object.keys(data[0]);
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n'; // Root element might need changing
        data.forEach(item => {
            xml += '  <product>\n'; // Item element might need changing
            headers.forEach(header => {
                // Basic check for valid XML tag name (simplistic)
                const tagName = header.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^[^a-zA-Z_]+/, '_');
                if (tagName) {
                   xml += `    <${tagName}>${escapeXml(item[header])}</${tagName}>\n`;
                }
            });
            xml += '  </product>\n';
        });
        xml += '</products>';
        return xml;
    }

    // --- Template Management ---

    showSaveTemplateForm() {
         if (!this.isPro) return; // Should be disabled anyway, but double-check
         this.elements.newTemplateForm.style.display = 'block';
         this.elements.templateNameInput.focus();
         this.elements.saveTemplateBtn.disabled = false;
         this.elements.cancelTemplateBtn.disabled = false;
    }

    hideSaveTemplateForm() {
        this.elements.newTemplateForm.style.display = 'none';
        this.elements.templateNameInput.value = ''; // Clear input
    }

    async saveTemplate() {
        if (!this.isPro) return;
        const templateName = this.elements.templateNameInput.value.trim();
        if (!templateName) {
            this.managers.errorManager?.showError("Please enter a name for the template.");
            return;
        }

        console.log(`Saving template: ${templateName}`);
        this.managers.loadingManager?.showLoading('Saving template...');

        try {
            // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                // Attempt to access via background page as a fallback
                try {
                    const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                    if (!bg || !bg.firebase || !bg.firebase.firestore) {
                        throw new Error("Firestore not found on background page either.");
                    }
                    window.firebase = bg.firebase;
                    console.warn("Firestore SDK accessed via background page for handleDeleteTemplate.");
                } catch (bgError) {
                    console.error("Error accessing Firestore SDK via background page:", bgError);
                    throw new Error("Firestore SDK not available."); // Re-throw original error
                }
            }
            // --- End Firestore Check ---
            // 1. Get current corrections from FeedManager
            const corrections = this.managers.feedManager.getAppliedCorrections();
            if (!corrections || corrections.length === 0) {
                throw new Error("No corrections have been applied to save as a template.");
            }

            // 2. Save to Firestore
            const userId = this.managers.authManager.getAuthState().firebaseUserId;
            if (!userId) throw new Error("User not authenticated.");

            // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                try {
                    const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                    if (!bg || !bg.firebase || !bg.firebase.firestore) {
                        throw new Error("Firestore not found on background page either.");
                    }
                    window.firebase = bg.firebase; // Make available globally? Risky.
                    console.warn("Firestore SDK accessed via background page for saveTemplate.");
                } catch (bgError) {
                    console.error("Error accessing Firestore SDK via background page:", bgError);
                    throw new Error("Firestore SDK not available."); // Re-throw original error
                }
            }
            // --- End Firestore Check ---

            const db = firebase.firestore();
            const templateCollectionRef = db.collection('users').doc(userId).collection('correctionTemplates');

            await templateCollectionRef.add({
                name: templateName,
                created: firebase.firestore.FieldValue.serverTimestamp(),
                corrections: corrections, // Store the correction rules/patterns
                appliedCount: 0
            });

            console.log(`Template "${templateName}" saved successfully.`);
            this.managers.errorManager?.showSuccess(`Template "${templateName}" saved.`, 2000);
            this.managers.monitor?.logOperation('save_template', 'success', { userId, templateName });

            this.hideSaveTemplateForm();
            await this.loadTemplates(); // Refresh the list

        } catch (error) {
            console.error("Error saving template:", error);
            this.managers.errorManager?.showError(`Failed to save template: ${error.message}`);
            this.managers.monitor?.logError(error, 'saveTemplate');
        } finally {
            this.managers.loadingManager?.hideLoading();
        }
    }

    async loadTemplates() {
        if (!this.isPro) {
             this.elements.templatesListDiv.innerHTML = '<p>Correction templates are a Pro feature.</p>';
             return;
        }

        console.log("Loading correction templates...");
        this.elements.templatesListDiv.innerHTML = '<p>Loading templates...</p>'; // Loading indicator

        const userId = this.managers.authManager.getAuthState().firebaseUserId;
        if (!userId) {
             this.elements.templatesListDiv.innerHTML = '<p>Please sign in to load templates.</p>';
             return;
        }

        try {
            // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                try {
                    const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                    if (!bg || !bg.firebase || !bg.firebase.firestore) {
                        throw new Error("Firestore not found on background page either.");
                    }
                    window.firebase = bg.firebase;
                    console.warn("Firestore SDK accessed via background page for loadTemplates.");
                } catch (bgError) {
                    console.error("Error accessing Firestore SDK via background page:", bgError);
                    throw new Error("Firestore SDK not available."); // Re-throw original error
                }
            }
            // --- End Firestore Check ---

            const db = firebase.firestore();
            const templateCollectionRef = db.collection('users').doc(userId).collection('correctionTemplates');
            const querySnapshot = await templateCollectionRef.orderBy('created', 'desc').get();

            if (querySnapshot.empty) {
                this.elements.templatesListDiv.innerHTML = '<p>No correction templates saved yet.</p>';
                return;
            }

            let listHtml = '<ul>';
            querySnapshot.forEach(doc => {
                const template = doc.data();
                const templateId = doc.id;
                // Basic display - can be enhanced with more details/actions
                listHtml += `
                    <li>
                        <span class="template-name">${template.name}</span>
                        <button class="apply-template-btn modern-button tiny" data-template-id="${templateId}" title="Apply this template">Apply</button>
                        <button class="delete-template-btn modern-button tiny danger" data-template-id="${templateId}" title="Delete this template">&times;</button>
                    </li>
                `;
            });
            listHtml += '</ul>';
            this.elements.templatesListDiv.innerHTML = listHtml;

            // Add event listeners for apply/delete buttons
            this.elements.templatesListDiv.querySelectorAll('.apply-template-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleApplyTemplate(e.currentTarget.dataset.templateId));
            });
            this.elements.templatesListDiv.querySelectorAll('.delete-template-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleDeleteTemplate(e.currentTarget.dataset.templateId));
            });

             this.managers.monitor?.logOperation('load_templates', 'success', { userId, count: querySnapshot.size });

        } catch (error) {
            console.error("Error loading templates:", error);
            this.elements.templatesListDiv.innerHTML = '<p>Error loading templates.</p>';
            this.managers.errorManager?.showError("Failed to load correction templates.");
            this.managers.monitor?.logError(error, 'loadTemplates');
        }
    }

    async handleApplyTemplate(templateId) {
        if (!this.isPro) return;
        console.log(`Applying template: ${templateId}`);
        alert(`Apply template functionality (ID: ${templateId}) not yet fully implemented.`);
        // TODO:
        // 1. Fetch template data from Firestore.
        // 2. Get current feed data from FeedManager.
        // 3. Apply corrections based on template rules (complex logic).
        // 4. Update FeedManager's data/table.
        // 5. Update template usage count in Firestore.
    }

    async handleDeleteTemplate(templateId) {
        if (!this.isPro) return;
        console.log(`Deleting template: ${templateId}`);

        if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
            return;
        }

        this.managers.loadingManager?.showLoading('Deleting template...');
        const userId = this.managers.authManager.getAuthState().firebaseUserId;
        if (!userId) {
             this.managers.errorManager?.showError("Authentication error.");
             this.managers.loadingManager?.hideLoading();
             return;
        }

        try {
            // Ensure Firestore is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                try {
                    const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                    if (!bg || !bg.firebase || !bg.firebase.firestore) {
                        throw new Error("Firestore not found on background page either.");
                    }
                    window.firebase = bg.firebase;
                    console.warn("Firestore SDK accessed via background page for handleDeleteTemplate.");
                } catch (bgError) {
                    console.error("Error accessing Firestore SDK via background page:", bgError);
                    throw new Error("Firestore SDK not available."); // Re-throw original error
                }
            }
            // --- End Firestore Check ---

            const db = firebase.firestore();
            const templateDocRef = db.collection('users').doc(userId).collection('correctionTemplates').doc(templateId);
            await templateDocRef.delete();

            console.log(`Template ${templateId} deleted successfully.`);
            this.managers.errorManager?.showSuccess("Template deleted.", 1500);
            this.managers.monitor?.logOperation('delete_template', 'success', { userId, templateId });
            await this.loadTemplates(); // Refresh list

        } catch (error) {
             console.error(`Error deleting template ${templateId}:`, error);
             this.managers.errorManager?.showError("Failed to delete template.");
             this.managers.monitor?.logError(error, 'handleDeleteTemplate');
        } finally {
             this.managers.loadingManager?.hideLoading();
        }
    }

}

// Make globally available if needed
window.BulkActionsManager = BulkActionsManager;