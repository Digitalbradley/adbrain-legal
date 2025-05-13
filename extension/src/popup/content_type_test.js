// This script runs when loaded to test content type validation
// Use global ContentTypeValidator
// No need to import it since it's already available globally

console.log('[DIRECT TEST] Starting direct test of content type validation');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DIRECT TEST] DOM content loaded');
    
    // Create a test button to manually trigger content type validation
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Content Type Validation';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '20px';
    testButton.style.left = '20px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#007bff';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', function() {
        console.log('[DIRECT TEST] Test button clicked');
        
        // ContentTypeValidator is now available globally
        console.log('[DIRECT TEST] ContentTypeValidator available via global window object');
        
        // Create a test row with content type issues
        const testRow = {
            id: 'test123',
            title: 'https://example.com/this-is-a-url-in-title',
            description: 'This is a normal description',
            link: 'not-a-valid-url',
            image_link: 'https://example.com/image.jpg',
            price: 'invalid price format',
            availability: 'unknown status',
            condition: 'like-new'
        };
        
        const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition'];
        
        // Run validation with imported ContentTypeValidator
        try {
            console.log('[DIRECT TEST] Running validation with ContentTypeValidator');
            const issues = ContentTypeValidator.validate(testRow, headers);
            console.log('[DIRECT TEST] Validation issues:', issues);
            
            // Try to display a warning
            if (issues && issues.length > 0) {
                const warningMessage = `TEST WARNING: Content type issues detected: ${ContentTypeValidator.formatIssues(issues)}`;
                    console.log('[DIRECT TEST] Displaying warning:', warningMessage);
                    
                    // Create a warning element directly
                    const warningElement = document.createElement('div');
                    warningElement.className = 'warning-message';
                    warningElement.textContent = warningMessage;
                    warningElement.style.position = 'fixed';
                    warningElement.style.top = '100px';
                    warningElement.style.left = '50%';
                    warningElement.style.transform = 'translateX(-50%)';
                    warningElement.style.zIndex = '9999';
                    document.body.appendChild(warningElement);
                }
            } catch (error) {
                console.error('[DIRECT TEST] Error during validation:', error);
            }
    });
    
    document.body.appendChild(testButton);
});