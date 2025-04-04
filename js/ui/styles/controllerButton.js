// Controller Button styles for Control Freak UI

/**
 * Add styles for the controller button
 */
export function addControllerButtonStyles() {
    // Check if styles already exist
    if (document.querySelector("#controller-button-styles")) {
        return; // Styles already added
    }
    
    const styles = document.createElement('style');
    styles.id = "controller-button-styles";
    styles.textContent = `
        .controller-button {
            margin-left: 10px;
            background: linear-gradient(90deg, var(--cf-bg-tertiary), var(--cf-brand-primary) 200%) !important;
            border: 1px solid var(--cf-brand-primary) !important;
            color: white !important;
            padding: 4px 10px !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            font-family: var(--cf-brand-font) !important;
            transition: all 0.2s !important;
            font-weight: 500 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            font-size: 12px !important;
        }
        
        .controller-button:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
            background: linear-gradient(90deg, var(--cf-brand-primary), var(--cf-accent-red-dark) 200%) !important;
        }
        
        .controller-button-icon {
            font-size: 16px !important;
        }
        
        /* Pulse animation for controllers connected */
        .controller-button.connected {
            animation: controller-button-pulse 2s infinite;
        }
        
        @keyframes controller-button-pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.4);
            }
            70% {
                box-shadow: 0 0 0 6px rgba(255, 87, 34, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(255, 87, 34, 0);
            }
        }
    `;
    
    document.head.appendChild(styles);
} 