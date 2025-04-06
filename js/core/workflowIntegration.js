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
                    const mappings = engine.exportMappingsForWorkflow();
                    
                    // Only add to workflow if we have mappings
                    if (mappings && mappings.length > 0) {
                        result.extra.controlFreak = {
                            // Only include active profile data
                            activeProfile: engine.getActiveProfile(),
                            // Only include mappings for active profile
                            mappings: mappings
                        };
                        
                        // Ensure the marker node is in the workflow
                        this._ensureMarkerNodeInWorkflow(result);
                    }
                }
            } catch (error) {
                console.error("WorkflowIntegration: Error adding mapping data to workflow JSON:", error);
            }
            
            return result;
        };
    }
    
    /**
     * Adds a hidden marker node to the workflow JSON if it doesn't exist
     * This ensures ComfyUI-Manager can detect the dependency
     * @private
     * @param {Object} workflowJSON - The workflow JSON object
     */
    _ensureMarkerNodeInWorkflow(workflowJSON) {
        try {
            // Check if any ControlFreak node already exists
            const hasMarkerNode = workflowJSON.nodes.some(node => 
                node.type === "ControlFreak"
            );
            
            // If no marker node exists, add one at a hidden position
            if (!hasMarkerNode) {
                // Add a hidden marker node to indicate ControlFreak is required
                const markerNode = {
                    id: `ControlFreak_Marker_${Date.now()}`,
                    type: "ControlFreak",
                    pos: [-9999, -9999], // Position far off-screen
                    inputs: {},
                    outputs: {},
                    properties: { "hidden": true }
                };
                
                workflowJSON.nodes.push(markerNode);
            }
        } catch (error) {
            console.error("WorkflowIntegration: Error adding marker node to workflow:", error);
        }
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
                const mappings = engine.exportMappingsForWorkflow();
                
                // Only update if we have mappings
                if (mappings && mappings.length > 0) {
                    this.app.graph.extra.controlFreak = {
                        activeProfile: engine.getActiveProfile(),
                        mappings: mappings
                    };
                    
                    // Ensure a marker node exists in the graph
                    this._addMarkerNodeToGraph();
                    
                    // Trigger a graph change event so it gets saved
                    this.app.graph.change();
                    
                    // Emit event for profile synced to workflow
                    eventBus.emit('workflow:profileSynced', {
                        profile: engine.getActiveProfile(),
                        mappingsCount: mappings.length
                    });
                }
            }
        } catch (error) {
            console.error("WorkflowIntegration: Error syncing profile to workflow:", error);
        }
    }
    
    /**
     * Add a marker node to the current graph if none exists
     * @private
     */
    _addMarkerNodeToGraph() {
        try {
            // Check if the marker node already exists in the graph
            const hasMarkerNode = this.app.graph.nodes.some(node => 
                node.type === "ControlFreak"
            );
            
            // If no marker node exists, add one
            if (!hasMarkerNode && window.LiteGraph) {
                // Create a marker node
                let node = LiteGraph.createNode("ControlFreak");
                // Position off-screen
                node.pos = [-9999, -9999];
                // Add to graph
                this.app.graph.add(node);
            }
        } catch (error) {
            console.error("WorkflowIntegration: Error adding marker node to graph:", error);
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
                // Import mappings from workflow by adding them individually
                if (workflowData.mappings && Array.isArray(workflowData.mappings)) {
                    let importedCount = 0;
                    workflowData.mappings.forEach(mapping => {
                        // The addMapping method now handles duplicate checks
                        engine.addMapping(mapping);
                        // Note: We might need to track if addMapping actually added it if we need an accurate count
                        importedCount++; // Assuming addMapping handles duplicates and we count all attempts
                    });
                    
                    // Save mappings after potentially adding multiple
                    engine.saveMappings(); 
                    
                    // Ensure marker node exists
                    this._addMarkerNodeToGraph();
                    
                    // Emit event after import and save
                    // Retrieve eventBus from context provider to ensure availability
                    const busForImport = contextProvider.get('eventBus');
                    if (busForImport) {
                         busForImport.emit('mappings:imported', workflowData.mappings); 
                    } else {
                         console.warn("WorkflowIntegration: eventBus not found in contextProvider when emitting mappings:imported");
                    }
                }
                
                // Set active profile
                if (workflowData.activeProfile) {
                    engine.setActiveProfile(workflowData.activeProfile);
                }
                
                // Emit event for profile synced from workflow
                // Retrieve eventBus from context provider to ensure availability
                const bus = contextProvider.get('eventBus');
                if (bus) {
                    bus.emit('workflow:profileLoaded', {
                        profile: workflowData.activeProfile || 'default',
                        mappingsCount: workflowData.mappings ? workflowData.mappings.length : 0
                    });
                } else {
                    console.warn("WorkflowIntegration: eventBus not found in contextProvider during syncProfileFromWorkflow");
                }
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
                
                // Check if we have mappings and add marker node if needed
                const workflowIntegration = new WorkflowIntegration(appInstance, mappingEngine);
                if (appInstance.graph.extra?.controlFreak?.mappings?.length > 0) {
                    workflowIntegration._addMarkerNodeToGraph();
                }
                
                // Emit event for graph loaded
                eventBus.emit('workflow:graphLoaded');
            } catch (error) {
                console.error("WorkflowIntegration: Error handling graph loaded:", error);
            }
        }
    }
} 