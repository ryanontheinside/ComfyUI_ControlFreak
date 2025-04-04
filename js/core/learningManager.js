/**
 * Learning mode functionality for controller mapping
 * Manages the process of learning controller inputs and creating mappings (Client-Side)
 */

import { app } from "../../../../scripts/app.js";
import { contextProvider } from './contextProvider.js';
import { showLearningDialog, hideLearningDialog } from '../ui/dialogs.js';
import { detectMappingType, getDefaultSettingsForWidget } from './mappingTypes.js';
import { showNotification } from '../ui/notifications.js';
import { LearningStateManager } from './learningStateManager.js';
import { eventBus } from './eventBus.js';

// Get instances from the context provider
const getContext = () => {
    const mappingEngine = contextProvider.get('mappingEngine');
    const learningState = contextProvider.get('learningState');
    const eventBus = contextProvider.get('eventBus');
    
    if (!mappingEngine || !learningState || !eventBus) {
        console.warn("ControlFreak: Core components not available, functionality may be limited");
    }
    
    return { mappingEngine, learningState, eventBus };
};

// --- Learning Functions ---

/**
 * Start the learning process for a node parameter
 * @param {String|Number} nodeId - The node ID
 * @param {String} paramName - The parameter name
 */
async function startMappingNode(nodeId, paramName) {
    try {
        const { learningState } = getContext();
        if (!learningState) {
            throw new Error("Learning state manager not available");
        }
        
        // Find the node and parameter info
        const node = app.graph.getNodeById(+nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        
        // Find the widget
        const widget = node.widgets.find(w => w.name === paramName);
        if (!widget) {
            throw new Error(`Widget ${paramName} not found on node ${nodeId}`);
        }
        
        // Create the target information
        const target = {
            type: "widget",
            nodeId: +nodeId,
            widgetName: paramName,
            nodeTitle: node.title,
            widgetConfig: null,
            comfyClass: node.comfyClass
        };
        
        // Add widget configuration for min/max if available
        if (widget) {
            target.widgetConfig = {
                type: widget.type,
                config: {
                    min: widget.options?.min,
                    max: widget.options?.max,
                    step: widget.options?.step,
                    precision: widget.options?.precision
                },
                current_value: widget.value
            };
        }
        
        // Start learning mode with this target
        LearningStateManager.getInstance().startLearning('widget', target);
        
        // Show the learning dialog
        showLearningDialog(target);
        
        return true;
    } catch (error) {
        console.error("Controller: Error starting mapping:", error);
        return false;
    }
}

/**
 * Start the learning process for a UI element
 * @param {HTMLElement} element - The UI element to map
 */
function startMappingUI(element) {
    try {
        const { learningState } = getContext();
        if (!learningState) {
            throw new Error("Learning state manager not available");
        }
        
        // Get element info
        const elementId = element.id || "unknown-element";
        const elementType = element.tagName.toLowerCase();
        
        // Create target info
        const target = {
            type: "ui_element",
            elementId,
            elementType,
            elementLabel: element.textContent || element.title || elementId
        };
        
        // Start learning mode with this target
        LearningStateManager.getInstance().startLearning('ui', target);
        
        // Show the learning dialog
        showLearningDialog(target);
        
        return true;
    } catch (error) {
        console.error("Controller: Error starting mapping for UI element:", error);
        return false;
    }
}

/**
 * Start the learning process for a command
 * @param {String} commandId - The command ID
 * @param {Object} options - Additional options
 */
function startMappingCommand(commandId, options = {}) {
    try {
        const { learningState } = getContext();
        if (!learningState) {
            throw new Error("Learning state manager not available");
        }
        
        // Create target info
        const target = {
            type: "command",
            commandId,
            label: options.label || commandId,
            description: options.description || ""
        };
        
        // Start learning mode with this target
        LearningStateManager.getInstance().startLearning('command', target);
        
        // Show the learning dialog
        showLearningDialog(target);
        
        return true;
    } catch (error) {
        console.error("Controller: Error starting mapping for command:", error);
        return false;
    }
}

/**
 * Cancel the learning process
 */
function cancelLearning() {
    try {
        const { learningState } = getContext();
        if (!learningState) {
            throw new Error("Learning state manager not available");
        }
        
        // Reset learning state
        learningState.cancelLearning();
        
        // Hide the learning dialog
        hideLearningDialog();
        
        return true;
    } catch (error) {
        console.error("Controller: Error canceling learning:", error);
        return false;
    }
}

/**
 * Complete the mapping process
 * @param {Object} selectedControl - The selected controller input
 * @param {Object} target - The target information
 * @param {Number} targetMin - Override minimum value
 * @param {Number} targetMax - Override maximum value
 * @param {String} mappingType - Type of mapping
 * @param {Number} stepSize - Step size for increment/decrement mappings
 */
async function completeMapping(selectedControl, target, targetMin, targetMax, mappingType, stepSize) {
    try {
      
        
        const { mappingEngine, learningState } = getContext();
        if (!mappingEngine || !learningState) {
            throw new Error("Core components not available");
        }
        
        // Check if there are existing mappings for this widget
        let existingTransform = null;
        if (target.type === 'widget') {
            const existingMappings = mappingEngine.getMappings().filter(m => 
                m.target && 
                m.target.type === 'widget' && 
                m.target.nodeId === target.nodeId && 
                m.target.widgetName === target.widgetName
            );
            
            // Find the first mapping with transform data as the source of truth
            const sourceMapping = existingMappings.find(m => m.transform && 
                (typeof m.transform.targetMin === 'number' || typeof m.transform.targetMax === 'number'));
            
            if (sourceMapping && sourceMapping.transform) {
                existingTransform = sourceMapping.transform;
                // Use existing min/max if provided ones are undefined
                if (targetMin === undefined && typeof existingTransform.targetMin === 'number') {
                    targetMin = existingTransform.targetMin;
                }
                if (targetMax === undefined && typeof existingTransform.targetMax === 'number') {
                    targetMax = existingTransform.targetMax;
                }
            }
        }
        
        // Build the mapping object
        const mapping = {
            id: `mapping_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            profile: mappingEngine.getActiveProfile(),
            control: {
                type: selectedControl.type,
                deviceId: selectedControl.deviceId,
                id: selectedControl.controlId,
                name: selectedControl.name || `${selectedControl.type} ${selectedControl.controlId}`,
                // Add default input range based on control type
                input_min: 0, // Default
                input_max: 1 // Default
            },
            target: target,
            mappingType: mappingType || detectMappingType(selectedControl.type, target),
            transform: {
                // Default transform info
            }
        };
        
        // Set proper input range based on control type
        if (selectedControl.type === 'midi' || selectedControl.type === 'midi_cc') {
            mapping.control.input_min = 0;
            mapping.control.input_max = 127;
        } else if (selectedControl.type === 'gamepad_axis') {
            mapping.control.input_min = -1;
            mapping.control.input_max = 1;
        }
        
        // Add transform options if specified
        if (targetMin !== undefined && targetMax !== undefined) {
            mapping.transform.targetMin = parseFloat(targetMin);
            mapping.transform.targetMax = parseFloat(targetMax);
        }
        
        // Add step size if specified
        if (stepSize !== undefined) {
            mapping.transform.stepSize = parseFloat(stepSize);
        }
        
        // Add the mapping to the engine
        mappingEngine.addMapping(mapping);
        
        // Save mappings
        mappingEngine.saveMappings();
        
        // Reset learning state
        learningState.completeLearning();
        
        // Close dialog
        hideLearningDialog();
        
        // Trigger highlight of the mapped parameter
        if (target.type === 'widget') {
            const node = app.graph.getNodeById(target.nodeId);
            if (node) {
                const canvas = app.canvas;
                if (canvas) {
                    // Center on the node
                    canvas.centerOnNode(node);
                    
                    // Emit event to highlight the parameter
                    const { eventBus } = getContext();
                    if (eventBus) {
                        eventBus.emit('learning:complete', {
                            mapping: mapping,
                            target: target,
                            node: node
                        });
                    }
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error("Controller: Error completing mapping:", error);
        return false;
    }
}

/**
 * Initiates the Quick Learning process for a specific node widget.
 * @param {object} node - The LiteGraph node object.
 * @param {object} widget - The specific widget on the node.
 */
export function startQuickMapping(node, widget) {
    const learningState = LearningStateManager.getInstance();
    if (!node || !widget) {
        console.error("ControlFreak: Quick Mapping requires a valid node and widget.");
        showNotification("Error starting quick map: Node or widget invalid", "error");
        return;
    }

    try {
        // Cancel any existing learning process
        learningState.cancelLearning();

        // Get default settings based on the widget type
        const defaultSettings = getDefaultSettingsForWidget(widget);

        // Start the quick learning state
        learningState.startQuickLearning(node, widget, defaultSettings);

        // Show a notification to the user
        showNotification(`Quick Mapping: Move controller for '${widget.name}'...`, "info", 5000);

        // Note: The actual mapping creation happens when the next controller input is received
        // This will be handled by the global controller input listener

    } catch (error) {
        console.error("ControlFreak: Error starting Quick Mapping:", error);
        showNotification("Error initiating quick mapping. Check console.", "error");
        learningState.cancelLearning(); // Ensure state is reset on error
    }
}

// Export the learning functions
export { 
    startMappingNode, 
    startMappingUI, 
    startMappingCommand, 
    cancelLearning, 
    completeMapping 
}; 