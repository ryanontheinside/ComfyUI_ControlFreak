/**
 * Styles for Control Freak custom nodes in ComfyUI
 */

/**
 * Apply custom styling to Control Freak nodes in the ComfyUI graph
 */
export function applyNodeStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'controlfreak-node-styles';
    styleElement.textContent = `
        /* Control Freak node styling */
        .comfy-node.ControlFreak-node .title {
            background: linear-gradient(90deg, var(--cf-bg-primary), var(--cf-brand-primary) 120%) !important;
            font-family: var(--cf-brand-font);
        }
        
        .comfy-node.ControlFreak-node .title-text {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .comfy-node.ControlFreak-node .title-text::before {
            content: "🎮";
            font-size: 14px;
        }
        
        /* Style specific nodes */
        .comfy-node.ControlFreak-ControllerMapping .body {
            background-color: rgba(255, 87, 34, 0.1);
        }
        
        .comfy-node.ControlFreak-ControllerInfo .body {
            background-color: rgba(139, 195, 74, 0.1);
        }
        
        /* Add a subtle border */
        .comfy-node.ControlFreak-node {
            box-shadow: 0 0 0 1px var(--cf-brand-primary);
        }
    `;
    
    // Add to document if not already present
    if (!document.getElementById('controlfreak-node-styles')) {
        document.head.appendChild(styleElement);
    }
}

/**
 * Apply node styling when a Control Freak node is created
 * @param {LGraphNode} node - The LiteGraph node being created
 */
export function styleNode(node) {
    if (!node || !node.constructor) return;
    
    // Check if this is a Control Freak node based on naming convention
    const nodeName = node.constructor.type || '';
    if (nodeName.includes('ControlFreak') || nodeName.includes('ControllerMapping') || nodeName.includes('ControllerInfo')) {
        // Add the Control Freak class
        node.classList = node.classList || {};
        node.classList.add('ControlFreak-node');
        
        // Add specific node class based on type
        if (nodeName.includes('ControllerMapping')) {
            node.classList.add('ControlFreak-ControllerMapping');
        } else if (nodeName.includes('ControllerInfo')) {
            node.classList.add('ControlFreak-ControllerInfo');
        }
    }
} 