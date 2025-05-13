/**
 * Direct Validation Tabs Module
 *
 * This module handles tab switching functionality for the direct validation.
 * It provides functions to switch between the validation tab and feed tab.
 */

(function() {
    /**
     * Switches to the validation tab
     */
    function switchToValidationTab() {
        console.log('[DIRECT] Switching to validation tab');
        
        // First try to find the validation tab button
        const validationTabButton = document.querySelector('.tab-button[data-tab="validation"]');
        console.log('[DIRECT] Found validation tab button by data-tab:', validationTabButton);
        
        if (validationTabButton) {
            console.log('[DIRECT] Clicking validation tab button');
            
            // Try using the click() method first
            try {
                validationTabButton.click();
                console.log('[DIRECT] Click method called on validation tab button');
            } catch (error) {
                console.error('[DIRECT] Error clicking validation tab button:', error);
            }
            
            // As a backup, try to dispatch a click event
            try {
                console.log('[DIRECT] Dispatching click event on validation tab button');
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                validationTabButton.dispatchEvent(clickEvent);
            } catch (error) {
                console.error('[DIRECT] Error dispatching click event:', error);
            }
            
            // Double-check if the tab is visible after a short delay
            setTimeout(() => {
                const validationPanel = document.getElementById('validation-tab');
                if (validationPanel) {
                    console.log('[DIRECT] Validation panel found by ID:', validationPanel);
                    console.log('[DIRECT] Validation panel is visible:', validationPanel.classList.contains('active'));
                    
                    // If not visible, try to force it
                    if (!validationPanel.classList.contains('active')) {
                        console.log('[DIRECT] Forcing validation panel to be visible');
                        
                        // Deactivate all tabs first
                        document.querySelectorAll('.tab-panel').forEach(panel => {
                            console.log('[DIRECT] Removing active class from panel:', panel.id);
                            panel.classList.remove('active');
                        });
                        
                        document.querySelectorAll('.tab-button').forEach(btn => {
                            console.log('[DIRECT] Removing active class from button:', btn.textContent.trim());
                            btn.classList.remove('active');
                        });
                        
                        // Activate validation tab
                        console.log('[DIRECT] Adding active class to validation panel');
                        validationPanel.classList.add('active');
                        
                        console.log('[DIRECT] Adding active class to validation tab button');
                        validationTabButton.classList.add('active');
                        
                        // Force display style as a backup
                        validationPanel.style.display = 'block';
                        
                        // Check if it worked
                        setTimeout(() => {
                            console.log('[DIRECT] After forcing: Validation panel is visible:',
                                validationPanel.classList.contains('active'),
                                'Display style:', validationPanel.style.display);
                        }, 50);
                    }
                }
            }, 100);
        } else {
            // Try to find the validation tab button by other means
            console.error('[DIRECT] Validation tab button not found by data-tab');
            
            // Try to find all tab buttons and click the one for validation
            const allTabButtons = document.querySelectorAll('.tab-button');
            console.log('[DIRECT] All tab buttons:', allTabButtons);
            
            let validationButtonFound = false;
            
            allTabButtons.forEach((button, index) => {
                console.log(`[DIRECT] Tab button ${index}:`, button);
                console.log(`[DIRECT] Tab button ${index} text:`, button.textContent.trim());
                
                // Check if this button is for the validation tab
                if (button.textContent.trim().includes('Validation')) {
                    console.log(`[DIRECT] Found validation tab button by text:`, button);
                    console.log(`[DIRECT] Clicking validation tab button found by text`);
                    button.click();
                    validationButtonFound = true;
                    
                    // Double-check if the tab is visible after a short delay
                    setTimeout(() => {
                        const validationPanel = document.getElementById('validation-tab');
                        if (validationPanel) {
                            console.log('[DIRECT] Validation panel found by ID:', validationPanel);
                            console.log('[DIRECT] Validation panel is visible:', validationPanel.classList.contains('active'));
                            
                            // If not visible, try to force it
                            if (!validationPanel.classList.contains('active')) {
                                console.log('[DIRECT] Forcing validation panel to be visible');
                                
                                // Deactivate all tabs first
                                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                                
                                // Activate validation tab
                                validationPanel.classList.add('active');
                                button.classList.add('active');
                            }
                        }
                    }, 100);
                }
            });
            
            if (!validationButtonFound) {
                console.error('[DIRECT] Could not find validation tab button by any means');
                
                // Try to find the validation tab directly
                const validationPanel = document.getElementById('validation-tab');
                if (validationPanel) {
                    console.log('[DIRECT] Found validation panel directly:', validationPanel);
                    
                    // Deactivate all tabs first
                    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    
                    // Activate validation tab
                    validationPanel.classList.add('active');
                }
            }
        }
        
        // Check if the tab was actually switched
        setTimeout(() => {
            // Try to find the validation tab panel by ID
            const validationPanel = document.getElementById('validation-tab');
            if (validationPanel) {
                console.log('[DIRECT] Validation panel found by ID:', validationPanel);
                console.log('[DIRECT] Validation panel is visible:', validationPanel.classList.contains('active'));
                
                // Check if the validation history table is visible
                const historyTable = validationPanel.querySelector('table.validation-table');
                console.log('[DIRECT] Validation history table found:', !!historyTable);
                
                if (historyTable) {
                    const tbody = historyTable.querySelector('tbody');
                    console.log('[DIRECT] Validation history tbody found:', !!tbody);
                    if (tbody) {
                        console.log('[DIRECT] Validation history tbody ID:', tbody.id);
                    }
                } else {
                    // Try to find the table by other means
                    const allTables = validationPanel.querySelectorAll('table');
                    console.log('[DIRECT] All tables in validation panel:', allTables);
                    
                    if (allTables.length > 0) {
                        const firstTable = allTables[0];
                        console.log('[DIRECT] First table in validation panel:', firstTable);
                        
                        const tbody = firstTable.querySelector('tbody');
                        console.log('[DIRECT] First table tbody found:', !!tbody);
                        if (tbody) {
                            console.log('[DIRECT] First table tbody ID:', tbody.id);
                        }
                    }
                }
            } else {
                console.error('[DIRECT] Validation panel not found by ID');
                
                // Try to find all tab panels
                const allTabPanels = document.querySelectorAll('.tab-panel');
                console.log('[DIRECT] All tab panels:', allTabPanels);
                
                allTabPanels.forEach((panel, index) => {
                    console.log(`[DIRECT] Tab panel ${index}:`, panel);
                    console.log(`[DIRECT] Tab panel ${index} ID:`, panel.id);
                    console.log(`[DIRECT] Tab panel ${index} classes:`, panel.className);
                    console.log(`[DIRECT] Tab panel ${index} is visible:`, panel.classList.contains('active'));
                    
                    // If this panel is active, check if it has a validation history table
                    if (panel.classList.contains('active')) {
                        const tables = panel.querySelectorAll('table');
                        console.log(`[DIRECT] Tables in active panel:`, tables);
                        
                        tables.forEach((table, tableIndex) => {
                            console.log(`[DIRECT] Table ${tableIndex} in active panel:`, table);
                            
                            const tbody = table.querySelector('tbody');
                            console.log(`[DIRECT] Table ${tableIndex} tbody found:`, !!tbody);
                            if (tbody) {
                                console.log(`[DIRECT] Table ${tableIndex} tbody ID:`, tbody.id);
                            }
                        });
                    }
                });
            }
        }, 100);
    }
    
    /**
     * Switches to the feed tab
     */
    function switchToFeedTab() {
        console.log('[DIRECT] Switching to feed tab');
        
        // First try to find the feed tab button
        const feedTabButton = document.querySelector('.tab-button[data-tab="feed"]');
        console.log('[DIRECT] Found feed tab button by data-tab:', feedTabButton);
        
        if (feedTabButton) {
            console.log('[DIRECT] Clicking feed tab button');
            feedTabButton.click();
            
            // Double-check if the tab is visible after a short delay
            setTimeout(() => {
                const feedPanel = document.getElementById('feed-tab');
                if (feedPanel) {
                    console.log('[DIRECT] Feed panel found by ID:', feedPanel);
                    console.log('[DIRECT] Feed panel is visible:', feedPanel.classList.contains('active'));
                    
                    // If not visible, try to force it
                    if (!feedPanel.classList.contains('active')) {
                        console.log('[DIRECT] Forcing feed panel to be visible');
                        
                        // Deactivate all tabs first
                        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                        
                        // Activate feed tab
                        feedPanel.classList.add('active');
                        feedTabButton.classList.add('active');
                    }
                }
            }, 100);
        } else {
            // Try to find the feed tab button by other means
            console.error('[DIRECT] Feed tab button not found by data-tab');
            
            // Try to find all tab buttons and click the one for feed
            const allTabButtons = document.querySelectorAll('.tab-button');
            console.log('[DIRECT] All tab buttons:', allTabButtons);
            
            let feedButtonFound = false;
            
            allTabButtons.forEach((button, index) => {
                console.log(`[DIRECT] Tab button ${index}:`, button);
                console.log(`[DIRECT] Tab button ${index} text:`, button.textContent.trim());
                
                // Check if this button is for the feed tab
                if (button.textContent.trim().includes('Feed')) {
                    console.log(`[DIRECT] Found feed tab button by text:`, button);
                    console.log(`[DIRECT] Clicking feed tab button found by text`);
                    button.click();
                    feedButtonFound = true;
                }
            });
            
            if (!feedButtonFound) {
                console.error('[DIRECT] Could not find feed tab button by any means');
                
                // Try to find the feed tab directly
                const feedPanel = document.getElementById('feed-tab');
                if (feedPanel) {
                    console.log('[DIRECT] Found feed panel directly:', feedPanel);
                    
                    // Deactivate all tabs first
                    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    
                    // Activate feed tab
                    feedPanel.classList.add('active');
                }
            }
        }
    }
    
    // Export functions to global scope
    window.DirectValidationTabs = {
        switchToValidationTab: switchToValidationTab,
        switchToFeedTab: switchToFeedTab
    };
    
    console.log('[DIRECT] Tabs module initialized');
})();