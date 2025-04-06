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
        
        // Show the learning dialog and store its reference in the state
        const { dialog } = showLearningDialog(target);
        LearningStateManager.getInstance().setDialog(dialog);
        
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
        
        // Show the learning dialog and store its reference in the state
        const { dialog } = showLearningDialog(target);
        LearningStateManager.getInstance().setDialog(dialog);
        
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
        
        // Show the learning dialog and store its reference in the state
        const { dialog } = showLearningDialog(target);
        LearningStateManager.getInstance().setDialog(dialog);
        
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
 * @param {Boolean} isInverted - Whether the output should be inverted
 */
async function completeMapping(selectedControl, target, targetMin, targetMax, mappingType, stepSize, isInverted) {
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
                isInverted: !!isInverted,
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
        
        // Add target range and step size to transform if provided
        if (targetMin !== undefined) mapping.transform.targetMin = targetMin;
        if (targetMax !== undefined) mapping.transform.targetMax = targetMax;
        if (stepSize !== undefined && (mapping.mappingType === "incremental" || mapping.mappingType === "decremental")) {
             mapping.transform.stepSize = stepSize;
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

// --- Moved Function: showDetectedInput --- 
/**
 * Show detected input during learning mode
 * @param {Object} controlInput - The formatted control input data
 * @param {Object} uiContext - UI context (optional, primarily for direct calls)
 * @returns {boolean} Whether the input was handled successfully
 */
function showDetectedInput(controlInput, uiContext = {}) {
    const { learningState } = getContext(); // Use getContext consistently
    if (!learningState) {
        console.error("ControlFreak: Learning state not available in showDetectedInput");
        return false;
    }

    // Try to get the UI elements from the provided context first
    let inputContainer = uiContext.inputContainer;
    let mapButton = uiContext.mapButton;

    // If not provided, get from the learningDialog stored in the state
    if ((!inputContainer || !mapButton) && learningState.learningDialog) {
        const dialog = learningState.learningDialog;
        inputContainer = dialog.querySelector(".controller-mapping-input-list");
        mapButton = dialog.querySelector(".controller-map-button");
    }

    // Last resort: query the DOM directly if still not found (e.g., if dialog wasn't stored in state correctly)
    if (!inputContainer) {
        const dialog = document.querySelector(".controller-mapping-dialog");
        if (dialog) {
            inputContainer = dialog.querySelector(".controller-mapping-input-list");
            mapButton = dialog.querySelector(".controller-map-button");
        }
    }

    // If UI elements are still not found, log error and exit
    if (!inputContainer) {
        console.error("ControlFreak: Input container could not be found for showDetectedInput.");
        return false;
    }

    const { deviceId, controlId, type, deviceName, rawValue, name } = controlInput;
    const displayName = name || deviceName || controlId;

    const instructionEl = inputContainer.querySelector(".controller-mapping-instruction");
    if (instructionEl) {
        inputContainer.removeChild(instructionEl);
    }

    let controlElement = inputContainer.querySelector(`[data-control-id="${controlId}"][data-device-id="${deviceId}"]`);
    
    if (!controlElement) {
        controlElement = document.createElement("div");
        controlElement.dataset.controlId = controlId;
        controlElement.dataset.deviceId = deviceId;
        const isButton = type?.includes("button");
        controlElement.dataset.controlType = isButton ? "button" : "axis";
        const controlTypeIndicator = isButton ? "🔘" : "↔️";

        controlElement.innerHTML = `<strong>${controlTypeIndicator} ${displayName}</strong>: <span class="value">${rawValue.toFixed(2)}</span>`;
        // Apply necessary styles programmatically or ensure CSS handles this
        controlElement.style.marginBottom = "5px"; 
        controlElement.style.padding = "8px";
        controlElement.style.borderRadius = "3px";
        controlElement.style.cursor = "pointer";
        controlElement.style.transition = "background-color 0.3s";
        controlElement.style.backgroundColor = "#2a2a3a"; // Consider using CSS variables
        controlElement.style.border = "1px solid #444"; // Consider using CSS variables

        const controlData = {
            deviceId: deviceId,
            controlId: controlId,
            name: displayName,
            type: type
        };

        controlElement.addEventListener("click", () => {
            inputContainer.querySelectorAll("[data-control-id]").forEach(el => {
                 el.style.backgroundColor = "#2a2a3a"; // Use CSS variable
                 el.style.border = "1px solid #444"; // Use CSS variable
            });
            controlElement.style.backgroundColor = "#3a546e"; // Use CSS variable for selected state
            controlElement.style.border = "1px solid #4c8eda"; // Use CSS variable

            if (learningState) {
                learningState.selectControl(controlData);
            }

            const rangeContainer = document.querySelector(".controller-mapping-range");
            if (rangeContainer) rangeContainer.style.display = "flex";

            const mappingTypeSelect = document.querySelector(".controller-mapping-type-select");
            if (mappingTypeSelect) {
                if (isButton) {
                     mappingTypeSelect.value = (learningState?.learningTarget?.type === "command") ? "trigger" : "toggle";
                } else {
                     mappingTypeSelect.value = "direct";
                }
                mappingTypeSelect.dispatchEvent(new Event("change"));
            }

            if (mapButton) mapButton.disabled = false;
        });

        inputContainer.appendChild(controlElement);
    } else {
        const valueSpan = controlElement.querySelector(".value");
        if (valueSpan) valueSpan.textContent = rawValue.toFixed(2);
    }

    const isSelected = learningState?.selectedControl &&
        learningState.selectedControl.deviceId === deviceId &&
        learningState.selectedControl.controlId === controlId;
    const originalBackground = isSelected ? "#3a546e" : "#2a2a3a"; // Use CSS variables

    controlElement.style.backgroundColor = "#3a3a5c"; // Highlight color - use variable
    setTimeout(() => {
        controlElement.style.backgroundColor = originalBackground;
    }, 200);

    return true;
}


// --- Event Listener for Unhandled Controller Input ---

function handleUnhandledInput(controlInput) {
    const { learningState, mappingEngine, eventBus } = getContext();

    if (!learningState || !mappingEngine || !eventBus) {
        console.warn("ControlFreak: Learning state or mapping engine not ready for unhandled input.");
        return;
    }

    // --- Quick Learning Handling ---
    if (learningState.isQuickLearning) {
        const quickContext = learningState.getQuickLearningContext();
        if (quickContext) {
            try {
                const { node, widget, defaultSettings } = quickContext;
                
                const newMapping = {
                    id: `mapping_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    profile: mappingEngine.getActiveProfile(),
                    control: {
                        type: controlInput.type,
                        deviceId: controlInput.deviceId,
                        id: controlInput.controlId,
                        name: controlInput.name || `${controlInput.type} ${controlInput.controlId}`,
                        // Keep original input range logic
                        input_min: (controlInput.type === 'midi' || controlInput.type === 'midi_cc') ? 0 : (controlInput.type === 'gamepad_axis' ? -1 : 0),
                        input_max: (controlInput.type === 'midi' || controlInput.type === 'midi_cc') ? 127 : 1,
                    },
                    target: {
                        type: "widget",
                        nodeId: node.id,
                        widgetName: widget.name,
                        // Include comfyClass for potential future use or consistency
                        comfyClass: node.comfyClass 
                    },
                    // Use the default mapping type determined earlier
                    mappingType: defaultSettings.mappingType,
                    // Add transform with widget's min/max, default if undefined
                    transform: {
                        targetMin: widget.options?.min ?? 0, // Default to 0 if min is not defined
                        targetMax: widget.options?.max ?? 1, // Default to 1 if max is not defined
                        isInverted: false // Default to not inverted for quick map
                    }
                };
                
                // Add the mapping to the engine
                mappingEngine.addMapping(newMapping);
                
                // Save mappings
                mappingEngine.saveMappings();
                
                // Reset learning state
                learningState.completeLearning();
                
                // Close dialog
                hideLearningDialog();
                
                // Trigger highlight of the mapped parameter
                if (node) {
                    const canvas = app.canvas;
                    if (canvas) {
                        // Center on the node
                        canvas.centerOnNode(node);
                        
                        // Emit event to highlight the parameter
                        if (eventBus) {
                            eventBus.emit('learning:complete', {
                                mapping: newMapping,
                                target: {
                                    type: "widget",
                                    nodeId: node.id,
                                    widgetName: widget.name,
                                },
                                node: node
                            });
                        }
                    }
                }
                
                return true;
            } catch (error) {
                console.error("Controller: Error completing quick learning:", error);
                return false;
            }
        }
    }

    // --- Standard Learning Dialog Handling --- 
    if (learningState) {
        if (learningState.isLearning && learningState.learningDialog) {
            try {
                showDetectedInput(controlInput);
            } catch (error) {
                console.error("ControlFreak: Error updating learning dialog from unhandled input:", error);
            }
        }
    } else {
    }

    return false;
}

// Register the handler with the event bus
// Ensure eventBus is available when this module loads
if (eventBus) {
   eventBus.on('controller:unhandledInput', handleUnhandledInput);
} else {
    console.error("ControlFreak: EventBus not available to register unhandled input handler.");
    // Consider a mechanism to retry registration later if needed
}

// --- Existing Exported Functions --- (ensure these remain)
export { 
    startMappingNode, 
    startMappingUI, 
    startMappingCommand, 
    cancelLearning, 
    completeMapping,
    // Removed showDetectedInput as it's now internal
    // Keep startQuickMapping if it exists and is exported
    // startQuickMapping 
}; 