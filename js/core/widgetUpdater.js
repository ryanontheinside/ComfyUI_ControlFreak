/**
 * Widget Update functionality for ComfyUI_ControlFreak
 */
import { highlightNodeParameter } from "../handlers/controllerEventHandlers.js";

/**
 * Updates a widget value in a ComfyUI node
 * @param {Object} app - The ComfyUI app instance
 * @param {String} nodeId - ID of the node containing the widget
 * @param {String} widgetName - Name of the widget to update
 * @param {*} value - New value to set
 * @param {String} [mappingType="Absolute"] - The type of mapping that generated the value
 * @param {Object} [mappingConfig] - The mapping configuration with transform info
 * @param {Boolean} [alreadyTransformed=false] - Flag indicating if the value has already been transformed to target range
 */
export function updateWidgetValue(app, nodeId, widgetName, value, mappingType = "Absolute", mappingConfig = null, alreadyTransformed = false) {
    // Requires access to the ComfyUI app object or graph
    if (app && app.graph) {
        const node = app.graph.getNodeById(nodeId);
        if (node) {
            const widget = node.widgets.find(w => w.name === widgetName);
            if (widget) {
                // Find the relevant mapping to check mapping type
                const finalValue = calculateFinalValue(widget, value, mappingType, mappingConfig, alreadyTransformed);
                
                // Store the old value for comparison/callbacks
                const oldValue = widget.value;
                
                // Update the widget value
                let preparedValue = finalValue;
                if (widget.type === "combo") {
                    // For combo widgets, ensure we set the value in the correct format
                    preparedValue = prepareComboWidgetValue(widget, finalValue);
                    widget.value = preparedValue;
                } else {
                    widget.value = finalValue;
                }

                // CRITICAL: Update the serialized widget values array
                updateSerializedWidgetValue(node, widget, preparedValue);
                
                // Trigger visual feedback
                highlightNodeParameter(nodeId, widgetName, app);
                
                // Mark the widget as dirty
                widget.dirty = true;

                // Apply necessary ComfyUI callbacks and state updates
                notifyComfyUI(app, node, widget, widgetName, finalValue, oldValue);
            } else {
                console.warn(`MappingEngine: Widget ${widgetName} not found on node ${nodeId}`);
            }
        } else {
             console.warn(`MappingEngine: Node ${nodeId} not found`);
        }
    } else {
         console.error("MappingEngine: Cannot access ComfyUI app or graph object.");
    }
}

/**
 * Calculate the final widget value based on widget properties
 * @param {Object} widget - The ComfyUI widget object
 * @param {*} value - The input value
 * @param {String} mappingType - The type of mapping
 * @param {Object} mappingConfig - The mapping configuration with transform info
 * @param {Boolean} [alreadyTransformed=false] - Flag indicating if the value has already been transformed to target range
 * @returns {*} The final calculated value
 */
function calculateFinalValue(widget, value, mappingType, mappingConfig, alreadyTransformed = false) {
    let finalValue = value;
    
    // Convert mapping type to lowercase for easier comparison
    const mappingTypeLower = mappingType ? mappingType.toLowerCase() : '';
    
    // For increment and decrement, the value is already calculated with the step size in mappingTypes.js
    // We should still apply other widget properties like min/max clamping
    if (mappingTypeLower === "incremental" || mappingTypeLower === "increment" || 
        mappingTypeLower === "decremental" || mappingTypeLower === "decrement") {
        
        // Get min/max values for clamping
        const min = (mappingConfig && typeof mappingConfig.transform?.targetMin === 'number') 
            ? mappingConfig.transform.targetMin 
            : (widget.options && typeof widget.options.min === 'number' ? widget.options.min : 0);
            
        const max = (mappingConfig && typeof mappingConfig.transform?.targetMax === 'number') 
            ? mappingConfig.transform.targetMax 
            : (widget.options && typeof widget.options.max === 'number' ? widget.options.max : 1);
        
        // Apply step size if it's defined in mapping config (this should already be applied in mappingTypes.js)
        // This is just a safety measure
        const userDefinedStep = mappingConfig?.transform?.stepSize;
        if (typeof userDefinedStep === 'number') {
            // Make sure value is aligned to steps relative to min
            finalValue = Math.round((finalValue - min) / userDefinedStep) * userDefinedStep + min;
        }
        
        // Apply precision if defined
        if (typeof widget.options?.precision === 'number') {
            finalValue = parseFloat(finalValue.toFixed(widget.options.precision));
        }
        
        // Clamp value to min/max
        finalValue = Math.max(min, Math.min(max, finalValue));
    } else {
        // Original direct mapping logic for other mapping types
        
        // Get min/max values, preferring mapping overrides when available
        const min = (mappingConfig && typeof mappingConfig.transform?.targetMin === 'number') 
            ? mappingConfig.transform.targetMin 
            : (widget.options && typeof widget.options.min === 'number' ? widget.options.min : 0);
            
        const max = (mappingConfig && typeof mappingConfig.transform?.targetMax === 'number') 
            ? mappingConfig.transform.targetMax 
            : (widget.options && typeof widget.options.max === 'number' ? widget.options.max : 1);
        
        // Scale the value from 0-1 range to min-max range for direct mapping
        // This is critical for proper axis mapping
        if (typeof value === 'number') {
            if (alreadyTransformed) {
                // If already transformed in mappingTypes.js, don't re-scale
                finalValue = value;
            } else if (value >= 0 && value <= 1) {
                // Otherwise, scale from [0,1] to [min,max]
                finalValue = min + value * (max - min);
            }
        }
        
        // Apply step rounding if defined by user in mapping config
        if (mappingTypeLower === "direct" || mappingTypeLower === "absolute") {
            // First prioritize step from mapping config
            const userDefinedStep = mappingConfig?.transform?.stepSize;
            if (typeof userDefinedStep === 'number') {
                finalValue = Math.round((finalValue - min) / userDefinedStep) * userDefinedStep + min;
            }
            // Do not use widget steps for direct/absolute mapping - user must specify their desired step
        } else if (typeof widget.options?.step === 'number') {
            // For other mapping types still apply step if defined
            finalValue = Math.round(finalValue / widget.options.step) * widget.options.step;
        }
        
        // Apply precision if defined
        if (typeof widget.options?.precision === 'number') {
            finalValue = parseFloat(finalValue.toFixed(widget.options.precision));
        }
        
        // Clamp value to min/max (using the overridden values if available)
        finalValue = Math.max(min, Math.min(max, finalValue));
    }
    
    // Handle toggle type
    if (widget.type === "toggle") {
        // Handle toggle based on threshold (e.g., > 0.5)
        finalValue = value > 0.5;
    } else if (widget.type === "combo") {
        // Handle combo boxes by mapping the normalized value to an index in the options array
        if (widget.options && Array.isArray(widget.options.values)) {
            const optionsCount = widget.options.values.length;
            if (optionsCount > 0) {
                // If the value is already transformed in mappingTypes.js, use it directly
                if (alreadyTransformed && Number.isInteger(value)) {
                    // Just use the index value directly, no further transformation needed
                    finalValue = value;
                }
                // For absolute/direct mapping with 0-1 normalized values
                else if (typeof value === 'number' && value >= 0 && value <= 1) {
                    // Map 0-1 range to indices of available options
                    // For 3 options: 0-0.33 = 0, 0.33-0.66 = 1, 0.66-1 = 2
                    const index = Math.min(Math.floor(value * optionsCount), optionsCount - 1);
                    finalValue = index;
                } else if (mappingTypeLower === "increment" || mappingTypeLower === "incremental") {
                    // For incremental mapping, cycle through options
                    const currentIndex = typeof widget.value === 'number' ? widget.value : 0;
                    const newIndex = (currentIndex + 1) % optionsCount;
                    finalValue = newIndex;
                } else if (mappingTypeLower === "decrement" || mappingTypeLower === "decremental") {
                    // For decremental mapping, cycle through options in reverse
                    const currentIndex = typeof widget.value === 'number' ? widget.value : 0;
                    const newIndex = (currentIndex - 1 + optionsCount) % optionsCount;
                    finalValue = newIndex;
                }
            }
        }
    } // Add more type handling as needed
    
    return finalValue;
}

/**
 * Prepares a value specifically for a ComfyUI combo widget.
 * ComfyUI combo widgets can accept either an index or a string value.
 * This function ensures we're using the right format.
 * 
 * @param {Object} widget - The combo widget
 * @param {Number|String} value - The value to prepare
 * @returns {Number|String} - The properly formatted value
 */
function prepareComboWidgetValue(widget, value) {
    // Make sure we have a widget with options
    if (!widget.options || !Array.isArray(widget.options.values) || widget.options.values.length === 0) {
        console.warn("Invalid combo widget structure:", widget);
        return value;
    }
    
    const optionsCount = widget.options.values.length;
    
    // If value is a number, treat it as an index and make sure it's in range
    if (typeof value === 'number') {
        // Make sure the index is within bounds
        const validIndex = Math.max(0, Math.min(Math.floor(value), optionsCount - 1));
        
        // For ComfyUI, some combo widgets expect string values, others expect indices
        // Check the current value type to determine what's expected
        if (typeof widget.value === 'string') {
            // If the current value is a string, return the corresponding string option
            return widget.options.values[validIndex];
        } else {
            // If the current value is a number, return the index
            return validIndex;
        }
    }
    
    // If value is a string, find the matching option or use first option
    if (typeof value === 'string') {
        const index = widget.options.values.indexOf(value);
        if (index !== -1) {
            return typeof widget.value === 'number' ? index : value;
        }
        // If string not found in options, return first option
        return typeof widget.value === 'number' ? 0 : widget.options.values[0];
    }
    
    // Fallback - just use the first option
    return typeof widget.value === 'number' ? 0 : widget.options.values[0];
}

/**
 * Update the serialized widget value in the node
 * @param {Object} node - The ComfyUI node object
 * @param {Object} widget - The widget object
 * @param {*} finalValue - The value to set
 */
function updateSerializedWidgetValue(node, widget, finalValue) {
    // Find the widget index in the widgets array
    const widgetIndex = node.widgets.indexOf(widget);
    if (widgetIndex !== -1) {
        // Ensure widgets_values exists and has at least widgetIndex elements
        if (!node.widgets_values) {
            node.widgets_values = [];
        }
        // Extend array if needed
        while (node.widgets_values.length <= widgetIndex) {
            node.widgets_values.push(null);
        }
        
        // Set the value in the array that will be serialized
        node.widgets_values[widgetIndex] = finalValue;
    }
}

/**
 * Notify ComfyUI about widget value changes
 * @param {Object} app - The ComfyUI app instance
 * @param {Object} node - The node object
 * @param {Object} widget - The widget object
 * @param {String} widgetName - The name of the widget
 * @param {*} finalValue - The new value
 * @param {*} oldValue - The previous value
 */
function notifyComfyUI(app, node, widget, widgetName, finalValue, oldValue) {
    // CRITICAL: Notify ComfyUI that the widget value has changed
    if (node.onWidgetChanged) {
        node.onWidgetChanged(widgetName, finalValue, oldValue, widget);
    }
    
    // Call the widget's callback (this is how ComfyUI normally updates values)
    if (widget.callback) {
        try {
            widget.callback(finalValue, app.canvas, node, widgetName, null);
        } catch (e) {
            console.error(`MappingEngine: Error in widget callback: ${e}`);
        }
    }
    
    // CRITICAL: Mark the graph as changed - this triggers serialization in ComfyUI
    if (app.graph) {
        app.graph.change();
        
        // No need to manually save to localStorage/sessionStorage
        // ComfyUI will handle this automatically through its own persistence mechanisms
        // when app.graph.change() is called
    }
    
    // Call widget_changed if it exists (used in ComfyUI for some widget types)
    if (app.graph && app.graph.onNodeWidgetChanged) {
        app.graph.onNodeWidgetChanged(finalValue, app.canvas, node, widgetName, widget);
    }
} 