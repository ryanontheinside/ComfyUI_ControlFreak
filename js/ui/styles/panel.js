// Panel styles for Control Freak UI
import { defineThemeVariables } from './theme.js';

/**
 * Add the main panel styles
 */
export function addPanelStyles() {
    // Define theme variables first
    defineThemeVariables();
    
    // Check if styles already exist
    if (document.querySelector("#controller-mapping-panel-styles")) {
        return; // Styles already added
    }
    
    const styles = document.createElement('style');
    styles.id = "controller-mapping-panel-styles";
    styles.textContent = `
        #controller-mapping-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--cf-bg-primary);
            border: 1px solid var(--cf-border-color);
            border-radius: 8px;
            width: 85%;
            max-width: 950px;
            max-height: 85vh;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            color: var(--cf-text-primary);
            font-family: var(--cf-brand-font);
            box-shadow: 0 5px 25px var(--cf-bg-overlay);
            overflow: hidden;
        }
        
        #controller-mapping-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: linear-gradient(90deg, var(--cf-bg-tertiary), var(--cf-brand-primary) 250%);
            border-bottom: 1px solid var(--cf-border-color);
        }
        
        #controller-mapping-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
        }
        
        #controller-mapping-close {
            background: none;
            border: none;
            color: var(--cf-text-primary);
            font-size: 22px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        #controller-mapping-close:hover {
            background-color: var(--cf-bg-overlay-light);
            transform: rotate(90deg);
        }
        
        #controller-mapping-tabs {
            display: flex;
            background-color: var(--cf-bg-secondary);
            border-bottom: 1px solid var(--cf-border-color);
            padding: 0 15px;
        }
        
        .controller-mapping-tab {
            padding: 12px 20px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 14px;
        }
        
        .controller-mapping-tab:hover {
            background-color: var(--cf-bg-overlay-light);
            color: var(--cf-brand-primary);
        }
        
        .controller-mapping-tab.active {
            border-bottom-color: var(--cf-brand-primary);
            color: var(--cf-brand-primary);
            font-weight: 600;
        }
        
        #controller-mapping-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .tab-panel {
            display: none;
        }
        
        .tab-panel.active {
            display: block;
        }
        
        /* Controller sections styling */
        .controller-section {
            margin-bottom: 30px;
        }
        
        .cf-section-header {
            font-size: 18px;
            margin: 0 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--cf-border-light);
            color: var(--cf-brand-primary);
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .cf-section-icon {
            font-size: 20px;
        }
        
        .cf-loading {
            text-align: center;
            padding: 30px;
            color: var(--cf-text-secondary);
            font-style: italic;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .cf-loading-icon {
            font-size: 32px;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 0.6; transform: scale(0.95); }
        }
        
        .cf-cards-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }
        
        .controller-card {
            background-color: var(--cf-bg-secondary);
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 2px 8px var(--cf-bg-overlay-dark);
            transition: all 0.2s;
            border: 1px solid var(--cf-border-color);
        }
        
        .controller-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px var(--cf-bg-overlay);
            border-color: var(--cf-brand-primary);
        }
        
        .controller-card-header {
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .controller-card-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 70%;
        }
        
        .controller-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
        }
        
        .controller-status.connected {
            background-color: rgba(0, 128, 0, 0.15);
            color: var(--cf-status-success);
            border: 1px solid rgba(0, 128, 0, 0.2);
        }
        
        .controller-status.disconnected {
            background-color: rgba(128, 0, 0, 0.15);
            color: var(--cf-status-error);
            border: 1px solid rgba(128, 0, 0, 0.2);
        }
        
        .controller-status.detected {
            background-color: rgba(230, 180, 80, 0.15);
            color: var(--cf-status-warning);
            border: 1px solid rgba(230, 180, 80, 0.2);
        }
        
        .device-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 8px;
            background-color: var(--cf-bg-overlay-light);
            border-radius: 4px;
            border: 1px solid var(--cf-border-light);
            font-size: 14px;
        }
        
        .device-type {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .device-type-icon {
            font-size: 16px;
        }
        
        .device-specs {
            display: flex;
            gap: 10px;
            color: var(--cf-text-secondary);
        }
        
        .controller-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        #controller-mapping-panel button {
            background-color: var(--cf-bg-overlay-light);
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--cf-brand-font);
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        #controller-mapping-panel button:hover {
            background-color: var(--cf-bg-hover);
            transform: translateY(-1px);
        }
        
        .connect-btn {
            background-color: var(--cf-brand-secondary) !important;
            color: white !important;
            border-color: var(--cf-brand-secondary) !important;
        }
        
        .connect-btn:hover {
            background-color: var(--cf-accent-green) !important;
        }
        
        .disconnect-btn {
            background-color: var(--cf-brand-primary) !important;
            color: white !important;
            border-color: var(--cf-brand-primary) !important;
        }
        
        .disconnect-btn:hover {
            background-color: var(--cf-accent-red) !important;
        }
        
        .cf-no-devices {
            padding: 20px 15px;
            text-align: center;
            background-color: var(--cf-bg-overlay-light);
            border-radius: 6px;
            color: var(--cf-text-secondary);
            margin: 15px 0;
            border: 1px dashed var(--cf-border-color);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .cf-no-devices-icon {
            font-size: 24px;
            opacity: 0.6;
        }
        
        .cf-no-devices p {
            margin: 0;
            font-style: italic;
        }
        
        .cf-error-panel {
            background-color: rgba(230, 100, 100, 0.1);
            border: 1px solid rgba(230, 100, 100, 0.3);
            border-radius: 6px;
            padding: 20px;
            color: var(--cf-text-primary);
            margin: 15px 0;
        }
        
        .cf-error-title {
            color: var(--cf-accent-red);
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        .cf-error-message {
            font-weight: 500;
            margin-bottom: 15px;
        }
        
        .cf-error-stack {
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow: auto;
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 4px;
            white-space: pre-wrap;
        }
        
        /* Mapping list and table styles */
        .mapping-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            border: 1px solid var(--cf-border-color);
            border-radius: 6px;
            overflow: hidden;
        }
        
        .mapping-table th {
            text-align: left;
            padding: 10px 12px;
            background-color: var(--cf-bg-tertiary);
            border-bottom: 2px solid var(--cf-border-color);
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
        }
        
        .mapping-table td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--cf-border-light);
            transition: background-color 0.1s;
        }
        
        .mapping-table tr:hover td {
            background-color: var(--cf-bg-overlay-light);
        }
        
        .mapping-table tr:last-child td {
            border-bottom: none;
        }
        
        .delete-mapping {
            background: none !important;
            border: none !important;
            color: var(--cf-accent-red) !important;
            cursor: pointer;
            font-size: 18px;
            width: 32px !important;
            height: 32px !important;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 50% !important;
        }
        
        .delete-mapping:hover {
            background-color: rgba(230, 100, 100, 0.1) !important;
            color: var(--cf-status-error) !important;
        }
        
        .no-mappings {
            font-style: italic;
            color: var(--cf-text-secondary);
            text-align: center;
            padding: 30px;
            background-color: var(--cf-bg-overlay-light);
            border-radius: 6px;
            margin: 20px 0;
            border: 1px dashed var(--cf-border-color);
        }
        
        /* Command list styles */
        .commands-container {
            width: 100%;
            max-height: 700px;
            overflow-y: auto;
            padding: 15px;
            border: 1px solid var(--cf-border-light);
            border-radius: 6px;
            background-color: var(--cf-bg-overlay-light);
        }
        
        .commands-panel-header {
            margin-bottom: 20px;
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--cf-border-light);
        }
        
        .commands-panel-header h3 {
            margin-bottom: 8px;
            color: var(--cf-brand-primary);
            font-weight: 600;
        }
        
        .commands-panel-header p {
            margin: 0;
            font-size: 14px;
            color: var(--cf-text-secondary);
            max-width: 600px;
            margin: 0 auto;
        }
        
        .command-category-section {
            margin-bottom: 20px;
            border: 1px solid var(--cf-border-color);
            border-radius: 6px;
            overflow: hidden;
            background-color: var(--cf-bg-secondary);
        }
        
        .category-header {
            background: linear-gradient(90deg, var(--cf-bg-tertiary), var(--cf-brand-tertiary) 250%);
            padding: 10px 15px;
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--cf-text-primary);
            border-bottom: 1px solid var(--cf-border-color);
        }
        
        .command-list {
            padding: 10px;
        }
        
        .command-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            margin-bottom: 6px;
            border-radius: 4px;
            border: 1px solid var(--cf-border-light);
            background-color: var(--cf-bg-overlay-light);
            transition: all 0.2s;
        }
        
        .command-item:last-child {
            margin-bottom: 0;
        }
        
        .command-item:hover {
            background-color: var(--cf-bg-overlay-dark);
            border-color: var(--cf-brand-primary);
            transform: translateY(-1px);
        }
        
        .command-info {
            flex: 1;
        }
        
        .command-label {
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--cf-text-primary);
        }
        
        .command-id {
            font-size: 0.8em;
            color: var(--cf-text-secondary);
        }
        
        .command-map-btn {
            background-color: var(--cf-accent-blue-dark);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .command-map-btn:hover {
            background-color: var(--cf-accent-blue);
        }
        
        .map-command-btn {
            background-color: var(--cf-bg-secondary);
            border: 1px solid var(--cf-border-color);
            color: var(--cf-text-primary);
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .map-command-btn:hover {
            background-color: var(--cf-bg-hover);
        }
        
        /* About tab styles */
        #about-panel {
            padding: 20px;
        }
        
        .about-content {
            max-width: 700px;
            margin: 0 auto;
        }
        
        .about-content p {
            margin-bottom: 20px;
            text-align: center;
            font-size: 16px;
        }
        
        .developer-links {
            background-color: var(--cf-bg-overlay-dark);
            border-radius: 8px;
            padding: 20px;
        }
        
        .developer-links h3 {
            margin-top: 10px;
            margin-bottom: 15px;
            border-bottom: 1px solid var(--cf-border-light);
            padding-bottom: 5px;
        }
        
        .developer-links ul {
            list-style-type: none;
            padding: 0;
            margin: 0 0 20px 0;
        }
        
        .developer-links li {
            margin-bottom: 10px;
        }
        
        .developer-links a {
            color: var(--cf-link-color);
            text-decoration: none;
            display: inline-block;
            padding: 5px 0;
            transition: color 0.2s, transform 0.2s;
        }
        
        .developer-links a:hover {
            color: var(--cf-link-hover);
            transform: translateX(3px);
        }
    `;
    
    document.head.appendChild(styles);
} 