/**
 * Mapping Component for ControlFreak
 * Handles rendering and interaction with controller mappings
 */

import { showNotification } from './notifications.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';

// Get the mapping engine from context
const getMappingEngine = () => contextProvider.get('mappingEngine');

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
                // The UI will be refreshed via event listeners, so no need to manipulate DOM directly
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
    
    // Create editor dialog - IMPORTANT: Add BOTH classes
    const editor = document.createElement("div");
    editor.className = "mapping-editor controller-dialog"; // Add controller-dialog class
    
    // Create editor header
    const header = document.createElement("div");
    // Use controller-dialog-header class for consistency
    header.className = "controller-dialog-header mapping-editor-header"; 
    
    // Update to match the ControlFreak branding
    const title = document.createElement("h3");
    title.innerHTML = `<span class="cf-logo">
        <span class="cf-logo-icon">🎮</span>
        <span class="cf-logo-text">CONTROL<span class="cf-logo-highlight">FREAK</span></span>
    </span>`;
    header.appendChild(title);
    
    // Close button - Use controller-dialog-close class
    const closeBtn = document.createElement("button");
    closeBtn.className = "controller-dialog-close mapping-editor-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(closeBtn);
    
    editor.appendChild(header);
    
    // Create editor content - Use controller-dialog-content class
    const content = document.createElement("div");
    content.className = "controller-dialog-content mapping-editor-content";
    
    // Add a subtitle for "Edit Mapping"
    const subtitle = document.createElement("div");
    subtitle.className = "cf-dialog-subtitle";
    subtitle.textContent = "Edit Mapping";
    content.appendChild(subtitle);
    
    // Controller info (read-only)
    const controllerSection = document.createElement("div");
    controllerSection.className = "controller-mapping-target"; // Reuse the section styling
    
    const controllerHeader = document.createElement("h3");
    controllerHeader.textContent = "Control";
    controllerHeader.style.color = "var(--cf-brand-primary)";
    controllerSection.appendChild(controllerHeader);
    
    const controllerInfo = document.createElement("div");
    controllerInfo.className = "controller-mapping-target-info";
    const controlName = mapping.control.name || mapping.control.id;
    const deviceName = mapping.control.deviceName || mapping.control.deviceId;
    controllerInfo.innerHTML = `${controlName} (${deviceName})`;
    controllerSection.appendChild(controllerInfo);
    
    content.appendChild(controllerSection);
    
    // Target info (read-only)
    const targetSection = document.createElement("div");
    targetSection.className = "controller-mapping-target";
    
    const targetHeader = document.createElement("h3");
    targetHeader.textContent = "Target";
    targetHeader.style.color = "var(--cf-brand-primary)";
    targetSection.appendChild(targetHeader);
    
    const targetInfo = document.createElement("div");
    targetInfo.className = "controller-mapping-target-info";
    let targetLabel = "Unknown Target";
    if (mapping.target.type === 'widget') {
        targetLabel = `Widget: ${mapping.target.widgetName} (Node ${mapping.target.nodeId})`;
    } else if (mapping.target.type === 'command') {
        targetLabel = `Command: ${mapping.target.commandId}`;
    } else if (mapping.target.type === 'ui_element') {
        targetLabel = `UI Element: ${mapping.target.elementId}`;
    }
    targetInfo.innerHTML = targetLabel;
    targetSection.appendChild(targetInfo);
    
    content.appendChild(targetSection);
    
    // Mapping type selection
    const mappingTypeGroup = document.createElement("div");
    mappingTypeGroup.className = "controller-mapping-type-section";
    
    const mappingTypeHeader = document.createElement("h3");
    mappingTypeHeader.textContent = "Mapping Type";
    mappingTypeHeader.style.color = "var(--cf-brand-primary)";
    mappingTypeGroup.appendChild(mappingTypeHeader);
    
    const mappingTypeSelect = document.createElement("select");
    mappingTypeSelect.className = "controller-mapping-type-select";
    
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
    
    // Transformation settings (e.g., min/max for widgets)
    const transformContainer = document.createElement("div");
    transformContainer.className = "controller-mapping-type-section";
    
    // Declare inputs so they're available in the save handler
    let minInput, maxInput, stepInput, invertCheckbox;
    
    if (mapping.target.type === "widget") {
        const transformHeader = document.createElement("h3");
        transformHeader.textContent = "Value Range";
        transformHeader.style.color = "var(--cf-brand-primary)";
        transformContainer.appendChild(transformHeader);
        
        // Create a range container for min/max
        const rangeContainer = document.createElement("div");
        rangeContainer.className = "controller-mapping-range";
        
        // Min Value
        const minGroup = document.createElement("div");
        const minLabel = document.createElement("label");
        minLabel.textContent = "Min Value:";
        minInput = document.createElement("input");
        minInput.className = "controller-mapping-min";
        minInput.type = "number";
        minInput.value = mapping.transform?.targetMin ?? 0;
        minGroup.appendChild(minLabel);
        minGroup.appendChild(minInput);
        rangeContainer.appendChild(minGroup);

        // Max Value
        const maxGroup = document.createElement("div");
        const maxLabel = document.createElement("label");
        maxLabel.textContent = "Max Value:";
        maxInput = document.createElement("input");
        maxInput.className = "controller-mapping-max";
        maxInput.type = "number";
        maxInput.value = mapping.transform?.targetMax ?? 1;
        maxGroup.appendChild(maxLabel);
        maxGroup.appendChild(maxInput);
        rangeContainer.appendChild(maxGroup);
        
        transformContainer.appendChild(rangeContainer);

        // Step Size (show only for relevant mapping types)
        const stepGroup = document.createElement("div");
        stepGroup.className = "step-field hidden"; // Start hidden
        const stepLabel = document.createElement("label");
        stepLabel.textContent = "Step Size:";
        stepInput = document.createElement("input");
        stepInput.className = "controller-mapping-step";
        stepInput.type = "number";
        stepInput.value = mapping.transform?.stepSize ?? 0.1;
        stepGroup.appendChild(stepLabel);
        stepGroup.appendChild(stepInput);
        transformContainer.appendChild(stepGroup);

        // Invert Checkbox
        const invertGroup = document.createElement("div");
        invertGroup.className = "invert-field"; // Consistent class
        invertCheckbox = document.createElement("input");
        invertCheckbox.type = "checkbox";
        invertCheckbox.id = `mapping-edit-invert-${mapping.id}`;
        invertCheckbox.checked = mapping.transform?.isInverted ?? false; // Set initial state
        const invertLabel = document.createElement("label");
        invertLabel.htmlFor = invertCheckbox.id;
        invertLabel.textContent = "Invert Output";
        invertGroup.appendChild(invertCheckbox);
        invertGroup.appendChild(invertLabel);
        transformContainer.appendChild(invertGroup);
        
        // Function to show/hide step based on selected mapping type
        const updateStepVisibility = () => {
            const selectedType = mappingTypeSelect.value.toLowerCase();
            if (selectedType === "incremental" || selectedType === "decremental") {
                stepGroup.classList.remove("hidden");
            } else {
                stepGroup.classList.add("hidden");
            }
        };
        
        mappingTypeSelect.addEventListener('change', updateStepVisibility);
        updateStepVisibility(); // Initial check
        
        content.appendChild(transformContainer);
    }
    
    editor.appendChild(content);
    
    // Editor actions - Use controller-mapping-buttons structure
    const actions = document.createElement("div");
    actions.className = "controller-mapping-buttons"; // Use class from dialog.css
    
    // Create Cancel Button (using dialog class)
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "controller-cancel-button"; // Use class from dialog.css
    cancelBtn.textContent = "CANCEL";
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    actions.appendChild(cancelBtn);

    // Create Save Button (using dialog class)
    const saveBtn = document.createElement("button");
    saveBtn.className = "controller-map-button"; // Use class from dialog.css
    saveBtn.textContent = "SAVE CHANGES";
    saveBtn.style.backgroundColor = "var(--cf-brand-primary)";
    saveBtn.style.color = "white";
    saveBtn.onclick = () => {
        try {
            // Collect updated data
            const updatedData = {
                mappingType: mappingTypeSelect.value,
                transform: { ...mapping.transform } // Start with existing transform values
            };
            
            // Update transform properties if inputs exist
            if (minInput) updatedData.transform.targetMin = parseFloat(minInput.value);
            if (maxInput) updatedData.transform.targetMax = parseFloat(maxInput.value);
            
            // Only check stepGroup if it's defined (for widget targets only)
            if (stepInput) {
                // Check if step is applicable based on mapping type
                const isStepApplicable = ["incremental", "decremental"].includes(mappingTypeSelect.value.toLowerCase());
                
                if (isStepApplicable) {
                    updatedData.transform.stepSize = parseFloat(stepInput.value);
                } else {
                    // Ensure stepSize is removed or nullified if not applicable
                    delete updatedData.transform.stepSize;
                }
            }
            
            if (invertCheckbox) updatedData.transform.isInverted = invertCheckbox.checked; // <-- Get invert state
            
            // Update the mapping
            const mappingEngine = getMappingEngine();
            if (!mappingEngine) {
                console.error("MappingComponent: Mapping engine not available for save");
                showNotification("Mapping engine not available", "error");
                return;
            }
            
            const success = mappingEngine.updateMapping(mappingId, updatedData);
            
            if (success) {
                // Save the changes to persistent storage
                mappingEngine.saveMappings();
                
                showNotification("Mapping updated successfully", "success");
                // Make sure overlay exists before trying to remove it
                if (overlay && document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                
                // Optional: Refresh the list component display if needed
                if (listContainer && typeof listContainer.refresh === 'function') {
                     listContainer.refresh(); // Assuming a refresh method exists
                } else {
                     // Fallback: Emit event for list to listen to
                     eventBus.emit('mappings:changed'); 
                }
                
            } else {
                showNotification("Failed to update mapping", "error");
            }
        } catch (error) {
            console.error("Error saving mapping:", error);
            showNotification("Error: " + error.message, "error");
        }
    };
    actions.appendChild(saveBtn);
    
    editor.appendChild(actions);

    // Append editor to overlay, and overlay to body
    overlay.appendChild(editor);
    document.body.appendChild(overlay);

    // Focus first input maybe?
    const firstInput = editor.querySelector('input, select');
    if(firstInput) firstInput.focus();
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
        // Emit event for mapping deleted - we use the mappingPanel eventBus listeners to refresh the UI
        eventBus.emit('mapping:deleted', { mappingId });
        
        // Show notification if needed
        showNotification(`Mapping deleted`);
    }
    
    return success;
} 