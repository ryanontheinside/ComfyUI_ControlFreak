/**
 * Persistence Manager for ComfyUI_ControlFreak
 * Handles saving and loading mappings to/from the workflow
 */

import { app } from "../../../../scripts/app.js";
import { contextProvider } from "./contextProvider.js";
import { eventBus } from "./eventBus.js";

export class PersistenceManager {
    constructor() {
        // Register event listener for graph JSON serialization
        this._setupEventListeners();
    }
    
    /**
     * Set up event listeners for serialization-related events
     * @private
     */
    _setupEventListeners() {
        // Listen for graph serialization errors
        eventBus.on('workflow:error', (error) => {
            console.error("PersistenceManager: Error during workflow operation:", error);
        });
    }
    
    /**
     * Save mappings to the workflow
     * @param {Object} data - Mapping data to save { activeProfile, mappings }
     */
    saveMappings(data) {
        try {
            if (!app || !app.graph) {
                console.warn("PersistenceManager: App or graph not available, can't save mappings");
                return;
            }
            
            // Ensure the graph.extra object exists
            if (!app.graph.extra) {
                app.graph.extra = {};
            }
            
            // Store data in the graph.extra.controlFreak object
            app.graph.extra.controlFreak = {
                activeProfile: data.activeProfile || 'default',
                mappings: data.mappings || []
            };
            
            // Trigger a graph change event so workflow saves the state
            app.graph.change();
            
            // Emit event for mappings saved
            eventBus.emit('persistence:mappingsSaved', {
                profileName: data.activeProfile,
                mappingsCount: data.mappings ? data.mappings.length : 0
            });
        } catch (error) {
            console.error("PersistenceManager: Error saving mappings:", error);
            
            // Emit error event
            eventBus.emit('persistence:error', {
                operation: 'save',
                error
            });
        }
    }
    
    /**
     * Load mappings from the workflow
     * @returns {Object|null} - The loaded mapping data or null if not found
     */
    loadMappings() {
        try {
            // Check for any pending data from Python
            const pendingData = contextProvider.get('pendingData');
            if (pendingData) {
                // Emit event for mappings loaded
                eventBus.emit('persistence:mappingsLoaded', {
                    source: 'pending',
                    profileName: pendingData.activeProfile,
                    mappingsCount: pendingData.mappings ? pendingData.mappings.length : 0
                });
                
                // Remove the pending data reference
                contextProvider.remove('pendingData');
                
                return pendingData;
            }
            
            // Check for data in the workflow
            if (!app || !app.graph || !app.graph.extra || !app.graph.extra.controlFreak) {
                // Emit event for no mappings found
                eventBus.emit('persistence:noMappingsFound');
                
                return null;
            }
            
            const data = app.graph.extra.controlFreak;
            
            // Emit event for mappings loaded
            eventBus.emit('persistence:mappingsLoaded', {
                source: 'workflow',
                profileName: data.activeProfile,
                mappingsCount: data.mappings ? data.mappings.length : 0
            });
            
            return data;
        } catch (error) {
            console.error("PersistenceManager: Error loading mappings:", error);
            
            // Emit error event
            eventBus.emit('persistence:error', {
                operation: 'load',
                error
            });
            
            return null;
        }
    }
    
    /**
     * Import mappings from workflow data
     * @param {Object} data - The workflow data to import
     * @returns {Object|null} - The processed mapping data or null if error
     */
    importMappingsFromWorkflow(data) {
        try {
            // Simple validation
            if (!data || !data.mappings) {
                console.warn("PersistenceManager: Invalid mapping data for import");
                return null;
            }
            
            // Process the data as needed (e.g., filter, transform)
            const processedData = {
                activeProfile: data.profile || 'default',
                mappings: data.mappings.filter(m => !!m) // Remove any null/undefined entries
            };
            
            // Emit event for mappings imported
            eventBus.emit('persistence:mappingsImported', {
                profileName: processedData.activeProfile,
                mappingsCount: processedData.mappings.length
            });
            
            return processedData;
        } catch (error) {
            console.error("PersistenceManager: Error importing mappings:", error);
            
            // Emit error event
            eventBus.emit('persistence:error', {
                operation: 'import',
                error
            });
            
            return null;
        }
    }
} 