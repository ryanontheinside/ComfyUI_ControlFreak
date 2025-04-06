/**
 * Controller event handlers for controller mapping
 * Handles events from connected controllers and provides UI feedback (Client-Side)
 */

import { app } from "../../../../scripts/app.js"; // Needed for highlightNodeParameter
import { contextProvider } from "../core/contextProvider.js";
import { eventBus } from "../core/eventBus.js";

/**
 * Highlight a node parameter for visual feedback
 * @param {String} nodeId - The ID of the node
 * @param {String} paramName - The name of the parameter
 */
function highlightNodeParameter(nodeId, paramName) {
    // Find the node
    const node = app.graph.getNodeById(+nodeId); // Convert to number if needed
    if (!node || !app?.canvas) return;
    
    // Add a visual highlight
    node.highlight = true;
    
    // Remove highlight after a short delay
    setTimeout(() => {
        node.highlight = false;
        app.canvas.draw(true, true);
    }, 100);
    
    // Force redraw
    app.canvas.draw(true, true);
}

/**
 * Handle control update with visual feedback
 * @param {Object} data - The update data
 */
function handleControlUpdate(data) {
    // If data has the target structure
    if (data?.target?.type === 'widget' && data.target.nodeId) {
        highlightNodeParameter(data.target.nodeId, data.target.widgetName);
        
        // Emit event for other handlers
        eventBus.emit('widget:highlighted', {
            nodeId: data.target.nodeId,
            widgetName: data.target.widgetName,
            value: data.value
        });
    }
}

// Set up event listeners for the event bus
eventBus.on('mapping:applying', (mapping, rawValue, transformedValue) => {
    handleControlUpdate({
        target: mapping.target,
        value: transformedValue,
        rawValue: rawValue
    });
});

// Export the remaining functions
export { highlightNodeParameter, handleControlUpdate }; 