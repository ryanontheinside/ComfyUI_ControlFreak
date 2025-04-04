/**
 * Workflow Integration for ComfyUI_ControlFreak
 * Handles saving and loading mappings from the workflow JSON
 */

import { app } from "../../../../scripts/app.js";
import { contextProvider } from "./contextProvider.js";
import { eventBus } from "./eventBus.js";

export class WorkflowIntegration {
    constructor(appInstance, mappingEngine) {
        this.app = appInstance || app;
        this.mappingEngine = mappingEngine;
        
        // Set up event listeners for graph changes
        this._setupEventListeners();
    }
    
    /**
     * Set up event listeners for ComfyUI workflow events
     * @private
     */
    _setupEventListeners() {
        // Add event listener for when graph is exported to JSON
        const originalGraphToJSON = this.app.graph.toJSON;
        this.app.graph.toJSON = (data) => {
            const result = originalGraphToJSON.call(this.app.graph, data);
            
            try {
                // Add our mappings data to the workflow JSON
                if (!result.extra) {
                    result.extra = {};
                }
                
                // Get the mapping engine to export mappings
                const engine = this.mappingEngine || contextProvider.get('mappingEngine');
                if (engine) {
                    result.extra.controlFreak = {
                        // Only include active profile data
                        activeProfile: engine.getActiveProfile(),
                        // Only include mappings for active profile
                        mappings: engine.exportMappingsForWorkflow()
                    };
                    
                }
            } catch (error) {
                console.error("WorkflowIntegration: Error adding mapping data to workflow JSON:", error);
            }
            
            return result;
        };
    }
    
    /**
     * Sync the profile and mappings to the workflow data
     * Call this when mappings have changed to update the workflow JSON
     */
    syncProfileToWorkflow() {
        if (!this.app || !this.app.graph) return;
        
        try {
            if (!this.app.graph.extra) {
                this.app.graph.extra = {};
            }
            
            // Get the mapping engine to export mappings
            const engine = this.mappingEngine || contextProvider.get('mappingEngine');
            if (engine) {
                this.app.graph.extra.controlFreak = {
                    activeProfile: engine.getActiveProfile(),
                    mappings: engine.exportMappingsForWorkflow()
                };
                
                // Trigger a graph change event so it gets saved
                this.app.graph.change();
                
                // Emit event for profile synced to workflow
                eventBus.emit('workflow:profileSynced', {
                    profile: engine.getActiveProfile(),
                    mappingsCount: engine.exportMappingsForWorkflow().length
                });
                
            }
        } catch (error) {
            console.error("WorkflowIntegration: Error syncing profile to workflow:", error);
        }
    }
    
    /**
     * Read the profile and mappings from the workflow data
     * Call this when a workflow is loaded to get the mapping data
     */
    syncProfileFromWorkflow() {
        if (!this.app?.graph?.extra?.controlFreak) return;
        
        try {
            const workflowData = this.app.graph.extra.controlFreak;
            
            // Get the mapping engine
            const engine = this.mappingEngine || contextProvider.get('mappingEngine');
            if (engine) {
                // Import mappings from workflow
                if (workflowData.mappings && Array.isArray(workflowData.mappings)) {
                    engine.importMappingsFromWorkflow(workflowData.mappings);
                }
                
                // Set active profile
                if (workflowData.activeProfile) {
                    engine.setActiveProfile(workflowData.activeProfile);
                }
                
                // Emit event for profile synced from workflow
                eventBus.emit('workflow:profileLoaded', {
                    profile: workflowData.activeProfile || 'default',
                    mappingsCount: workflowData.mappings ? workflowData.mappings.length : 0
                });
                
               
            }
        } catch (error) {
            console.error("WorkflowIntegration: Error loading profile from workflow:", error);
        }
    }
    
    /**
     * Handle graph loaded event
     * Called by ComfyUI when a workflow is loaded
     * @param {Object} appInstance - The ComfyUI app instance
     */
    static handleGraphLoaded(appInstance) {
        // Get mapping engine from context
        const mappingEngine = contextProvider.get('mappingEngine');
        
        if (mappingEngine && appInstance.graph) {
            try {
                // Load mappings from workflow
                mappingEngine.loadMappings();
                
                // Ensure all mappings are properly reconnected
                if (mappingEngine.reconnectMappings) {
                    mappingEngine.reconnectMappings();
                }
                
                // Emit event for graph loaded
                eventBus.emit('workflow:graphLoaded');
            } catch (error) {
                console.error("WorkflowIntegration: Error handling graph loaded:", error);
            }
        }
    }
} 