/**
 * Mapping Component for ControlFreak
 * Handles rendering and interaction with controller mappings
 */

import { showNotification } from './notifications.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';
import { addMappingComponentStyles } from './styles/index.js';

// Get the mapping engine from context
const getMappingEngine = () => contextProvider.get('mappingEngine');

// Ensure styles are added when this module is imported
addMappingComponentStyles();

/**
 * Create a mapping UI component from a mapping object
 * @param {Object} mapping - The mapping object
 * @param {Object} options - Options for the mapping component
 * @returns {HTMLElement} - The created mapping component
 */
export function createMappingComponent(mapping, options = {}) {
    const component = document.createElement('div');
    component.className = 'controller-mapping-component';
    component.dataset.mappingId = mapping.id;
    
    // Control source section
    const controlSource = document.createElement('div');
    controlSource.className = 'mapping-control-source';
    
    const sourceIcon = document.createElement('span');
    sourceIcon.className = 'mapping-icon';
    sourceIcon.textContent = getControlTypeIcon(mapping.control.type);
    controlSource.appendChild(sourceIcon);
    
    const sourceName = document.createElement('span');
    sourceName.className = 'mapping-name';
    sourceName.title = getControlDetails(mapping.control);
    sourceName.textContent = mapping.control.name || getDefaultControlName(mapping.control);
    controlSource.appendChild(sourceName);
    
    component.appendChild(controlSource);
    
    // Arrow between source and target
    const arrow = document.createElement('div');
    arrow.className = 'mapping-arrow';
    arrow.textContent = '→';
    component.appendChild(arrow);
    
    // Target section
    const target = document.createElement('div');
    target.className = 'mapping-target';
    
    const targetIcon = document.createElement('span');
    targetIcon.className = 'mapping-icon';
    targetIcon.textContent = getTargetTypeIcon(mapping.target.type);
    target.appendChild(targetIcon);
    
    const targetName = document.createElement('span');
    targetName.className = 'mapping-name';
    targetName.title = getTargetDetails(mapping.target);
    targetName.textContent = getTargetName(mapping.target);
    target.appendChild(targetName);
    
    component.appendChild(target);
    
    // Add the mapping type badge
    const mappingTypeBadge = document.createElement('div');
    mappingTypeBadge.className = 'mapping-type-badge';
    mappingTypeBadge.textContent = getMappingTypeLabel(mapping.mappingType);
    component.appendChild(mappingTypeBadge);
    
    // Add action buttons container
    const actionContainer = document.createElement('div');
    actionContainer.className = 'mapping-actions';
    
    // Add edit button if needed
    if (!options.hideEdit) {
        const editButton = document.createElement('button');
        editButton.className = 'mapping-edit';
        editButton.textContent = 'Edit';
        editButton.title = 'Edit this mapping';
        editButton.onclick = (e) => {
            e.stopPropagation();
            showMappingEditor(mapping.id, component.parentNode);
        };
        actionContainer.appendChild(editButton);
    }
    
    // Add delete button if allowed
    if (!options.hideDelete) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'mapping-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.title = 'Delete this mapping';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            
            // Confirm deletion
            if (confirm(`Delete mapping from ${sourceName.textContent} to ${targetName.textContent}?`)) {
                deleteMapping(mapping.id);
                
                // Remove from UI
                component.remove();
                
                // Show notification
                showNotification(`Mapping deleted`);
            }
        };
        actionContainer.appendChild(deleteButton);
    }
    
    component.appendChild(actionContainer);
    
    return component;
}

/**
 * Create a list of mapping components
 * @param {Array} mappings - Array of mapping objects
 * @param {Object} options - Options for the mapping list
 * @returns {HTMLElement} - The mapping list container
 */
export function createMappingList(mappings, options = {}) {
    const listContainer = document.createElement('div');
    listContainer.className = 'controller-mapping-list';
    
    if (!mappings || mappings.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'mapping-empty-message';
        emptyMessage.textContent = options.emptyMessage || 'No mappings found';
        listContainer.appendChild(emptyMessage);
        return listContainer;
    }
    
    // Create a component for each mapping
    mappings.forEach(mapping => {
        const component = createMappingComponent(mapping, options);
        listContainer.appendChild(component);
    });
    
    return listContainer;
}

/**
 * Show an editor dialog for a mapping
 * @param {string} mappingId - The ID of the mapping to edit
 * @param {HTMLElement} listContainer - The parent container to potentially refresh
 */
export function showMappingEditor(mappingId, listContainer) {
    const mappingEngine = getMappingEngine();
    if (!mappingEngine) {
        showNotification("Mapping engine not initialized", true);
        return;
    }
    
    const mapping = mappingEngine.getMappingById(mappingId);
    if (!mapping) {
        showNotification(`Mapping with ID ${mappingId} not found.`, true);
        return;
    }

    // Create editor overlay
    const overlay = document.createElement("div");
    overlay.className = "mapping-editor-overlay";
    
    // Create editor dialog
    const editor = document.createElement("div");
    editor.className = "mapping-editor";
    
    // Create editor header
    const header = document.createElement("div");
    header.className = "mapping-editor-header";
    
    const title = document.createElement("h3");
    title.textContent = "Edit Mapping";
    header.appendChild(title);
    
    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "mapping-editor-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(closeBtn);
    
    editor.appendChild(header);
    
    // Create editor content
    const content = document.createElement("div");
    content.className = "mapping-editor-content";
    
    // Controller info (read-only)
    const controllerInfo = document.createElement("div");
    controllerInfo.className = "mapping-editor-info";
    const controlName = mapping.control.name || mapping.control.id;
    const deviceName = mapping.control.deviceName || mapping.control.deviceId;
    controllerInfo.innerHTML = `<strong>Control:</strong> ${controlName} (${deviceName})`;
    content.appendChild(controllerInfo);
    
    // Target info (read-only)
    const targetInfo = document.createElement("div");
    targetInfo.className = "mapping-editor-info";
    let targetLabel = "Unknown Target";
    if (mapping.target.type === 'widget') {
        targetLabel = `Widget: ${mapping.target.widgetName} (Node ${mapping.target.nodeId})`;
    } else if (mapping.target.type === 'command') {
        targetLabel = `Command: ${mapping.target.commandId}`;
    } else if (mapping.target.type === 'ui_element') {
        targetLabel = `UI Element: ${mapping.target.elementId}`;
    }
    targetInfo.innerHTML = `<strong>Target:</strong> ${targetLabel}`;
    content.appendChild(targetInfo);
    
    // Mapping type selection
    const mappingTypeGroup = document.createElement("div");
    mappingTypeGroup.className = "mapping-editor-field";
    
    const mappingTypeLabel = document.createElement("label");
    mappingTypeLabel.textContent = "Mapping Type:";
    mappingTypeGroup.appendChild(mappingTypeLabel);
    
    const mappingTypeSelect = document.createElement("select");
    mappingTypeSelect.className = "mapping-type-select";
    
    // Add appropriate mapping type options based on target type
    if (mapping.target.type === "widget") {
        mappingTypeSelect.innerHTML = `
            <option value="direct">Direct Control (Axes/Knobs)</option>
            <option value="toggle">Toggle (On/Off)</option>
            <option value="momentary">Momentary (Active while held)</option>
            <option value="incremental">Increment Value</option>
            <option value="decremental">Decrement Value</option>
            <option value="trigger">Trigger Action</option>
        `;
    } else if (mapping.target.type === "command" || mapping.target.type === "ui_element") {
        mappingTypeSelect.innerHTML = `
            <option value="trigger">Trigger</option>
            <option value="toggle">Toggle</option>
            <option value="momentary">Momentary (Active while held)</option>
        `;
    }
    
    // Normalize mapping type for select element
    const currentMappingType = mapping.mappingType || "direct";
    
    // Select the appropriate option
    for (const option of mappingTypeSelect.options) {
        if (option.value.toLowerCase() === currentMappingType.toLowerCase()) {
            option.selected = true;
            break;
        }
    }
    
    mappingTypeGroup.appendChild(mappingTypeSelect);
    content.appendChild(mappingTypeGroup);
    
    // Step size for increment/decrement modes
    const stepSizeGroup = document.createElement("div");
    stepSizeGroup.className = "mapping-editor-field mapping-step-size";
    stepSizeGroup.style.display = 
        currentMappingType === "incremental" ||
        currentMappingType === "decremental" ? "block" : "none";
    
    const stepSizeLabel = document.createElement("label");
    stepSizeLabel.textContent = "Step Size:";
    stepSizeGroup.appendChild(stepSizeLabel);
    
    const stepSizeInput = document.createElement("input");
    stepSizeInput.type = "number";
    stepSizeInput.value = mapping.transform?.stepSize || 0.1; // Default step
    stepSizeInput.min = "0.001";
    stepSizeInput.step = "any"; // Allow flexible steps
    stepSizeInput.className = "mapping-step-size";
    stepSizeGroup.appendChild(stepSizeInput);
    
    content.appendChild(stepSizeGroup);
    
    // Range override fields
    const rangeGroup = document.createElement("div");
    rangeGroup.className = "mapping-editor-field mapping-range-override";
    
    const rangeTitle = document.createElement("label");
    rangeTitle.innerHTML = "<strong>Range Override (Optional)</strong>";
    rangeGroup.appendChild(rangeTitle);
    
    // Min Override
    const rangeContainer = document.createElement("div");
    rangeContainer.style.display = "flex";
    rangeContainer.style.gap = "10px";
    
    const minGroup = document.createElement("div");
    minGroup.style.flex = "1";
    
    const minLabel = document.createElement("label");
    minLabel.textContent = "Min:";
    minGroup.appendChild(minLabel);
    
    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.step = "any";
    minInput.placeholder = "Widget Default";
    minInput.value = mapping.transform?.targetMin ?? ""; // Use ?? for null/undefined
    minGroup.appendChild(minInput);
    rangeContainer.appendChild(minGroup);
    
    // Max Override
    const maxGroup = document.createElement("div");
    maxGroup.style.flex = "1";
    
    const maxLabel = document.createElement("label");
    maxLabel.textContent = "Max:";
    maxGroup.appendChild(maxLabel);
    
    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.step = "any";
    maxInput.placeholder = "Widget Default";
    maxInput.value = mapping.transform?.targetMax ?? "";
    maxGroup.appendChild(maxInput);
    rangeContainer.appendChild(maxGroup);
    
    rangeGroup.appendChild(rangeContainer);
    content.appendChild(rangeGroup);
    
    // Update step size visibility on type change
    mappingTypeSelect.addEventListener("change", () => {
        const selectedType = mappingTypeSelect.value;
        stepSizeGroup.style.display =
            selectedType === "incremental" || 
            selectedType === "decremental" ? "block" : "none";
    });
    
    editor.appendChild(content);
    
    // Editor footer with Save/Cancel
    const footer = document.createElement("div");
    footer.className = "mapping-editor-footer";
    
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Changes";
    saveBtn.className = "mapping-save-btn";
    saveBtn.onclick = () => {
        const updatedData = {
            mappingType: mappingTypeSelect.value,
            transform: {
                // Use null if empty to signify removal of override
                targetMin: minInput.value !== "" ? parseFloat(minInput.value) : null,
                targetMax: maxInput.value !== "" ? parseFloat(maxInput.value) : null,
                stepSize: (mappingTypeSelect.value === "incremental" || 
                           mappingTypeSelect.value === "decremental") 
                          ? parseFloat(stepSizeInput.value)
                          : undefined // Only include stepSize for increment/decrement
            }
        };

        // Remove nulls from transform to avoid storing them explicitly if not set
        if (updatedData.transform.targetMin === null) delete updatedData.transform.targetMin;
        if (updatedData.transform.targetMax === null) delete updatedData.transform.targetMax;
        if (updatedData.transform.stepSize === undefined) delete updatedData.transform.stepSize;

        try {
            const success = mappingEngine.updateMapping(mappingId, updatedData);
            if (success) {
                showNotification("Mapping updated successfully");
                document.body.removeChild(overlay); // Close editor
                
                // Refresh the list to show updated mapping
                if (listContainer) {
                    // Get all mappings from current profile
                    const allMappings = mappingEngine.getMappings();
                    
                    // Filter mappings for the same target as the edited mapping
                    const updatedMapping = mappingEngine.getMappingById(mappingId);
                    let filteredMappings = allMappings;
                    
                    if (updatedMapping && updatedMapping.target) {
                        filteredMappings = allMappings.filter(mapping => {
                            if (updatedMapping.target.type === "widget" && mapping.target.type === "widget") {
                                return (
                                    mapping.target.nodeId === updatedMapping.target.nodeId &&
                                    mapping.target.widgetName === updatedMapping.target.widgetName
                                );
                            } else if (updatedMapping.target.type === "command" && mapping.target.type === "command") {
                                return mapping.target.commandId === updatedMapping.target.commandId;
                            } else if (updatedMapping.target.type === "ui_element" && mapping.target.type === "ui_element") {
                                return mapping.target.elementId === updatedMapping.target.elementId;
                            }
                            return false;
                        });
                    }
                    
                    // Update the UI with filtered mappings
                    listContainer.innerHTML = "";
                    const newList = createMappingList(filteredMappings);
                    Array.from(newList.children).forEach(child => {
                        listContainer.appendChild(child);
                    });
                }
            } else {
                showNotification("Failed to update mapping (not found?)", true);
            }
        } catch (error) {
            console.error("Error updating mapping:", error);
            showNotification(`Error updating mapping: ${error.message}`, true);
        }
    };
    footer.appendChild(saveBtn);
    
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "mapping-editor-cancel-btn";
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    footer.appendChild(cancelBtn);
    
    editor.appendChild(footer);
    
    // Append editor to body
    overlay.appendChild(editor);
    document.body.appendChild(overlay);
}

/**
 * Get an icon for a control type
 * @param {string} controlType - The control type
 * @returns {string} - Icon representing the control type
 */
function getControlTypeIcon(controlType) {
    if (!controlType) return '?';
    
    if (controlType.includes('midi')) {
        return '🎹';
    } else if (controlType.includes('gamepad')) {
        if (controlType.includes('button')) {
            return '🔘';
        } else if (controlType.includes('axis')) {
            return '↔️';
        }
        return '🎮';
    }
    
    return '🎛️';
}

/**
 * Get an icon for a target type
 * @param {string} targetType - The target type
 * @returns {string} - Icon representing the target type
 */
function getTargetTypeIcon(targetType) {
    switch (targetType) {
        case 'widget':
            return '📊';
        case 'command':
            return '🔨';
        case 'ui_element':
            return '🖱️';
        default:
            return '❓';
    }
}

/**
 * Get a user-friendly name for a target
 * @param {Object} target - The target object
 * @returns {string} - A user-friendly name
 */
function getTargetName(target) {
    if (!target) return 'Unknown';
    
    switch (target.type) {
        case 'widget':
            return `${target.nodeTitle || 'Node'} → ${target.widgetName || 'Widget'}`;
        case 'command':
            return target.label || target.commandId || 'Command';
        case 'ui_element':
            return target.elementLabel || target.elementId || 'UI Element';
        default:
            return 'Unknown Target';
    }
}

/**
 * Get detailed information about a control
 * @param {Object} control - The control object
 * @returns {string} - Detailed information
 */
function getControlDetails(control) {
    if (!control) return 'Unknown Control';
    
    let details = `Type: ${control.type}\n`;
    details += `Device: ${control.deviceId}\n`;
    details += `Control: ${control.id}`;
    
    return details;
}

/**
 * Get detailed information about a target
 * @param {Object} target - The target object
 * @returns {string} - Detailed information
 */
function getTargetDetails(target) {
    if (!target) return 'Unknown Target';
    
    let details = `Type: ${target.type}\n`;
    
    switch (target.type) {
        case 'widget':
            details += `Node: ${target.nodeId}\n`;
            details += `Widget: ${target.widgetName}`;
            break;
        case 'command':
            details += `Command: ${target.commandId}`;
            break;
        case 'ui_element':
            details += `Element: ${target.elementId}`;
            break;
    }
    
    return details;
}

/**
 * Get a default name for a control if none is provided
 * @param {Object} control - The control object
 * @returns {string} - A default name
 */
function getDefaultControlName(control) {
    if (!control) return 'Unknown';
    
    // Try to construct a sensible name based on type and ID
    const type = control.type || '';
    const id = control.id || '';
    
    if (type.includes('midi')) {
        if (id.startsWith('144_')) {
            return `MIDI Note ${id.split('_')[1]}`;
        } else if (id.startsWith('176_')) {
            return `MIDI CC ${id.split('_')[1]}`;
        }
        return `MIDI ${id}`;
    } else if (type.includes('gamepad')) {
        if (type.includes('button')) {
            return `Gamepad Button ${id.split('_')[1]}`;
        } else if (type.includes('axis')) {
            return `Gamepad Axis ${id.split('_')[1]}`;
        }
        return `Gamepad ${id}`;
    }
    
    return `Control ${id}`;
}

/**
 * Get a user-friendly label for a mapping type
 * @param {string} mappingType - The mapping type
 * @returns {string} - A user-friendly label
 */
function getMappingTypeLabel(mappingType) {
    if (!mappingType) return 'Default';
    
    // Normalize the mapping type to lowercase for case-insensitive comparison
    const type = mappingType.toLowerCase();
    
    switch (type) {
        case 'direct':
            return 'Direct';
        case 'toggle':
            return 'Toggle';
        case 'trigger':
            return 'Trigger';
        case 'incremental':
            return 'Increment';
        case 'decremental':
            return 'Decrement';
        case 'momentary':
            return 'Momentary';
        case 'absolute':
            return 'Direct'; // Map "Absolute" (from backend) to "Direct" (for UI)
        case 'increment':
            return 'Increment'; // Map "Increment" (from backend) to "Increment" (for UI)
        case 'decrement':
            return 'Decrement'; // Map "Decrement" (from backend) to "Decrement" (for UI)
        default:
            return mappingType; // Return original if unknown
    }
}

/**
 * Delete a mapping by ID
 * @param {string} mappingId - The ID of the mapping to delete
 * @returns {boolean} - Whether the deletion was successful
 */
export function deleteMapping(mappingId) {
    const mappingEngine = getMappingEngine();
    if (!mappingEngine) {
        console.error('MappingComponent: Mapping engine not available');
        return false;
    }
    
    // Delete the mapping using the mapping engine
    const success = mappingEngine.deleteMapping(mappingId);
    
    if (success) {
        // Emit event for mapping deleted
        eventBus.emit('ui:mappingDeleted', { mappingId });
    }
    
    return success;
} 