/**
 * Mapping Type implementations for ComfyUI_ControlFreak
 * 
 * This module contains utility functions for handling different mapping types
 * and transforming input values based on the mapping configuration.
 * 
 * @module mappingTypes
 */

/**
 * Determine if a command should be triggered based on input value and mapping type
 * @param {Object} mapping - The mapping object
 * @param {Number} rawInputValue - The raw input value from the controller
 * @returns {Boolean} Whether the command should be triggered
 */
export function shouldTriggerCommand(mapping, rawInputValue) {
    const mappingType = (mapping.mappingType || "Toggle").toLowerCase();
    
    // Define a threshold based on raw input range
    const inputMin = mapping.control?.input_min ?? 0;
    const inputMax = mapping.control?.input_max ?? 1;
    // Use a threshold relative to the input range (e.g., 50%)
    const threshold = inputMin + (inputMax - inputMin) * 0.5;

    switch (mappingType) {
        case "momentary":
            // Trigger when raw value is above the calculated threshold
            return rawInputValue > threshold;
            
        case "toggle":
            // Only trigger on rising edge (transition above threshold)
            if (!mapping._lastRawValueOverThreshold && rawInputValue > threshold) {
                mapping._lastRawValueOverThreshold = true; // Store current state
                return true;
            }
            mapping._lastRawValueOverThreshold = rawInputValue > threshold;
            return false;
            
        case "trigger":
            // Like toggle, but always triggers when pressed (above threshold)
            return rawInputValue > threshold;
            
        default:
            // For other types, use simple threshold
            return rawInputValue > threshold;
    }
}

/**
 * Transform input value based on mapping settings
 * @param {Object} mapping - The mapping object
 * @param {Number} rawInputValue - The raw input value from the controller
 * @param {Object} app - The ComfyUI app object
 * @returns {Number | undefined} Transformed value (scaled to target range) or undefined if no update should occur
 */
export function transformInputValue(mapping, rawInputValue, app) {
    // Get transform settings and mapping type
    const transform = mapping.transform || {};
    const mappingType = (mapping.mappingType || "direct").toLowerCase();
    
    // Get input range from mapping control data (with defaults)
    const inputMin = mapping.control?.input_min ?? 0;
    const inputMax = mapping.control?.input_max ?? (inputMin === 0 ? 1 : 127); // Guess max based on min
    
    // Get target range from mapping transform data (with defaults)
    const targetMin = transform.targetMin ?? 0;
    const targetMax = transform.targetMax ?? 1;
    
    // --- Normalization --- 
    let normalizedValue = 0; // Default to 0
    // Avoid division by zero
    if (inputMax !== inputMin) {
        // Check if this is a gamepad axis - for these we need to handle differently
        const isGamepadAxis = mapping.control?.type?.toLowerCase().includes('axis');
        
        if (isGamepadAxis) {
            // For gamepad axes we need special handling
            // Map from [-1, 1] to [0, 1] using a different approach
            // Add 1 to shift from [-1,1] to [0,2], then divide by 2 to get [0,1]
            normalizedValue = (rawInputValue + 1) / 2;
        } else {
            // Normal scaling for other controllers from input range to [0,1]
            const scaledValue = (rawInputValue - inputMin) / (inputMax - inputMin);
            // Clamp between 0 and 1
            normalizedValue = Math.max(0, Math.min(1, scaledValue));
        }
    } else if (rawInputValue >= inputMin) {
        // If range is zero, output 1 if value is at or above the single point, else 0
        normalizedValue = 1;
    }

    // --- Value Transformation based on Mapping Type --- 
    let finalValue = 0; // Initialize final value

    // Apply different transform based on mapping type, using the *normalizedValue*
    switch (mappingType) {
        case "direct":
        case "absolute":
            // Check if the target is a combo widget
            if (mapping.target?.type === 'widget') {
                try {
                    const node = app.graph.getNodeById(mapping.target.nodeId);
                    if (node) {
                        const widget = node.widgets.find(w => w.name === mapping.target.widgetName);
                        
                        if (widget && widget.type === "combo" && widget.options && Array.isArray(widget.options.values)) {
                            // For combo widgets, map the normalized value to the proper index
                            const optionsCount = widget.options.values.length;
                            if (optionsCount > 0) {
                                // Map 0-1 range to indices of available combo options
                                const index = Math.min(Math.floor(normalizedValue * optionsCount), optionsCount - 1);
                                return index; // Return the index directly
                            }
                        }
                    }
                } catch (error) {
                    console.error("MappingEngine: Error processing combo widget:", error);
                }
            }
            
            // Direct mapping for normal widgets: scale normalizedValue (0-1) to target range
            finalValue = targetMin + normalizedValue * (targetMax - targetMin);
            
            // Use step size from transform if available - this is user defined
            if (transform.stepSize) {
                finalValue = Math.round((finalValue - targetMin) / transform.stepSize) * transform.stepSize + targetMin;
            }
            // We skip widget step detection since user can define their own step size in mapping config
            
            return finalValue;
            
        case "toggle":
            // Simple binary toggle based on normalized threshold
            finalValue = normalizedValue > 0.5 ? targetMax : targetMin; // Use target range for on/off
            // Note: Toggle state logic might be better handled in the widget updater
            return finalValue;
            
        case "momentary":
            // Similar to toggle but state resets when released (normalized value drops)
            finalValue = normalizedValue > 0.5 ? targetMax : targetMin;
            return finalValue;
            
        case "incremental":
        case "increment":
            // Only increment on button press (rising edge of normalized value)
            if (!mapping._lastNormalizedActive && normalizedValue > 0.5) {
                mapping._lastNormalizedActive = true; // Set active flag immediately
                
                // Handle combo boxes specially
                if (mapping.target?.type === 'widget') {
                    try {
                        const node = app.graph.getNodeById(mapping.target.nodeId);
                        if (node) {
                            const widget = node.widgets.find(w => w.name === mapping.target.widgetName);
                            if (widget && widget.type === "combo" && widget.options && Array.isArray(widget.options.values)) {
                                // For combo widgets, cycle to the next option
                                const optionsCount = widget.options.values.length;
                                if (optionsCount > 0) {
                                    const currentIndex = typeof widget.value === 'number' ? widget.value : 0;
                                    const newIndex = (currentIndex + 1) % optionsCount;
                                    return newIndex; // Return the new index directly
                                }
                            }
                        }
                    } catch (error) {
                        console.error("MappingEngine: Error processing combo widget increment:", error);
                    }
                }
                
                // Regular increment for normal widgets
                // Get current widget value (needs targetMin/Max from widget itself ideally)
                let currentValue = targetMin; // Default to targetMin
                if (mapping.target && mapping.target.type === 'widget') {
                    try {
                        const node = app.graph.getNodeById(mapping.target.nodeId);
                        if (node) {
                            const widget = node.widgets.find(w => w.name === mapping.target.widgetName);
                            if (widget && typeof widget.value !== 'undefined') {
                                currentValue = widget.value;
                            }
                        }
                    } catch (error) {
                        console.error("MappingEngine: Error getting widget value for increment:", error);
                    }
                }
                
                // Calculate the new value
                const stepSize = transform.stepSize || (targetMax - targetMin) * 0.1; // Default step 10% of range
                const newValue = currentValue + stepSize;
                
                // Clamp to targetMax
                finalValue = Math.min(newValue, targetMax);
                
                return finalValue; // Return the calculated value
            }
            // If not a rising edge, update the state but signal no change
            mapping._lastNormalizedActive = normalizedValue > 0.5;
            return undefined; // Indicate no update should occur
            
        case "decremental":
        case "decrement":
            // Only decrement on button press (rising edge of normalized value)
            if (!mapping._lastNormalizedActive && normalizedValue > 0.5) {
                mapping._lastNormalizedActive = true; // Set active flag immediately
                
                // Handle combo boxes specially
                if (mapping.target?.type === 'widget') {
                    try {
                        const node = app.graph.getNodeById(mapping.target.nodeId);
                        if (node) {
                            const widget = node.widgets.find(w => w.name === mapping.target.widgetName);
                            if (widget && widget.type === "combo" && widget.options && Array.isArray(widget.options.values)) {
                                // For combo widgets, cycle to the previous option
                                const optionsCount = widget.options.values.length;
                                if (optionsCount > 0) {
                                    const currentIndex = typeof widget.value === 'number' ? widget.value : 0;
                                    const newIndex = (currentIndex - 1 + optionsCount) % optionsCount;
                                    return newIndex; // Return the new index directly
                                }
                            }
                        }
                    } catch (error) {
                        console.error("MappingEngine: Error processing combo widget decrement:", error);
                    }
                }
                
                // Regular decrement for normal widgets
                // Get current widget value
                let currentValue = targetMax; // Default to targetMax
                if (mapping.target && mapping.target.type === 'widget') {
                    try {
                        const node = app.graph.getNodeById(mapping.target.nodeId);
                        if (node) {
                            const widget = node.widgets.find(w => w.name === mapping.target.widgetName);
                            if (widget && typeof widget.value !== 'undefined') {
                                currentValue = widget.value;
                            }
                        }
                    } catch (error) {
                        console.error("MappingEngine: Error getting widget value for decrement:", error);
                    }
                }
                
                // Calculate the new value
                const stepSize = transform.stepSize || (targetMax - targetMin) * 0.1; // Default step 10% of range
                const newValue = currentValue - stepSize;
                
                // Clamp to targetMin
                finalValue = Math.max(newValue, targetMin);
                
                return finalValue; // Return the calculated value
            }
            // If not a rising edge, update the state but signal no change
            mapping._lastNormalizedActive = normalizedValue > 0.5;
            return undefined; // Indicate no update should occur
            
        case "trigger":
            // Trigger actions only occur on the rising edge and don't change values
            if (!mapping._lastNormalizedActive && normalizedValue > 0.5) {
                mapping._lastNormalizedActive = true;
                // For trigger type, the command executor uses shouldTriggerCommand.
                // We return undefined here as no value needs to be set on a target widget.
                return undefined; 
            }
            mapping._lastNormalizedActive = normalizedValue > 0.5;
            return undefined; // No value update
            
        default:
            // Fallback: Direct mapping if type is unknown
            finalValue = targetMin + normalizedValue * (targetMax - targetMin);
            
            // Use step size from transform if available - this is user defined
            if (transform.stepSize) {
                finalValue = Math.round((finalValue - targetMin) / transform.stepSize) * transform.stepSize + targetMin;
            }
            // We skip widget step detection since user can define their own step size in mapping config
            
            return finalValue;
    }
}

/**
 * Auto-detect an appropriate mapping type based on controller type and target widget
 * @param {String} controlType - The type of controller
 * @param {Object} targetConfig - Information about the target (optional)
 * @returns {String} The suggested mapping type
 */
export function detectMappingType(controlType, targetConfig = null) {
    if (!controlType) return 'direct';
    
    const type = controlType.toLowerCase();
    
    // Check if we're mapping to a combo widget
    const isComboWidget = targetConfig && 
                          targetConfig.widgetConfig && 
                          targetConfig.widgetConfig.type === "combo";
    
    if (type.includes('button') || type === 'midi_note') {
        // For buttons mapping to combo widgets, incremental cycling is usually best
        if (isComboWidget) {
            return 'increment';
        }
        return 'toggle'; // Default for buttons to other widget types
    } else {
        // For continuous controllers (like knobs, sliders, etc.)
        if (isComboWidget) {
            return 'direct'; // Direct mapping for continuous controllers to combo boxes
        }
        return 'direct'; // Default for continuous controls (was 'Absolute')
    }
}

/**
 * Determines default mapping settings based on the provided widget.
 * @param {object} widget - The ComfyUI widget object.
 * @returns {object} Default mapping settings (mappingMode, rangeMin, rangeMax, sensitivity, toggleThreshold).
 */
export function getDefaultSettingsForWidget(widget) {
    const defaults = {
        mappingMode: 'absolute', // Default mode
        rangeMin: 0,
        rangeMax: 1,
        sensitivity: 1.0,
        toggleThreshold: 0.5, // Default for toggle mode
        isInverted: false, // Default inversion state
    };

    if (!widget || !widget.type) {
        console.warn("ControlFreak: Cannot determine default settings for unknown widget type.");
        return defaults;
    }

    const widgetType = widget.type.toLowerCase();
    const config = widget.options || widget.config || {}; // Look for widget configuration

    switch (widgetType) {
        case 'number':
        case 'float':
        case 'int':
            defaults.mappingMode = 'absolute';
            // Use widget's min/max if available, otherwise keep 0-1
            defaults.rangeMin = typeof config.min === 'number' ? config.min : 0;
            defaults.rangeMax = typeof config.max === 'number' ? config.max : 1;
            // Adjust if min/max are the same (though unlikely)
            if (defaults.rangeMin === defaults.rangeMax) defaults.rangeMax = defaults.rangeMin + 1;
            defaults.sensitivity = 1.0;
            break;

        case 'boolean':
            defaults.mappingMode = 'toggle';
            defaults.rangeMin = 0;
            defaults.rangeMax = 1;
            defaults.toggleThreshold = 0.5;
            break;

        case 'toggle': // Sometimes used for boolean-like behavior
             defaults.mappingMode = 'toggle';
             defaults.rangeMin = 0;
             defaults.rangeMax = 1;
             defaults.toggleThreshold = 0.5;
             break;

        case 'combo':
        case 'combobox':
            defaults.mappingMode = 'absolute'; // Map 0-1 across options
            defaults.rangeMin = 0;
            defaults.rangeMax = 1; // Simplifies quick mapping; user can refine later
            // If we could reliably get options count:
            // const optionsCount = Array.isArray(config.values) ? config.values.length : 0;
            // defaults.rangeMax = optionsCount > 0 ? optionsCount - 1 : 1;
            // defaults.mappingMode = 'step'; // Could also default to step
            break;

        // Add cases for other specific widget types if needed
        // e.g., case 'slider': ...

        default:
            console.log(`ControlFreak: Using default absolute mapping for widget type: ${widgetType}`);
            // Keep the initial defaults (absolute, 0-1)
            break;
    }

    // Ensure rangeMin is less than rangeMax
    if (defaults.rangeMin > defaults.rangeMax) {
        [defaults.rangeMin, defaults.rangeMax] = [defaults.rangeMax, defaults.rangeMin];
    }

    return defaults;
} 