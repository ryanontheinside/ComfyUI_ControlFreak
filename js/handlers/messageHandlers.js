/**
 * Controller event handlers for backward compatibility
 * Simplified version for client-side architecture
 */

import { handleControlUpdate, highlightNodeParameter } from "./controllerEventHandlers.js";
import { app } from "../../../../scripts/app.js";

/**
 * Handle node update for widget value changes
 * @param {Object} data - The update data
 * @param {Object} app - The ComfyUI app instance
 */
function handleNodeUpdate(data, app) {
    const nodeId = data.node_id;
    const paramName = data.param_name;
    const value = data.value;
    
    console.log(`ControlFreak: Updating node ${nodeId} parameter ${paramName} to value ${value}`);
    
    const node = app.graph.getNodeById(nodeId);
    if (!node) {
        console.error(`ControlFreak: Node with ID ${nodeId} not found`);
        return;
    }
    
    // Find the widget
    const widget = node.widgets.find(w => w.name === paramName);
    if (!widget) {
        console.error(`ControlFreak: Widget ${paramName} not found on node ${nodeId}`);
        return;
    }
    
    console.log(`ControlFreak: Found widget ${widget.name} of type ${widget.type} with current value ${widget.value}`);
    
    // Update the value
    const oldValue = widget.value;
    widget.value = value;
    
    // Ensure the value was actually updated
    console.log(`ControlFreak: Value changed from ${oldValue} to ${widget.value}`);
    
    // Update the serialized widget values array
    const widgetIndex = node.widgets.indexOf(widget);
    if (widgetIndex !== -1) {
        if (!node.widgets_values) {
            node.widgets_values = [];
        }
        while (node.widgets_values.length <= widgetIndex) {
            node.widgets_values.push(null);
        }
        node.widgets_values[widgetIndex] = value;
    }
    
    // Notify ComfyUI that the widget value has changed
    if (node.onWidgetChanged) {
        node.onWidgetChanged(widget.name, widget.value, oldValue, widget);
    }
    
    // Force a redraw
    widget.dirty = true;
    
    // Call the widget's callback
    if (widget.callback) {
        try {
            widget.callback(widget.value, app.canvas, node, widget.name, null);
        } catch (e) {
            console.error(`ControlFreak: Error in widget callback: ${e}`);
        }
    }
    
    // Mark the graph as changed
    if (app.graph) {
        app.graph.change();
        
        // Try to trigger a workflow save
        try {
            if (app.ui && typeof app.ui.persistenceService?.persistCurrentWorkflow === 'function') {
                app.ui.persistenceService.persistCurrentWorkflow();
            }
        } catch (error) {
            console.error("ControlFreak: Error triggering workflow save:", error);
        }
    }
}

// Export only what's needed
export {
    handleNodeUpdate
}; 