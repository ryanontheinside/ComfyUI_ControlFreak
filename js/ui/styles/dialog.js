// Dialog styles for Control Freak UI

/**
 * Add dialog-specific styles
 */
export function addDialogStyles() {
    // Check if styles already exist
    if (document.querySelector("#controller-dialog-styles")) {
        return; // Styles already added
    }
    
    const style = document.createElement("style");
    style.id = "controller-dialog-styles";
    style.textContent = `
        .controller-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            display: block;
            background-color: var(--cf-bg-primary);
            border: 1px solid var(--cf-border-color);
            border-radius: 6px;
            box-shadow: 0 4px 20px var(--cf-bg-overlay);
            padding: 0;
            min-width: 450px;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            color: var(--cf-text-primary);
            font-family: var(--cf-brand-font);
        }
        
        .controller-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(90deg, var(--cf-bg-tertiary), var(--cf-brand-primary) 250%);
            padding: 12px 20px;
            border-bottom: 1px solid var(--cf-border-color);
            border-radius: 6px 6px 0 0;
        }
        
        .controller-dialog-header h2 {
            margin: 0;
            padding: 0;
            font-family: var(--cf-brand-font);
            font-weight: 600;
            font-size: 22px;
        }
        
        .controller-dialog-header .cf-logo {
            font-size: 18px;
        }
        
        .cf-dialog-subtitle {
            color: var(--cf-text-secondary);
            text-align: center;
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 20px;
            font-style: italic;
        }
        
        .controller-dialog-content {
            padding: 20px;
        }
        
        .controller-dialog-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--cf-text-muted);
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            border-radius: 4px;
        }
        
        .controller-dialog-close:hover {
            color: var(--cf-text-primary);
            background: rgba(255, 255, 255, 0.1);
        }
        
        .controller-mapping-target,
        .controller-mapping-existing,
        .controller-mapping-input,
        .controller-mapping-type-section {
            margin-bottom: 20px;
        }
        
        .controller-mapping-target h3,
        .controller-mapping-existing h3,
        .controller-mapping-input h3,
        .controller-mapping-type-section h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-family: var(--cf-brand-font);
            font-weight: 600;
            color: var(--cf-brand-primary);
            font-size: 16px;
            border-bottom: 1px solid var(--cf-border-light);
            padding-bottom: 6px;
        }
        
        .controller-mapping-target-info,
        .controller-mapping-existing-content,
        .controller-mapping-input-list {
            padding: 12px;
            background-color: var(--cf-bg-overlay-light);
            border-radius: 4px;
            border: 1px solid var(--cf-border-light);
        }
        
        .controller-mapping-existing-content,
        .controller-mapping-input-list {
            max-height: 150px;
            overflow-y: auto;
        }
        
        .controller-mapping-instruction {
            text-align: center;
            color: var(--cf-text-muted);
            padding: 20px 0;
            font-style: italic;
        }
        
        /* Visibility classes */
        .hidden {
            display: none !important;
        }
        
        .visible {
            display: block !important;
        }
        
        /* Form elements */
        .controller-mapping-type-container {
            margin-bottom: 10px;
        }
        
        .controller-mapping-type-select {
            width: 100%;
            padding: 10px;
            border-radius: 4px;
            background-color: var(--cf-bg-secondary);
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
            font-family: var(--cf-brand-font);
            font-size: 14px;
        }
        
        .controller-mapping-type-select option {
            padding: 8px;
        }
        
        .controller-mapping-range {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 12px;
        }
        
        .controller-mapping-range > div {
            flex: 1;
        }
        
        .controller-mapping-range label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            color: var(--cf-text-secondary);
        }
        
        .controller-mapping-min,
        .controller-mapping-max,
        .controller-mapping-step {
            width: 100%;
            padding: 10px;
            border-radius: 4px;
            background-color: var(--cf-bg-secondary);
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
            font-family: var(--cf-brand-font);
        }
        
        /* Button styles */
        .controller-mapping-buttons {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        .controller-cancel-button,
        .controller-map-button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: white;
            font-family: var(--cf-brand-font);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.2s;
        }
        
        .controller-cancel-button {
            background-color: var(--cf-bg-secondary);
            flex: 1;
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
        }
        
        .controller-cancel-button:hover {
            background-color: var(--cf-bg-hover);
        }
        
        .controller-map-button {
            background-color: var(--cf-brand-primary);
            flex: 2;
        }
        
        .controller-map-button:hover {
            background-color: var(--cf-accent-red-dark);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        
        .controller-map-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .controller-dialog button {
            background-color: var(--cf-bg-secondary);
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--cf-brand-font);
            transition: all 0.2s;
        }
        
        .controller-dialog button:hover {
            background-color: var(--cf-bg-hover);
            transform: translateY(-1px);
        }
        
        .controller-dialog button.primary {
            background-color: var(--cf-brand-secondary);
            color: white;
            border-color: var(--cf-brand-secondary);
        }
        
        .controller-dialog button.primary:hover {
            background-color: var(--cf-accent-green);
        }
        
        .controller-dialog button.danger {
            background-color: var(--cf-accent-red);
            color: white;
            border-color: var(--cf-accent-red);
        }
        
        .controller-dialog button.danger:hover {
            background-color: var(--cf-accent-red-dark);
        }
        
        .controller-input-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background-color: var(--cf-bg-secondary);
            margin-bottom: 6px;
            border-radius: 4px;
            border: 1px solid var(--cf-border-color);
            transition: all 0.2s;
            cursor: pointer;
        }
        
        .controller-input-item:hover {
            background-color: var(--cf-bg-hover);
            border-color: var(--cf-brand-primary);
        }
        
        .controller-input-info {
            flex: 1;
        }
        
        .controller-input-device {
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .controller-input-control {
            font-size: 0.9em;
            color: var(--cf-text-muted);
        }
        
        .controller-input-value {
            padding: 4px 10px;
            background-color: var(--cf-brand-primary);
            color: white;
            border-radius: 3px;
            min-width: 50px;
            text-align: center;
            font-weight: 600;
            font-size: 14px;
        }
    `;
    
    document.head.appendChild(style);
} 