// Theme variables for Control Freak UI

/**
 * CSS Variables used throughout the Control Freak UI
 * These extend ComfyUI's built-in theme variables
 */
export function defineThemeVariables() {
    const styleElement = document.createElement('style');
    styleElement.id = 'controlfreak-theme-variables';
    styleElement.textContent = `
        :root {
            /* Base colors that extend ComfyUI variables */
            --cf-text-primary: var(--input-text, #ffffff);
            --cf-text-secondary: var(--descrip-text, #999999);
            --cf-text-muted: #aaaaaa;
            
            /* Background colors */
            --cf-bg-primary: var(--comfy-menu-bg, #202020);
            --cf-bg-secondary: var(--comfy-input-bg, #303030);
            --cf-bg-tertiary: #333333;
            --cf-bg-hover: var(--comfy-menu-bg-hover, #404040);
            
            /* Border colors */
            --cf-border-color: var(--border-color, #444444);
            --cf-border-light: rgba(255, 255, 255, 0.1);
            --cf-border-dark: rgba(0, 0, 0, 0.2);
            
            /* Brand colors */
            --cf-brand-primary: #ff5722; /* Vibrant orange - represents control */
            --cf-brand-secondary: #8bc34a; /* Fresh green - represents responsive control */
            --cf-brand-tertiary: #607d8b; /* Blue-grey - represents precision */
            
            /* Accent colors */
            --cf-accent-blue: #3498db;
            --cf-accent-blue-dark: #2a5885;
            --cf-accent-green: #4a6;
            --cf-accent-red: #d9534f;
            --cf-accent-red-dark: #a46;
            
            /* Status colors */
            --cf-status-success: rgb(100, 230, 100);
            --cf-status-error: rgb(230, 100, 100);
            --cf-status-warning: rgb(230, 180, 80);
            
            /* Link colors */
            --cf-link-color: #64b5f6;
            --cf-link-hover: #90caf9;
            
            /* Alpha backgrounds */
            --cf-bg-overlay: rgba(0, 0, 0, 0.5);
            --cf-bg-overlay-light: rgba(255, 255, 255, 0.05);
            --cf-bg-overlay-dark: rgba(0, 0, 0, 0.2);
            
            /* Brand fonts */
            --cf-brand-font: 'Rajdhani', 'Roboto Condensed', sans-serif;
        }
        
        /* Import brand font */
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
    `;
    
    // Add to document if not already present
    if (!document.getElementById('controlfreak-theme-variables')) {
        document.head.appendChild(styleElement);
    }
} 