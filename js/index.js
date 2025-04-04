/**
 * Main entry point for the Controller Mapping system
 * Exports all modules
 */

import { app } from "../../../scripts/app.js";
import { WebMidiController } from './controllers/midi.js';
import { GamepadController } from './controllers/gamepad.js';
import { MappingEngine } from './core/mappingEngine.js';
import { WorkflowIntegration } from './core/workflowIntegration.js';
import { showNotification } from './ui/notifications.js';
import { registerNodeContextMenu } from './ui/contextMenu.js';
import { addControllerButton } from './ui/controllerButton.js';
import { 
    addDialogStyles, 
    addNotificationStyles, 
    addPanelStyles, 
    addMappingComponentStyles,
    addContextMenuStyles,
    addControllerButtonStyles,
    defineThemeVariables,
    applyBrandingStyles
} from './ui/styles/index.js';
import { contextProvider } from './core/contextProvider.js';
import { eventBus } from './core/eventBus.js';
import { LearningStateManager } from './core/learningStateManager.js';

// Import UI components after core initialization to avoid circular dependencies
import { showLearningDialog, hideLearningDialog, showControllerDialog } from './ui/dialogs.js';
import { startMappingNode, startMappingUI, cancelLearning, completeMapping as completeStandardMapping } from './core/learningManager.js';
import { showDetectedInput, highlightNodeParameter } from './handlers/controllerEventHandlers.js';
import { registerExtension as registerMenuExtension } from './ui/menuIntegration.js';
import { createMappingList, deleteMapping } from './ui/mappingComponent.js';
import { toggleMappingUI } from './ui/mappingPanel.js';
import { initWidgetHighlighter } from './ui/widgetHighlighter.js';

// Variables to store controller instances for exports
let midiController, gamepadController, mappingEngine;

// Initialize the ControlFreak system
async function initializeControlFreak() {
    // Initialize core instances
    mappingEngine = new MappingEngine(eventBus);
    midiController = new WebMidiController();
    gamepadController = new GamepadController();
    const learningState = LearningStateManager.getInstance(eventBus);
    
    // Register instances with context provider
    contextProvider.register('mappingEngine', mappingEngine);
    contextProvider.register('midiController', midiController);
    contextProvider.register('gamepadController', gamepadController);
    contextProvider.register('eventBus', eventBus);
    contextProvider.register('learningState', learningState);
    
    // Initialize UI styles
    initializeUI();
    
    // Initialize controller-UI event handlers
    initializeControllerUIHandlers();
    
    // Setup workflow event handlers
    setupWorkflowEventHandlers();
    
    // Initialize controllers
    await midiController.initialize();
    gamepadController.initialize();
    
    // Setup controller event listeners
    setupControllerEventListeners(midiController, gamepadController);
    
    // Wait until ComfyUI has loaded the graph before syncing with workflow
    waitForGraph();
}

// Add UI initialization
function initializeUI() {
    // Apply theme variables first
    defineThemeVariables();
    
    // Add all styles
    addDialogStyles();
    addNotificationStyles();
    addPanelStyles();
    addMappingComponentStyles();
    addContextMenuStyles();
    addControllerButtonStyles();
    
    // Apply branding styles
    applyBrandingStyles();
}

// Initialize direct controller-to-UI handlers
function initializeControllerUIHandlers() {
    // Listen for controller inputs
    eventBus.on('controller:input', (controlInput) => {
        const learningState = LearningStateManager.getInstance(); // Use the singleton instance
        const mappingEngine = contextProvider.get('mappingEngine');
        
        // Log the current state before checking
        // if (learningState) {
        //      console.log(`[ControlFreak Debug] controller:input received. isQuickLearning = ${learningState.isQuickLearning}, isLearning = ${learningState.isLearning}`);
        // }

        // --- Quick Learning Handling --- 
        if (learningState && learningState.isQuickLearning) {
            const quickContext = learningState.getQuickLearningContext();
            if (quickContext && mappingEngine) {
                try {
                    const { node, widget, defaultSettings } = quickContext;
                    
                    // Construct the mapping object directly
                    const newMapping = {
                        id: `mapping_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        profile: mappingEngine.getActiveProfile(),
                        control: {
                            type: controlInput.type,
                            deviceId: controlInput.deviceId,
                            id: controlInput.controlId,
                            name: controlInput.name || `${controlInput.type} ${controlInput.controlId}`,
                            // Set appropriate default input range based on control type
                            input_min: (controlInput.type === 'midi' || controlInput.type === 'midi_cc') ? 0 : (controlInput.type === 'gamepad_axis' ? -1 : 0),
                            input_max: (controlInput.type === 'midi' || controlInput.type === 'midi_cc') ? 127 : 1,
                        },
                        target: {
                            type: "widget",
                            nodeId: node.id,
                            widgetName: widget.name,
                            nodeTitle: node.title || node.type,
                            comfyClass: node.comfyClass, // Include comfyClass if available
                        },
                        // Apply defaults from getDefaultSettingsForWidget
                        mappingMode: defaultSettings.mappingMode,
                        transform: {
                            targetMin: defaultSettings.rangeMin,
                            targetMax: defaultSettings.rangeMax,
                            sensitivity: defaultSettings.sensitivity,
                            toggleThreshold: defaultSettings.toggleThreshold,
                            isInverted: defaultSettings.isInverted,
                        },
                        // Ensure mappingType is set (can refine later if needed)
                        mappingType: defaultSettings.mappingMode === 'toggle' ? 'toggle' : (defaultSettings.mappingMode === 'relative' ? 'relative' : 'absolute'),
                    };

                    // Add the mapping
                    mappingEngine.addMapping(newMapping);
                    mappingEngine.saveMappings(); // Persist the change
                    
                    // Complete the learning state
                    learningState.completeLearning();
                    
                    // Notify user
                    showNotification(`Quick map created: ${controlInput.name} -> ${widget.name}`, "success", 3000);
                    
                    // Highlight the parameter
                    eventBus.emit('mapping:created', newMapping);
                    
                    return; // Don't process further for standard learning dialog
                    
                } catch (error) {
                    console.error("ControlFreak: Error during Quick Mapping completion:", error);
                    showNotification("Quick map failed. Check console.", "error");
                    learningState.cancelLearning(); // Cancel on error
                    return;
                }
            }
        }

        // --- Standard Learning Dialog Handling --- 
        if (learningState && learningState.isLearning && learningState.learningDialog) {
            const dialog = learningState.learningDialog;
            const inputContainer = dialog.querySelector(".controller-mapping-input-list");
            const mapButton = dialog.querySelector(".controller-map-button");

            if (inputContainer) {
                try {
                    // Only update the dialog display here. 
                    // showDetectedInput handles setting the state *when the user clicks* an item.
                    showDetectedInput(controlInput, {
                        inputContainer,
                        mapButton
                    });
                } catch (error) {
                    console.error("ControlFreak: Error updating learning dialog:", error);
                }
            } else {
                console.error("ControlFreak: inputContainer not found in standard learning dialog");
            }
        }
    });
}

// Add a handler for workflow events
function setupWorkflowEventHandlers() {
    // Check if we have access to the LiteGraph graph
    if (!app || !app.graph) {
        console.warn("ControlFreak: Can't set up workflow event handlers - app or graph not available");
        return;
    }

    // Use ComfyUI's registerExtension API for graph events
    app.registerExtension({
        name: "ControlFreak.WorkflowEvents",
        async setup() {
            // Nothing to do here
        },
        async beforeClearGraph() {
            const mappingEngine = contextProvider.get('mappingEngine');
            
            if (mappingEngine) {
                mappingEngine.mappings = [];
                mappingEngine.setActiveProfile('default');
                
                // Clear any stored data
                if (app.graph) {
                    if (!app.graph.extra) app.graph.extra = {};
                    app.graph.extra.controlFreak = {
                        activeProfile: 'default',
                        mappings: []
                    };
                }
                
                // Notify about the reset
                eventBus.emit('mappings:reset');
            }
        },
        async graphLoaded() {
            // Use a small delay to ensure the graph is fully loaded
            setTimeout(() => {
                const mappingEngine = contextProvider.get('mappingEngine');
                if (mappingEngine && app.graph) {
                    mappingEngine.loadMappings();
                }
            }, 300);
        }
    });
}

// Set up event listeners for controllers
function setupControllerEventListeners(midiController, gamepadController) {
    // Setup event listeners for controllers to feed into the mapping engine via event bus
    midiController.onMessage(message => {
        // Format MIDI message for the mapping engine
        const controlInput = {
            type: 'midi', // Or more specific like 'midi_cc', 'midi_note'
            deviceId: message.deviceId, // Use the actual device ID from the Web MIDI API
            controlId: `${message.command}_${message.control}`, // e.g., "176_7" for CC 7
            rawValue: message.value,
            deviceName: message.deviceName,
            name: `MIDI ${message.command === 144 ? 'Note' : 'CC'} ${message.control}`
        };
        
        // Publish to event bus
        eventBus.emit('controller:input', controlInput);
    });

    gamepadController.onUpdate(update => {
        // Format Gamepad update for the mapping engine
        const controlInput = {
            type: update.type === 'button' ? 'gamepad_button' : 'gamepad_axis',
            deviceId: update.gamepadId, // Use the gamepad ID
            controlId: `${update.type}_${update.index}`, // e.g., "button_0", "axis_1"
            rawValue: update.value, // This is already correctly processed with deadzone in the gamepad controller
            name: `Gamepad ${update.type === 'button' ? 'Button' : 'Axis'} ${update.index}`,
            // Include additional data that may be helpful
            details: {
                raw: update.raw, // Original raw value before deadzone processing
                pressed: update.pressed, // For buttons
                index: update.index
            }
        };
        
        // Publish to event bus
        eventBus.emit('controller:input', controlInput);
    });

    // Listen for state changes to update UI (e.g., controller list)
    // Use a debounce mechanism to prevent infinite recursion
    let midiStateChangePending = false;
    midiController.onStateChange((inputs, outputs) => {
        if (midiStateChangePending) return;
        midiStateChangePending = true;
        
        // Publish to event bus
        setTimeout(() => {
            eventBus.emit('midi:stateChanged', inputs, outputs);
            midiStateChangePending = false;
        }, 50);
    });

    // Use a debounce mechanism for gamepad state changes too
    let gamepadStateChangePending = false;
    gamepadController.onStateChange(gamepads => {
        if (gamepadStateChangePending) return;
        gamepadStateChangePending = true;
        
        // Publish to event bus with a small delay to break potential recursion
        setTimeout(() => {
            eventBus.emit('gamepad:stateChanged', gamepads);
            gamepadStateChangePending = false;
        }, 50);
    });
}

// Wait for graph to be available before loading mappings
function waitForGraph() {
    if (app && app.graph && app.graph.nodes) {
        try {
            const mappingEngine = contextProvider.get('mappingEngine');
            if (mappingEngine) {
                mappingEngine.loadMappings();
                setTimeout(() => {
                    if (mappingEngine.reconnectMappings) {
                        mappingEngine.reconnectMappings();
                    }
                }, 500);
                setTimeout(() => {
                    if (mappingEngine.workflowIntegration) {
                        mappingEngine.workflowIntegration.syncProfileFromWorkflow();
                    }
                }, 500);
            }

        } catch (error) {
            console.error("ControlFreak: Error syncing with workflow:", error);
        }
    } else {
        setTimeout(waitForGraph, 1000); // Try again in 1 second
    }
}

// Export necessary components for potential external use
export { contextProvider, eventBus };
export { toggleMappingUI };
export { startMappingNode, startMappingUI };

// Export controller instances for backward compatibility
export { midiController, gamepadController, mappingEngine };

// Initialize the ControlFreak system via the single extension point
app.registerExtension({
    name: "Comfy.ControlFreak.Client",
    priority: 1000,
    async setup(appInstance) {
        try {
            // Initialize core components first
            await initializeControlFreak();
            
            // Initialize all UI components here after core is ready
            registerNodeContextMenu(appInstance);
            addControllerButton();
            registerMenuExtension(contextProvider.get('mappingEngine'));

            // *** INITIALIZE WIDGET HIGHLIGHTER ***
            initWidgetHighlighter(); 

        } catch (error) {
            console.error("ControlFreak: Error in extension setup:", error);
        }
    }
}); 