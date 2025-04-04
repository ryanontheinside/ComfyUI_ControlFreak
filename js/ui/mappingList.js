// UI components for mapping list (Client-Side)

import { createMappingList, deleteMapping } from './mappingComponent.js';
import { showNotification } from "./notifications.js";
import { contextProvider } from '../core/contextProvider.js';
import { app } from "../../../../scripts/app.js";
// Avoid direct import to break circular dependency
// import { mappingEngine } from "../index.js"; // Import client-side engine

// Get mapping engine from context provider
const getMappingEngine = () => contextProvider.get('mappingEngine');

/**
 * Loads and displays mapping data
 * @param {HTMLElement} panel - The panel to render mappings in
 */
export function loadMappingData(panel) {
    panel.innerHTML = '<div style="text-align: center; padding: 20px;">Loading mappings...</div>';
    
    try {
        const mappingEngine = getMappingEngine();
        if (!mappingEngine) {
            panel.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error: Mapping engine not initialized</div>';
            return;
        }
        
        // Get all mappings for the currently active profile from the engine
        const mappings = mappingEngine.getMappings();
        
        panel.innerHTML = '';
        
        if (mappings.length === 0) {
            panel.innerHTML = `<div class="no-mappings">No mappings created yet for profile "${mappingEngine.getActiveProfile()}". Right-click on a node parameter or use the Commands tab to map controls.</div>`;
            return;
        }
        
        // Group mappings by target to create mapping lists for each target
        const targets = groupMappingsByTarget(mappings);
        
        // Create a container for all mapping lists
        const container = document.createElement('div');
        container.className = 'all-mappings-container';
        
        // Create a header with instructions
        const header = document.createElement('div');
        header.className = 'mappings-panel-header';
        header.innerHTML = '<h3>Manage Controller Mappings</h3>' +
            `<p>Profile: <strong>${mappingEngine.getActiveProfile()}</strong>. View, edit, and delete mappings below.</p>`;
        container.appendChild(header);
        
        // Create mapping sections for each target
        for (const [targetKey, target] of Object.entries(targets)) {
            createTargetMappingSection(container, target);
        }
        
        panel.appendChild(container);
        
    } catch (error) {
        console.error('Error loading mapping data:', error);
        panel.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">Error loading mappings: ${error.message}</div>`;
    }
}

/**
 * Groups mappings by target type and info
 * @param {Array} mappings - List of all mappings
 * @returns {Object} Mappings grouped by target key (e.g., widget-NodeID-WidgetName)
 */
function groupMappingsByTarget(mappings) {
    const targets = {};
    
    for (const mapping of mappings) {
        // Skip if mapping structure is invalid
        if (!mapping || !mapping.target || !mapping.control) continue;
        
        let targetKey;
        let targetLabel;
        
        // Use the new mapping structure
        if (mapping.target.type === 'widget') {
            const nodeId = mapping.target.nodeId;
            const paramName = mapping.target.widgetName;
            targetKey = `node-${nodeId}-${paramName}`;
            // Try to get node title for better label
            const node = app.graph?.getNodeById(nodeId);
            const nodeTitle = node?.title || `Node ${nodeId}`;
            targetLabel = `${paramName} (${nodeTitle})`;
        } else if (mapping.target.type === 'ui_element') {
            const element = mapping.target.elementId;
            targetKey = `ui-${element}`;
            targetLabel = `UI Element: ${element}`;
        } else if (mapping.target.type === 'command') {
            const commandId = mapping.target.commandId;
            targetKey = `command-${commandId}`;
            
            // Format the command name for display
            // Convert "Comfy.QueuePrompt" to "Queue Prompt"
            let displayName = commandId;
            if (commandId.includes('.')) {
                displayName = commandId.split('.').pop(); // Get part after the last dot
                // Add spaces before capitals and remove camel case
                displayName = displayName.replace(/([A-Z])/g, ' $1').trim(); // Simple formatting
            }
            
            targetLabel = `Command: ${displayName}`;
        } else {
            targetKey = `other-${Math.random()}`;
            targetLabel = `Unknown Target Type: ${mapping.target.type || 'undefined'}`;
        }
        
        if (!targets[targetKey]) {
            targets[targetKey] = {
                type: mapping.target.type,
                label: targetLabel,
                info: mapping.target, // Store the whole target object
                mappings: []
            };
        }
        
        targets[targetKey].mappings.push(mapping);
    }
    
    return targets;
}

/**
 * Creates a section for mappings to a specific target
 * @param {HTMLElement} container - Container to append to
 * @param {Object} targetGroup - Grouped target information { type, label, info, mappings }
 */
function createTargetMappingSection(container, targetGroup) {
    const section = document.createElement('div');
    section.className = 'target-mappings-section';
    
    // Add a header for this target
    const header = document.createElement('h4');
    header.className = 'target-header';
    header.textContent = targetGroup.label;
    section.appendChild(header);
    
    // Create the mapping list component, passing the specific mappings for this target
    try {
        // Pass the specific mappings for this target to createMappingList
        const mappingList = createMappingList(targetGroup.mappings);
        
        section.appendChild(mappingList);
        container.appendChild(section);
    } catch (error) {
        console.error(`Error creating mapping list for ${targetGroup.label}:`, error);
        const errorEl = document.createElement('div');
        errorEl.className = 'mapping-error';
        errorEl.textContent = `Error loading mappings: ${error.message}`;
        section.appendChild(errorEl);
        container.appendChild(section);
    }
} 