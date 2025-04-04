// Context Menu styles for Control Freak UI

/**
 * Add styles for the context menu
 */
export function addContextMenuStyles() {
    // Check if styles already exist
    if (document.querySelector("#controller-context-menu-styles")) {
        return; // Styles already added
    }
    
    const styles = document.createElement('style');
    styles.id = "controller-context-menu-styles";
    styles.textContent = `
        .litegraph-context-menu {
            position: fixed;
            z-index: 10000;
            background-color: var(--cf-bg-primary);
            border: 1px solid var(--cf-border-color);
            border-radius: 4px;
            box-shadow: 0 2px 8px var(--cf-bg-overlay);
        }
        
        .litegraph-context-menu .menu-entry {
            padding: 8px 12px;
            cursor: pointer;
        }
        
        .litegraph-context-menu .menu-entry:hover {
            background-color: var(--cf-bg-hover);
        }
    `;
    
    document.head.appendChild(styles);
} 