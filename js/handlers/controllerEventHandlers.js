/**
 * Controller event handlers for controller mapping
 * Handles events from connected controllers and provides UI feedback (Client-Side)
 */

import { app } from "../../../../scripts/app.js"; // Needed for highlightNodeParameter
import { contextProvider } from "../core/contextProvider.js";
import { eventBus } from "../core/eventBus.js";

// Get instances from context instead of globals
const getContext = () => {
    const learningState = contextProvider.get('learningState');
    
    if (!learningState) {
        console.warn("ControlFreak: Learning state not available in event handlers");
    }
    
    return { learningState };
};

/**
 * Show detected input during learning mode
 * @param {Object} controlInput - The formatted control input data from index.js
 *    (e.g., { type, deviceId, controlId, value, rawValue, deviceName/gamepadId })
 * @param {Object} uiContext - UI context with inputContainer and mapButton references
 * @returns {boolean} Whether the input was handled successfully
 */
function showDetectedInput(controlInput, uiContext = {}) {
    // Try to get the UI elements from the provided context
    let inputContainer = uiContext.inputContainer;
    let mapButton = uiContext.mapButton;
    
    // If not provided directly, try to find from dialog in learning state
    if (!inputContainer || !mapButton) {
        const { learningState } = getContext();
        if (learningState && learningState.learningDialog) {
            const dialog = learningState.learningDialog;
            
            // Get the UI elements from the dialog
            inputContainer = dialog.querySelector(".controller-mapping-input-list");
            mapButton = dialog.querySelector(".controller-map-button");
            
            if (!inputContainer) {
                console.error("ControlFreak: Input container not found in learning state dialog");
                
                // Last resort - query the DOM directly
                inputContainer = document.querySelector(".controller-mapping-input-list");
                mapButton = document.querySelector(".controller-map-button");
                
                if (!inputContainer) {
                    console.error("ControlFreak: Input container not found even with direct DOM query");
                    return false;
                }
            }
        } else {
            // Fallback: try to find the dialog in the document
            const dialog = document.querySelector(".controller-mapping-dialog");
            
            if (!dialog) {
                console.warn("ControlFreak: Learning dialog not found in document");
                return false; // No dialog found
            }
            
            // Get the UI elements from the dialog
            inputContainer = dialog.querySelector(".controller-mapping-input-list");
            mapButton = dialog.querySelector(".controller-map-button");
            
            if (!inputContainer) {
                console.error("ControlFreak: Input container not found in dialog");
                return false;
            }
        }
    }

    // Extract data from the formatted input
    const { deviceId, controlId, /* value, */ type, deviceName, rawValue, name } = controlInput; // Destructure rawValue, commented out value
    const displayName = name || deviceName || controlId; // Use name, device name if available, otherwise controlId

    // Clear the instruction message if present
    const instructionEl = inputContainer.querySelector(".controller-mapping-instruction");
    if (instructionEl) {
        inputContainer.removeChild(instructionEl);
    }

    // Check if we already have an element for this control
    let controlElement = inputContainer.querySelector(`[data-control-id="${controlId}"][data-device-id="${deviceId}"]`);
    const isNewControl = !controlElement;

    if (!controlElement) {
        // Create a new element for this control
        controlElement = document.createElement("div");
        controlElement.dataset.controlId = controlId;
        controlElement.dataset.deviceId = deviceId;

        // Determine if this is a button or continuous control
        const isButton = type?.includes("button");
        controlElement.dataset.controlType = isButton ? "button" : "axis";

        // Add a visual indicator for the control type
        const controlTypeIndicator = isButton ? "🔘" : "↔️";

        controlElement.innerHTML = `<strong>${controlTypeIndicator} ${displayName}</strong>: <span class="value">${rawValue.toFixed(2)}</span>`;
        controlElement.style.marginBottom = "5px";
        controlElement.style.padding = "8px";
        controlElement.style.borderRadius = "3px";
        controlElement.style.cursor = "pointer";
        controlElement.style.transition = "background-color 0.3s";
        controlElement.style.backgroundColor = "#2a2a3a";
        controlElement.style.border = "1px solid #444";

        // Store control data for selection
        const controlData = {
            deviceId: deviceId,
            controlId: controlId,
            name: displayName,
            type: type // Store the specific type (e.g., 'gamepad_button', 'midi')
        };

        // Add click behavior to select this control
        controlElement.addEventListener("click", () => {
            // Highlight the selected control
            inputContainer.querySelectorAll("[data-control-id]").forEach(el => {
                el.style.backgroundColor = "#2a2a3a";
                el.style.border = "1px solid #444";
            });

            controlElement.style.backgroundColor = "#3a546e";
            controlElement.style.border = "1px solid #4c8eda";

            // Update the learning state with selected control
            const { learningState } = getContext();
            if (learningState) {
                // console.log("[ControlFreak Debug] Selecting control in state:", controlData);
                learningState.selectControl(controlData);
                // console.log("[ControlFreak Debug] learningState.selectedControl is now:", learningState.selectedControl);
            }

            // Show the range options container if it exists
            const rangeContainer = document.querySelector(".controller-mapping-range");
            if (rangeContainer) {
                rangeContainer.style.display = "flex";
            }

            // Set appropriate mapping type based on control type
            const mappingTypeSelect = document.querySelector(".controller-mapping-type-select");
            if (mappingTypeSelect) {
                // Suggest an appropriate default mapping type based on the control type
                if (isButton) {
                    if (learningState?.learningTarget?.type === "widget") {
                        mappingTypeSelect.value = "toggle"; // For widget buttons, suggest toggle
                    } else if (learningState?.learningTarget?.type === "command") {
                        mappingTypeSelect.value = "trigger"; // For command buttons, suggest trigger
                    }
                } else {
                    // For axes and other continuous controls, suggest direct
                    mappingTypeSelect.value = "direct"; 
                }

                // Trigger the change event to update dependent UI (like step size visibility)
                const event = new Event("change");
                mappingTypeSelect.dispatchEvent(event);
            }

            // Enable the map button
            if (mapButton) {
                mapButton.disabled = false;
            }
        });

        inputContainer.appendChild(controlElement);
    } else {
        // Update the existing element
        const valueSpan = controlElement.querySelector(".value");
        if (valueSpan) {
             // Use rawValue.toFixed(2) for display update
            valueSpan.textContent = rawValue.toFixed(2);
        }
    }

    // Highlight the element briefly to show activity
    const { learningState } = getContext();
    const isSelected = learningState?.selectedControl && 
                     learningState.selectedControl.deviceId === deviceId && 
                     learningState.selectedControl.controlId === controlId;
    const originalBackground = isSelected ? "#3a546e" : "#2a2a3a"; // Keep highlight if selected

    controlElement.style.backgroundColor = "#3a3a5c";
    setTimeout(() => {
        // Reset if not selected
        controlElement.style.backgroundColor = originalBackground; // Revert to original (selected or default)
    }, 200);
    
    return true;
}

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

// Export the functions
export { showDetectedInput, highlightNodeParameter, handleControlUpdate }; 