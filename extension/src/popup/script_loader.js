// Script Loading Manager to ensure scripts load in the correct order
const ScriptLoader = {
    loadedScripts: {},
    
    // Load a script and return a promise
    loadScript: function(url) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (this.loadedScripts[url]) {
                console.log(`Script already loaded: ${url}`);
                resolve();
                return;
            }
            
            console.log(`Loading script: ${url}`);
            const script = document.createElement('script');
            script.src = url;
            
            script.onload = () => {
                console.log(`Successfully loaded: ${url}`);
                this.loadedScripts[url] = true;
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`Failed to load script: ${url}`, error);
                reject(new Error(`Failed to load script: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Load scripts sequentially
    loadScriptsSequentially: function(scripts) {
        return scripts.reduce((promise, script) => {
            return promise.then(() => this.loadScript(script));
        }, Promise.resolve());
    }
};

// Define script groups
const utilityLibraries = [
    // Removed non-existent files
    // '../../lib/ui/loading.js',
    // '../../lib/ui/errors.js',
    // '../../lib/ui/tables.js',
    'loading-indicator.js' // Only load our new loading indicator module
];

const validationLibraries = [
    // Removed non-existent files
    // '../../lib/gmc/validator.js',
    // '../../lib/validation/rules.js',
    // '../../lib/validation/analyzer.js',
    // '../../lib/validation/custom_rule_validator.js'
];
const utilityFiles = [
    // 'popup_utils.js', // Now loaded via app.js
    // 'debug.js',  // Now loaded via app.js
    // 'content_type_validator.js' // Now loaded via app.js
];

const configurationFiles = [
    'popup_config.js'
];

const mockImplementations = [
    'firebase_mock.js',
    'gmc_mock.js',
    'auth_mock.js',
    'ui_mocks.js'
];

const managerClasses = [
    // 'status_manager.js', // Now loaded via app.js
    'status_bar_manager.js',
    // 'feed_display_manager.js', // Now loaded via app.js
    // 'search_manager.js', // Now loaded via app.js
    // Validation modules are now loaded via validation_modules.js and app.js
    // 'validation_firebase_handler.js', // Now loaded via validation_modules.js
    // 'validation_panel_manager.js', // Now loaded via validation_modules.js
    // 'validation_issue_manager.js', // Now loaded via validation_modules.js
    // 'content_type_validator.js', // Now loaded via app.js
    // 'validation_ui_manager.js', // Now loaded via validation_modules.js
    // Manager modules are now loaded via manager_modules.js and app.js
    // 'feed_coordinator.js', // Now loaded via manager_modules.js
    // 'settings_manager.js', // Now loaded via manager_modules.js
    // 'bulk_actions_manager.js' // Now loaded via manager_modules.js
];

const extractedFunctionality = [
    'popup_event_handlers.js',
    'popup_message_handler.js'
];

const mainScripts = [
    'popup_init.js', // Load initialization script before main popup script
    'popup.js'
];

// Load all scripts in the correct order
console.log('[DEBUG] Setting up DOMContentLoaded event listener');
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded event fired');
    
    // Check if AppModules is available (indicating app.js has loaded)
    if (window.AppModules) {
        console.log('[DEBUG] AppModules detected from app.js:', Object.keys(window.AppModules));
    } else {
        console.warn('[DEBUG] AppModules not detected. ES Module system may not be working properly.');
    }
    
    console.log('[DEBUG] Starting script loading sequence...');
    
    // Create a loading indicator using our module
    const loadingIndicator = window.LoadingIndicator?.create() || document.createElement('div');
    
    const updateLoadingStatus = (status) => {
        if (window.LoadingIndicator?.update) {
            window.LoadingIndicator.update(status);
        } else {
            console.log('Loading status:', status);
        }
    };
    
    // Load all script groups sequentially
    ScriptLoader.loadScriptsSequentially(utilityLibraries)
        .then(() => {
            updateLoadingStatus('Loading validation libraries...');
            return ScriptLoader.loadScriptsSequentially(validationLibraries);
        })
        .then(() => {
            // Only load utility files if there are any to load
            if (utilityFiles.length > 0) {
                updateLoadingStatus('Loading utility files...');
                return ScriptLoader.loadScriptsSequentially(utilityFiles);
            }
            console.log('[DEBUG] Skipping utility files (now loaded via ES modules)');
            return Promise.resolve();
        })
        .then(() => {
            updateLoadingStatus('Loading configuration...');
            return ScriptLoader.loadScriptsSequentially(configurationFiles);
        })
        .then(() => {
            updateLoadingStatus('Loading mock implementations...');
            return ScriptLoader.loadScriptsSequentially(mockImplementations);
        })
        .then(() => {
            // Only load manager classes if there are any to load
            if (managerClasses.length > 0) {
                updateLoadingStatus('Loading manager classes...');
                return ScriptLoader.loadScriptsSequentially(managerClasses);
            }
            console.log('[DEBUG] Skipping manager classes (now loaded via ES modules)');
            return Promise.resolve();
        })
        .then(() => {
            updateLoadingStatus('Loading extracted functionality...');
            return ScriptLoader.loadScriptsSequentially(extractedFunctionality);
        })
        .then(() => {
            updateLoadingStatus('Loading main scripts...');
            return ScriptLoader.loadScriptsSequentially(mainScripts);
        })
        .then(() => {
            console.log('All scripts loaded successfully!');
            // Remove loading indicator using our module
            if (window.LoadingIndicator?.remove) {
                window.LoadingIndicator.remove();
            } else {
                loadingIndicator.remove();
            }
        })
        .catch((error) => {
            console.error('Error loading scripts:', error);
            updateLoadingStatus(`Error: ${error.message}. Check console for details.`);
            // Set error state using our module
            if (window.LoadingIndicator?.setError) {
                window.LoadingIndicator.setError();
            }
        });
});