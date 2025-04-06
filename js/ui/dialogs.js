/**
 * Dialog UI components for controller mapping
 * Handles dialog creation, display, and interaction
 */

import { app } from "../../../../scripts/app.js";
import { createMappingList } from "./mappingComponent.js";
import { cancelLearning, completeMapping } from "../core/learningManager.js";
import { contextProvider } from "../core/contextProvider.js";
import { eventBus } from "../core/eventBus.js";

// Get instances from context instead of globals
const getContext = () => {
    const mappingEngine = contextProvider.get('mappingEngine');
    const learningState = contextProvider.get('learningState');
    
    if (!mappingEngine || !learningState) {
        console.warn("ControlFreak: Core components not available in dialog, functionality may be limited");
    }
    
    return { mappingEngine, learningState };
};

/**
 * Show the learning dialog
 * @param {Object} learningTarget - The target information from learningManager.js
 *    (e.g., { type: 'widget', nodeId: ..., widgetName: ..., nodeTitle: ..., widgetConfig: ... })
 * @param {Object} callbacks - Optional callbacks for dialog actions
 * @returns {Object} Dialog elements
 */
function showLearningDialog(learningTarget, callbacks = {}) {
    // First, remove any existing dialog
    const existingDialog = document.getElementById("controller-learning-dialog");
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create dialog container
    const dialog = document.createElement("div");
    dialog.className = "controller-dialog controller-mapping-dialog";
    dialog.id = "controller-learning-dialog"; // Add ID for easier selection
    
    // Store dialog in learning state
    const { learningState } = getContext();
    if (learningState) {
        learningState.setDialog(dialog);
    } else {
        console.warn("ControlFreak Dialog: Learning state not available, dialog may not work properly");
    }
    
    // Create dialog header
    const header = document.createElement("div");
    header.className = "controller-dialog-header";
    
    // Add branded title with icon
    const title = document.createElement("h2");
    title.className = "cf-dialog-title";
    title.innerHTML = `
        <div class="cf-logo">
            <span class="cf-logo-icon">🎮</span>
            <span class="cf-logo-text">Control<span class="cf-logo-highlight">Freak</span></span>
        </div>
    `;
    header.appendChild(title);
    
    const closeButton = document.createElement("button");
    closeButton.className = "controller-dialog-close";
    closeButton.innerHTML = "×";
    closeButton.onclick = () => {
        if (callbacks.onCancel) {
            callbacks.onCancel();
        } else {
            cancelLearning(); // Call the client-side cancel function
        }
    };
    header.appendChild(closeButton);
    
    dialog.appendChild(header);
    
    // Create dialog content
    const content = document.createElement("div");
    content.className = "controller-dialog-content";
    
    // Add a subtitle
    const subtitle = document.createElement("div");
    subtitle.className = "cf-dialog-subtitle";
    subtitle.textContent = "Controller Mapping";
    content.appendChild(subtitle);
    
    // Target info section
    const targetSection = document.createElement("div");
    targetSection.className = "controller-mapping-target";
    
    const targetTitle = document.createElement("h3");
    targetTitle.textContent = "Target";
    targetSection.appendChild(targetTitle);
    
    const targetInfo = document.createElement("div");
    targetInfo.className = "controller-mapping-target-info";
    
    if (learningTarget.type === "widget") {
        targetInfo.innerHTML = `
            <div><strong>Type:</strong> Node Widget</div>
            <div><strong>Node:</strong> ${learningTarget.nodeTitle || learningTarget.nodeId}</div>
            <div><strong>Widget:</strong> ${learningTarget.widgetName}</div>
        `;
    } else if (learningTarget.type === "ui_element") {
        targetInfo.innerHTML = `
            <div><strong>Type:</strong> UI Element</div>
            <div><strong>Element ID:</strong> ${learningTarget.elementId}</div>
        `;
    } else if (learningTarget.type === "command") {
        targetInfo.innerHTML = `
            <div><strong>Type:</strong> Command</div>
            <div><strong>Command:</strong> ${learningTarget.label || learningTarget.commandId}</div>
        `;
    } else {
        targetInfo.textContent = "Unknown target type.";
    }
    
    targetSection.appendChild(targetInfo);
    content.appendChild(targetSection);
    
    // Existing mappings section
    const existingMappingsSection = document.createElement("div");
    existingMappingsSection.className = "controller-mapping-existing";
    
    const existingMappingsTitle = document.createElement("h3");
    existingMappingsTitle.textContent = "Existing Mappings";
    existingMappingsSection.appendChild(existingMappingsTitle);
    
    // Create a placeholder for the existing mappings list
    const mappingsPlaceholder = document.createElement("div");
    mappingsPlaceholder.className = "controller-mapping-existing-content";
    mappingsPlaceholder.textContent = "Loading existing mappings...";
    existingMappingsSection.appendChild(mappingsPlaceholder);
    
    // Get existing mappings for this target
    try {
        // Get mappingEngine from context
        const { mappingEngine } = getContext();
        if (!mappingEngine) {
            mappingsPlaceholder.textContent = "MappingEngine not available";
        } else {
            // Get all mappings from current profile
            const allMappings = mappingEngine.getMappings();
            
            // Filter for mappings targeting this specific widget/command/element
            const filteredMappings = allMappings.filter(mapping => {
                if (learningTarget.type === "widget" && mapping.target.type === "widget") {
                    return (
                        mapping.target.nodeId === learningTarget.nodeId &&
                        mapping.target.widgetName === learningTarget.widgetName
                    );
                } else if (learningTarget.type === "command" && mapping.target.type === "command") {
                    return mapping.target.commandId === learningTarget.commandId;
                } else if (learningTarget.type === "ui_element" && mapping.target.type === "ui_element") {
                    return mapping.target.elementId === learningTarget.elementId;
                }
                return false;
            });
            
            // Create the mappings list and update the placeholder
            try {
                // Clear the placeholder
                mappingsPlaceholder.innerHTML = '';
                
                // Create mapping list
                const mappingsList = createMappingList(filteredMappings);
                
                // Add the mappings list to the placeholder
                mappingsPlaceholder.appendChild(mappingsList);
                
                // If no mappings, createMappingList will handle showing a message
            } catch (error) {
                console.error("Error creating mappings list:", error);
                mappingsPlaceholder.textContent = "Error loading mappings.";
            }
        }
    } catch (error) {
        console.error("Error setting up existing mappings:", error);
        mappingsPlaceholder.textContent = "Error setting up mappings.";
    }
    
    content.appendChild(existingMappingsSection);
    
    // Controller input section
    const inputSection = document.createElement("div");
    inputSection.className = "controller-mapping-input";
    
    const inputTitle = document.createElement("h3");
    inputTitle.textContent = "Controller Input";
    inputSection.appendChild(inputTitle);
    
    // Create the input list container
    const inputContainer = document.createElement("div");
    inputContainer.className = "controller-mapping-input-list";
    inputContainer.innerHTML = "<div class='controller-mapping-instruction'>Move a control on your controller to map it</div>";
    inputSection.appendChild(inputContainer);
    
    content.appendChild(inputSection);
    
    // Mapping type section
    const mappingTypeSection = document.createElement("div");
    mappingTypeSection.className = "controller-mapping-type-section";
    
    const mappingTypeTitle = document.createElement("h3");
    mappingTypeTitle.textContent = "Mapping Type";
    mappingTypeSection.appendChild(mappingTypeTitle);
    
    // Create mapping type selector
    const mappingTypeContainer = document.createElement("div");
    mappingTypeContainer.className = "controller-mapping-type-container";
    
    // Create type selector
    const typeSelect = document.createElement("select");
    typeSelect.className = "controller-mapping-type-select";
    
    // Add mapping type options based on target type
    if (learningTarget.type === "widget") {
        // Different mapping types for widgets
        typeSelect.innerHTML = `
            <option value="direct">Direct Control (Default)</option>
            <option value="toggle">Toggle (On/Off)</option>
            <option value="momentary">Momentary (Active while held)</option>
            <option value="incremental">Increment Value</option>
            <option value="decremental">Decrement Value</option>
            <option value="trigger">Trigger Action</option>
        `;
    } else if (learningTarget.type === "command") {
        // Command mapping types
        typeSelect.innerHTML = `
            <option value="trigger">Trigger Command (Default)</option>
            <option value="toggle">Toggle Command</option>
            <option value="momentary">Momentary (Active while held)</option>
        `;
    } else if (learningTarget.type === "ui_element") {
        // UI element mapping types
        typeSelect.innerHTML = `
            <option value="trigger">Trigger Element (Default)</option>
            <option value="toggle">Toggle Element</option>
            <option value="momentary">Momentary (Active while held)</option>
        `;
    }
    
    mappingTypeContainer.appendChild(typeSelect);
    mappingTypeSection.appendChild(mappingTypeContainer);
    
    // Range options for numerical widgets
    if (learningTarget.type === "widget" && learningTarget.widgetConfig &&
        (learningTarget.widgetConfig.type === "slider" || 
         learningTarget.widgetConfig.type === "number" || 
         learningTarget.widgetConfig.type === "combo")) {
        
        
        
        // Check for existing mappings with min/max overrides
        let existingMinMaxOverride = null;
        try {
            const { mappingEngine } = getContext();
            if (mappingEngine) {
                const existingMappings = mappingEngine.getMappings().filter(m => 
                    m.target && 
                    m.target.type === 'widget' && 
                    m.target.nodeId === learningTarget.nodeId && 
                    m.target.widgetName === learningTarget.widgetName
                );
                
                // Find first mapping with min/max transform data
                const existingMapping = existingMappings.find(m => 
                    m.transform && 
                    (typeof m.transform.targetMin === 'number' || typeof m.transform.targetMax === 'number')
                );
                
                if (existingMapping && existingMapping.transform) {
                    existingMinMaxOverride = existingMapping.transform;
                }
            }
        } catch (err) {
            console.warn("Error getting existing mapping transforms:", err);
        }
        
        // Create range inputs for min/max values
        const rangeContainer = document.createElement("div");
        rangeContainer.className = "controller-mapping-range";
        
        // Min value input
        const minContainer = document.createElement("div");
        
        const minLabel = document.createElement("label");
        minLabel.textContent = "Min Value:";
        minContainer.appendChild(minLabel);
        
        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.className = "controller-mapping-min";
        
        // Set default value from existing mapping transform if available, otherwise use widget config
        if (existingMinMaxOverride && typeof existingMinMaxOverride.targetMin === 'number') {
            minInput.value = existingMinMaxOverride.targetMin;
            
            // Add note that this value is from other mappings
            const minNote = document.createElement("small");
            minNote.className = "controller-mapping-note";
            minNote.textContent = "(from existing mapping)";
            minContainer.appendChild(minNote);
        } else if (learningTarget.widgetConfig && learningTarget.widgetConfig.config) {
            minInput.value = learningTarget.widgetConfig.config.min !== undefined ? 
                learningTarget.widgetConfig.config.min : 0;
        } else {
            minInput.value = 0;
        }
        
        minContainer.appendChild(minInput);
        rangeContainer.appendChild(minContainer);
        
        // Max value input
        const maxContainer = document.createElement("div");
        
        const maxLabel = document.createElement("label");
        maxLabel.textContent = "Max Value:";
        maxContainer.appendChild(maxLabel);
        
        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.className = "controller-mapping-max";
        
        // Set default value from existing mapping transform if available, otherwise use widget config
        if (existingMinMaxOverride && typeof existingMinMaxOverride.targetMax === 'number') {
            maxInput.value = existingMinMaxOverride.targetMax;
            
            // Add note that this value is from other mappings
            const maxNote = document.createElement("small");
            maxNote.className = "controller-mapping-note";
            maxNote.textContent = "(from existing mapping)";
            maxContainer.appendChild(maxNote);
        } else if (learningTarget.widgetConfig && learningTarget.widgetConfig.config) {
            maxInput.value = learningTarget.widgetConfig.config.max !== undefined ? 
                learningTarget.widgetConfig.config.max : 1;
        } else {
            maxInput.value = 1;
        }
        
        maxContainer.appendChild(maxInput);
        rangeContainer.appendChild(maxContainer);
        
        // Add step size input for incremental mapping
        const stepContainer = document.createElement("div");
        stepContainer.className = "hidden"; // Hide initially, show only for incremental mapping
        
        const stepLabel = document.createElement("label");
        stepLabel.textContent = "Step Size:";
        stepContainer.appendChild(stepLabel);
        
        const stepInput = document.createElement("input");
        stepInput.type = "number";
        stepInput.className = "controller-mapping-step";
        
        // Set default value from widget config if available
        if (learningTarget.widgetConfig && learningTarget.widgetConfig.config) {
            stepInput.value = learningTarget.widgetConfig.config.step !== undefined ? 
                learningTarget.widgetConfig.config.step : 0.1;
        } else {
            stepInput.value = 0.1;
        }
        
        stepContainer.appendChild(stepInput);
        rangeContainer.appendChild(stepContainer);
        
        // Show/hide step size based on mapping type
        typeSelect.addEventListener("change", (e) => {
            if (e.target.value === "incremental" || e.target.value === "decremental") {
                stepContainer.classList.remove("hidden");
                stepContainer.classList.add("visible");
                stepLabel.textContent = "Step Size:";
                stepInput.placeholder = "";
            } else {
                stepContainer.classList.add("hidden");
                stepContainer.classList.remove("visible");
            }
        });
        
        // Trigger the change event to properly initialize visibility
        typeSelect.dispatchEvent(new Event("change"));
        
        mappingTypeSection.appendChild(rangeContainer);
    }
    
    // Invert Checkbox (always show)
    const invertContainer = document.createElement("div");
    invertContainer.className = "controller-mapping-option";
    const invertCheckbox = document.createElement("input");
    invertCheckbox.type = "checkbox";
    invertCheckbox.id = "controller-mapping-invert";
    invertCheckbox.className = "controller-mapping-invert-checkbox";
    const invertLabel = document.createElement("label");
    invertLabel.htmlFor = "controller-mapping-invert";
    invertLabel.textContent = " Invert Output (Map 0-1 to Max-Min)";
    invertContainer.appendChild(invertCheckbox);
    invertContainer.appendChild(invertLabel);
    mappingTypeSection.appendChild(invertContainer);
    
    content.appendChild(mappingTypeSection);
    
    // Map button and cancel button
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "controller-mapping-buttons";
    
    const cancelButton = document.createElement("button");
    cancelButton.className = "controller-cancel-button";
    cancelButton.textContent = "Cancel";
    cancelButton.onclick = () => {
        if (callbacks.onCancel) {
            callbacks.onCancel();
        } else {
            cancelLearning();
        }
    };
    buttonContainer.appendChild(cancelButton);
    
    const mapButton = document.createElement("button");
    mapButton.className = "controller-map-button";
    mapButton.textContent = "Map Control";
    mapButton.disabled = true; // Disabled until a control is selected
    mapButton.onclick = () => {
        // Get the selected control and mapping options from the learningState
        const { learningState } = getContext();
        
        
        // Check for selected control
        if (!learningState || !learningState.selectedControl) { 
            console.warn("No control selected or learning state unavailable");
            showNotification("No control input selected. Please click on a detected control.", "warning");
            return;
        }
        
        // Get values from form
        const mappingType = typeSelect.value;
        const isInverted = invertCheckbox.checked;
        
        // Get min/max values if applicable
        let targetMin, targetMax, stepSize;
        const minInput = document.querySelector(".controller-mapping-min");
        const maxInput = document.querySelector(".controller-mapping-max");
        const stepInput = document.querySelector(".controller-mapping-step");
        
        if (minInput) targetMin = parseFloat(minInput.value);
        if (maxInput) targetMax = parseFloat(maxInput.value);
        if (stepInput && (mappingType === "incremental" || mappingType === "decremental")) stepSize = parseFloat(stepInput.value);
        
        // Complete the mapping
        completeMapping(
            learningState.selectedControl,
            learningState.learningTarget,
            targetMin,
            targetMax,
            mappingType,
            stepSize,
            isInverted
        );
    };
    buttonContainer.appendChild(mapButton);
    
    content.appendChild(buttonContainer);
    dialog.appendChild(content);
    
    // Add the dialog to the document
    document.body.appendChild(dialog);
    
    return { dialog, inputContainer, mapButton };
}

/**
 * Hide the learning dialog
 */
function hideLearningDialog() {
    // Get the learning state manager from context
    const { learningState } = getContext();
    if (learningState) {
        const dialog = learningState.learningDialog;
        if (dialog) {
            // Clean up event listeners
            if (dialog.cleanupEvents) {
                dialog.cleanupEvents();
            }
            
            // Remove the dialog from the DOM
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            
            // Clear the dialog reference
            learningState.setDialog(null);
        }
    } else {
        // Fallback: try to find and remove any dialog with the mapping dialog class
        const dialogs = document.querySelectorAll('.controller-mapping-dialog');
        dialogs.forEach(dialog => {
            if (dialog.cleanupEvents) {
                dialog.cleanupEvents();
            }
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        });
    }
}

/**
 * Show the controller management dialog
 */
function showControllerDialog() {
    // Implementation will be updated in a separate PR
}

// Export the dialog functions
export { showLearningDialog, hideLearningDialog, showControllerDialog }; 