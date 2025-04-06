/**
 * Client-side Mapping Engine for ComfyUI_ControlFreak
 */

import { app } from "../../../../scripts/app.js";
import { highlightNodeParameter } from "../handlers/controllerEventHandlers.js";
import { shouldTriggerCommand, transformInputValue, detectMappingType } from "./mappingTypes.js";
import { updateWidgetValue } from "./widgetUpdater.js";
import { CommandExecutor } from "./commandExecutor.js";
import { PersistenceManager } from "./persistenceManager.js";
import { WorkflowIntegration } from "./workflowIntegration.js";
import { eventBus } from "./eventBus.js";

export class MappingEngine {
    constructor(eventBus) {
        this.mappings = []; // Array to hold mapping objects
        this.activeProfile = 'default';
        this.eventBus = eventBus;
        
        // Initialize sub-components
        this.persistenceManager = new PersistenceManager();
        this.commandExecutor = new CommandExecutor(app);
        this.workflowIntegration = new WorkflowIntegration(app, this);
        
        // Set up event listeners
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Listen for controller input events from the event bus
        this.eventBus.on('controller:input', (controlInput) => {
            this.processControlInput(controlInput);
        });
        
        // Listen for profile change requests
        this.eventBus.on('profile:change', (profileName) => {
            this.setActiveProfile(profileName);
        });
        
        // Listen for mapping events
        this.eventBus.on('mapping:add', (mapping) => {
            this.addMapping(mapping);
        });
        
        this.eventBus.on('mapping:update', (mappingId, updatedProperties) => {
            this.updateMapping(mappingId, updatedProperties);
        });
        
        this.eventBus.on('mapping:delete', (mappingId) => {
            this.deleteMapping(mappingId);
        });
    }

    // --- Mapping Management ---

    addMapping(mapping) {
        // Add validation for the mapping object structure
        if (!mapping.id) {
            mapping.id = this.generateMappingId();
        }
        
        // Check if a mapping with the same ID already exists
        if (this.mappings.some(m => m.id === mapping.id)) {
            console.warn(`MappingEngine: Mapping with ID ${mapping.id} already exists. Skipping add.`);
            return; // Don't add duplicates
        }
        
        mapping.profile = mapping.profile || this.activeProfile;
        
        // Check if this is a widget mapping with min/max overrides
        if (mapping.target && mapping.target.type === 'widget' && mapping.transform) {
            // Find any existing mappings to the same widget
            const existingMappings = this.mappings.filter(m => 
                m.profile === mapping.profile && 
                m.target && 
                m.target.type === 'widget' && 
                m.target.nodeId === mapping.target.nodeId && 
                m.target.widgetName === mapping.target.widgetName
            );
            
            if (existingMappings.length > 0) {
                // Use the first existing mapping with transform data as the source of truth
                const sourceMapping = existingMappings.find(m => m.transform && 
                    (typeof m.transform.targetMin === 'number' || typeof m.transform.targetMax === 'number'));
                
                if (sourceMapping && sourceMapping.transform) {
                    // Override the new mapping's min/max with the existing values
                    if (typeof sourceMapping.transform.targetMin === 'number') {
                        mapping.transform.targetMin = sourceMapping.transform.targetMin;
                    }
                    if (typeof sourceMapping.transform.targetMax === 'number') {
                        mapping.transform.targetMax = sourceMapping.transform.targetMax;
                    }
                } else if (mapping.transform.targetMin !== undefined || mapping.transform.targetMax !== undefined) {
                    // This is the first mapping with overrides - apply to all existing mappings
                    for (const existingMapping of existingMappings) {
                        if (!existingMapping.transform) {
                            existingMapping.transform = {};
                        }
                        
                        if (typeof mapping.transform.targetMin === 'number') {
                            existingMapping.transform.targetMin = mapping.transform.targetMin;
                        }
                        if (typeof mapping.transform.targetMax === 'number') {
                            existingMapping.transform.targetMax = mapping.transform.targetMax;
                        }
                    }
                }
            }
        }
        
        this.mappings.push(mapping);
        // Saving should happen explicitly when needed (e.g., after import, UI changes), not always on add.
        // this.saveMappings(); 
        
        // Emit mapping added event
        this.eventBus.emit('mapping:added', mapping);
    }

    updateMapping(mappingId, updatedProperties) {
        const index = this.mappings.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            const previousMapping = { ...this.mappings[index] };
            this.mappings[index] = { ...previousMapping, ...updatedProperties };
            
            // Check if this update affects min/max overrides for a widget mapping
            const updatedMapping = this.mappings[index];
            if (updatedMapping.target && 
                updatedMapping.target.type === 'widget' && 
                updatedProperties.transform && 
                (typeof updatedProperties.transform.targetMin === 'number' || 
                 typeof updatedProperties.transform.targetMax === 'number')) {
                
                // Find all other mappings to the same widget
                const relatedMappings = this.mappings.filter(m => 
                    m.id !== mappingId && 
                    m.profile === updatedMapping.profile && 
                    m.target && 
                    m.target.type === 'widget' && 
                    m.target.nodeId === updatedMapping.target.nodeId && 
                    m.target.widgetName === updatedMapping.target.widgetName
                );
                
                // Update all related mappings with the same min/max overrides
                for (const relatedMapping of relatedMappings) {
                    // Initialize transform object if it doesn't exist
                    if (!relatedMapping.transform) {
                        relatedMapping.transform = {};
                    }
                    
                    // Synchronize the min/max values
                    if (typeof updatedProperties.transform.targetMin === 'number') {
                        relatedMapping.transform.targetMin = updatedProperties.transform.targetMin;
                    }
                    if (typeof updatedProperties.transform.targetMax === 'number') {
                        relatedMapping.transform.targetMax = updatedProperties.transform.targetMax;
                    }
                }
            }
            
            this.saveMappings();
            
            // Emit mapping updated event
            this.eventBus.emit('mapping:updated', this.mappings[index], previousMapping);
            
            return true;
        } else {
            return false;
        }
    }

    deleteMapping(mappingId) {
        const initialLength = this.mappings.length;
        const deletedMapping = this.getMappingById(mappingId);
        
        this.mappings = this.mappings.filter(m => m.id !== mappingId);
        
        if (this.mappings.length < initialLength) {
            this.saveMappings();
            
            // Emit mapping deleted event
            if (deletedMapping) {
                this.eventBus.emit('mapping:deleted', deletedMapping);
            }
            
            return true;
        } else {
            console.warn(`MappingEngine: Mapping with ID ${mappingId} not found for deletion.`);
            return false;
        }
    }

    getMappingById(mappingId) {
        return this.mappings.find(m => m.id === mappingId);
    }

    getMappings(profile = null) {
        const targetProfile = profile || this.activeProfile;
        return this.mappings.filter(m => m.profile === targetProfile);
    }

    /**
     * Get all mappings for a specific widget
     * @param {String|Number} nodeId - The node ID
     * @param {String} widgetName - The widget name
     * @param {String} profile - Optional profile name (defaults to active profile)
     * @returns {Array} - Array of mappings for the widget
     */
    getMappingsForWidget(nodeId, widgetName, profile = null) {
        const allMappings = this.getMappings(profile);
        return allMappings.filter(mapping => 
            mapping.target?.type === 'widget' && 
            mapping.target?.nodeId == nodeId && // Use == to allow string/number comparison
            mapping.target?.widgetName === widgetName
        );
    }

    // --- Profile Management ---

    setActiveProfile(profileName) {
        const previousProfile = this.activeProfile;
        this.activeProfile = profileName;
        
        // Save mappings to workflow when profile changes
        this.saveMappings();
        
        // Sync to workflow if exists
        this.workflowIntegration.syncProfileToWorkflow();
        
        // Emit profile changed event
        this.eventBus.emit('profile:changed', profileName, previousProfile);
        
    }

    getActiveProfile() {
        return this.activeProfile;
    }

    getAvailableProfiles() {
        const profiles = new Set(this.mappings.map(m => m.profile));
        // Ensure 'default' profile always exists
        profiles.add('default');
        return Array.from(profiles);
    }

    // --- Event Processing ---

    processControlInput(controlInput) {
        // Emit an event for this control input (useful for learning mode)
        this.eventBus.emit('controller:inputProcessed', controlInput);

        // Ensure rawValue exists
        if (typeof controlInput.rawValue === 'undefined') {
            console.warn("MappingEngine: Received control input without rawValue:", controlInput);
            return; // Cannot process without rawValue
        }

        const relevantMappings = this.getMappings().filter(m =>
            m.control.deviceId === controlInput.deviceId &&
            m.control.id === controlInput.controlId && 
            m.control.type === controlInput.type
        );

        // Process existing mappings (if any)
        for (const mapping of relevantMappings) {
            // Pass the rawValue to applyMapping
            this.applyMapping(mapping, controlInput.rawValue);
        }
        
        // Always emit unhandledInput *after* processing existing mappings.
        // The learningManager will decide if it needs to act on it based on its state.
        this.eventBus.emit('controller:unhandledInput', controlInput);
    }

    applyMapping(mapping, rawInputValue) { // Renamed parameter to rawInputValue
        // Skip processing if mapping is invalid
        if (!mapping || !mapping.target || !mapping.control) {
            console.warn("MappingEngine: Invalid mapping object, skipping.", mapping);
            return;
        }

        // Pass rawInputValue to transformInputValue
        let transformedValue = transformInputValue(mapping, rawInputValue, app);
        
        // Emit event for mapping being applied (useful for UI feedback)
        // Pass rawInputValue to the event as well
        this.eventBus.emit('mapping:applying', mapping, rawInputValue, transformedValue);

        // Apply the value to the appropriate target ONLY if a valid value was returned
        if (transformedValue !== undefined) {
            if (mapping.target.type === 'widget') {
                // Pass a flag to indicate this value is already transformed from raw to target range
                updateWidgetValue(app, mapping.target.nodeId, mapping.target.widgetName, transformedValue, mapping.mappingType, mapping, true);
                
                // Emit event for widget value updated
                this.eventBus.emit('widget:valueUpdated', {
                    nodeId: mapping.target.nodeId,
                    widgetName: mapping.target.widgetName,
                    value: transformedValue,
                    mapping
                });
            } else if (mapping.target.type === 'command') {
                // Commands are handled differently, using shouldTriggerCommand
                // Pass rawInputValue to shouldTriggerCommand for consistency
                if (shouldTriggerCommand(mapping, rawInputValue)) {
                    const commandId = mapping.target.commandId;
                    this.commandExecutor.executeCommand(commandId);
                    
                    // Emit event for command executed
                    this.eventBus.emit('command:executed', {
                        commandId,
                        mapping
                    });
                }
            } else if (mapping.target.type === 'ui_element') {
                // TODO: Implement UI element interaction
                
                // Emit event for UI element interaction (even though not implemented yet)
                this.eventBus.emit('ui:elementInteraction', {
                    elementId: mapping.target.elementId,
                    value: transformedValue,
                    mapping
                });
            }
        } 
        // Handle command triggering separately even if transformedValue is undefined
        // This ensures button releases don't re-trigger commands meant for press
        else if (mapping.target.type === 'command') {
             // Pass rawInputValue to shouldTriggerCommand
             if (shouldTriggerCommand(mapping, rawInputValue)) { 
                const commandId = mapping.target.commandId;
                this.commandExecutor.executeCommand(commandId);
                
                // Emit event for command executed
                this.eventBus.emit('command:executed', {
                    commandId,
                    mapping
                });
            }
        }
        
        // Emit event for mapping being applied (for post-processing)
        // Pass rawInputValue to the event
        this.eventBus.emit('mapping:applied', mapping, rawInputValue, transformedValue);
    }

    // --- Persistence ---

    saveMappings() {
        const data = {
            activeProfile: this.activeProfile,
            mappings: this.mappings
        };
        this.persistenceManager.saveMappings(data);
        
        // Emit event for mappings saved
        this.eventBus.emit('mappings:saved', data);
    }

    loadMappings() {
        const data = this.persistenceManager.loadMappings();
        if (data) {
            this.mappings = data.mappings || [];
            this.activeProfile = data.activeProfile || 'default';
            
            // Emit event for mappings loaded
            this.eventBus.emit('mappings:loaded', {
                mappings: this.mappings,
                activeProfile: this.activeProfile
            });
            
            
            // Ensure all mappings are properly reconnected to controllers
            this.reconnectMappings();
        } else {
            // Initialize with empty state if nothing is saved
            this.mappings = [];
            this.activeProfile = 'default';
            
            // Emit event for empty mappings initialized
            this.eventBus.emit('mappings:initialized', {
                mappings: this.mappings,
                activeProfile: this.activeProfile
            });
            
        }
    }

    /**
     * Reconnect all mappings to ensure they're active
     * Call this after loading mappings to ensure they control the nodes
     */
    reconnectMappings() {
        
        // For each mapping, check if the target exists and ensure it's properly connected
        this.getMappings().forEach(mapping => {
            if (!mapping || !mapping.target) return;
            
            try {
                // Check if the node exists in the graph
                if (mapping.target.type === 'widget' && mapping.target.nodeId) {
                    const node = app.graph.getNodeById(mapping.target.nodeId);
                    if (node) {
                        
                        // For widget targets, check if the widget exists
                        if (mapping.target.widgetName) {
                            const widget = node.widgets?.find(w => w.name === mapping.target.widgetName);
                            if (!widget) {
                                console.warn(`MappingEngine: Widget ${mapping.target.widgetName} not found on node ${mapping.target.nodeId}`);
                            }
                        }
                    } else {
                        console.warn(`MappingEngine: Target node ${mapping.target.nodeId} not found for mapping ${mapping.id}`);
                    }
                }
            } catch (error) {
                console.error(`MappingEngine: Error reconnecting mapping ${mapping.id}:`, error);
            }
        });
        
        // Emit mappings reconnected event
        this.eventBus.emit('mappings:reconnected');
        
    }

    // --- Command Registration ---

    registerCommandHandler(commandId, handler) {
        this.commandExecutor.registerCommandHandler(commandId, handler);
    }

    // --- Workflow Integration ---

    exportMappingsForWorkflow() {
        return this.getMappings(); // Only export mappings for current profile
    }

    /**
     * Generate a unique mapping ID
     * @returns {string} A unique ID
     */
    generateMappingId() {
        return `mapping_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    
    /**
     * Execute a command by ID
     * @param {string} commandId - The command ID to execute
     * @returns {boolean} Whether the command was executed successfully
     */
    executeCommand(commandId) {
        return this.commandExecutor.executeCommand(commandId);
    }

    /**
     * Checks if a specific widget on a specific node currently has an active mapping.
     * @param {number|string} nodeId The ID of the node.
     * @param {string} widgetName The name of the widget.
     * @returns {boolean} True if the widget is mapped in the active profile, false otherwise.
     */
    isWidgetMapped(nodeId, widgetName) {
        if (!this.mappings || this.mappings.length === 0) {
            return false;
        }
        const activeProfile = this.getActiveProfile();
        
        // Ensure nodeId is treated as a string for comparison if necessary
        const targetNodeId = String(nodeId);

        return this.mappings.some(mapping => 
            mapping.profile === activeProfile &&
            mapping.target.type === 'widget' &&
            String(mapping.target.nodeId) === targetNodeId &&
            mapping.target.widgetName === widgetName
        );
    }

    /**
     * Finds the mapping object for a specific widget on a specific node in the active profile.
     * @param {number|string} nodeId The ID of the node.
     * @param {string} widgetName The name of the widget.
     * @returns {object|null} The mapping object if found, otherwise null.
     */
    findMappingForWidget(nodeId, widgetName) {
        if (!this.mappings || this.mappings.length === 0) {
            return null;
        }
        const activeProfile = this.getActiveProfile();
        const targetNodeId = String(nodeId);

        return this.mappings.find(mapping => 
            mapping.profile === activeProfile &&
            mapping.target.type === 'widget' &&
            String(mapping.target.nodeId) === targetNodeId &&
            mapping.target.widgetName === widgetName
        ) || null; // Ensure null is returned if not found
    }
}

// Don't export a singleton instance here
// It will be created and registered by the main module 