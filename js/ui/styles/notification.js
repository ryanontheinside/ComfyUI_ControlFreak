// Notification styles for Control Freak UI

/**
 * Add notification styles
 */
export function addNotificationStyles() {
    if (document.querySelector("#controller-notification-styles")) {
        return; // Styles already added
    }
    
    const style = document.createElement("style");
    style.id = "controller-notification-styles";
    style.textContent = `
        .controller-notification {
            font-family: var(--cf-brand-font);
            font-size: 14px;
            max-width: 350px;
            position: fixed;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px var(--cf-bg-overlay);
            transition: all 0.3s ease-out;
            color: white;
            border-left: 4px solid transparent;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .controller-notification::before {
            content: "🎮";
            font-size: 18px;
        }
        
        .controller-notification.error {
            background-color: var(--cf-bg-primary);
            border-left-color: var(--cf-accent-red);
            color: var(--cf-text-primary);
        }
        
        .controller-notification.error::before {
            content: "⚠️";
        }
        
        .controller-notification.info {
            background-color: var(--cf-bg-primary);
            border-left-color: var(--cf-brand-primary);
            color: var(--cf-text-primary);
        }
        
        .controller-notification.success {
            background-color: var(--cf-bg-primary);
            border-left-color: var(--cf-brand-secondary);
            color: var(--cf-text-primary);
        }
        
        .controller-notification.success::before {
            content: "✅";
        }
        
        .controller-notification.bottom-right {
            bottom: 20px;
            right: 20px;
            transform-origin: bottom right;
        }
        
        .controller-notification.bottom-left {
            bottom: 20px;
            left: 20px;
            transform-origin: bottom left;
        }
        
        .controller-notification.top-right {
            top: 20px;
            right: 20px;
            transform-origin: top right;
        }
        
        .controller-notification.top-left {
            top: 20px;
            left: 20px;
            transform-origin: top left;
        }
        
        .controller-notification.fade-in {
            animation: notification-fade-in 0.3s forwards;
        }
        
        .controller-notification.fade-out {
            animation: notification-fade-out 0.3s forwards;
        }
        
        @keyframes notification-fade-in {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes notification-fade-out {
            from {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateY(10px) scale(0.9);
            }
        }
    `;
    document.head.appendChild(style);
} 