/**
 * Notification system for controller mapping
 * Handles creation and display of notification messages
 */

import { addNotificationStyles } from './styles/index.js';

/**
 * Show a notification message
 * @param {String} message - The message to display
 * @param {String|Boolean} type - Notification type ('error', 'info', 'success') or boolean for backward compatibility
 * @param {Object} options - Additional options
 * @param {Number} options.duration - Duration in ms to show the notification (default: 3000)
 * @param {String} options.position - Position of the notification (default: 'bottom-right')
 * @returns {HTMLElement} The created notification element
 */
function showNotification(message, type = 'info', options = {}) {
    const defaults = {
        duration: 3000,
        position: 'bottom-right'
    };
    
    const settings = { ...defaults, ...options };
    
    // For backward compatibility where type was a boolean indicating error
    let notificationType = 'info';
    if (typeof type === 'boolean') {
        notificationType = type ? 'error' : 'info';
    } else if (typeof type === 'string') {
        notificationType = type;
    }
    
    // Ensure styles are added
    addNotificationStyles();
    
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `controller-notification ${notificationType} ${settings.position}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add animation classes
    setTimeout(() => {
        notification.classList.add('fade-in');
    }, 10);
    
    // Remove after specified duration
    setTimeout(() => {
        notification.classList.remove('fade-in');
        notification.classList.add('fade-out');
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, settings.duration);
    
    return notification;
}

/**
 * Inject notification styles into the document
 */
function injectNotificationStyles() {
    if (document.querySelector("#controller-notification-styles")) {
        return; // Styles already added
    }
    
    const style = document.createElement("style");
    style.id = "controller-notification-styles";
    style.textContent = `
        .controller-notification {
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        }
    `;
    document.head.appendChild(style);
}

// Export only the notification function
export { showNotification }; 