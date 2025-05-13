/**
 * Utility functions for the popup UI
 */

/**
 * Debounces a function to limit how often it can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Updates the character count display for editable fields
 * @param {HTMLElement} element - The editable field element
 * @param {number} maxLength - The maximum allowed length
 */
function updateCharCount(element, maxLength) {
    const content = element.innerText || element.textContent;
    const charCount = content.length;
    const countDisplay = element.nextElementSibling;
    const isDescription = element.dataset.field === 'description';
    const minRequired = isDescription ? 90 : 25; // Assuming title min is 25 based on context

    countDisplay.textContent = `${charCount}/${maxLength}`;

    if (charCount < minRequired) {
        countDisplay.style.color = '#dc3545'; // Red
    } else if (charCount > maxLength) {
        countDisplay.style.color = '#dc3545'; // Red
    } else {
        countDisplay.style.color = '#28a745'; // Green
    }
}

// For backward compatibility, also make functions available globally
window.debounce = debounce;
window.updateCharCount = updateCharCount;

// No default export needed for regular scripts