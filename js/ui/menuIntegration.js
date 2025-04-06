// Menu integration for Controller Mapping

import { app } from "../../../../scripts/app.js";
import { toggleMappingUI } from './mappingPanel.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';

/**
 * Sets up menu integration for the controller mapping UI
 */
export function setupMenuIntegration() {
    // Styles are loaded automatically via styles/index.js
}

/**
 * Registers the extension with ComfyUI
 * @param {Object} mappingEngine - The mapping engine instance
 */
export function registerExtension(mappingEngine) {
    // Store a reference to the mapping engine for the toggle function
    const wrappedToggle = (state) => {
        // Get the mapping engine from the context if not provided directly
        const engine = mappingEngine || contextProvider.get('mappingEngine');
        toggleMappingUI(state, engine);
        
        // Emit event for analytics
        eventBus.emit('menu:toggleMappingUI', { 
            state, 
            source: 'menuCommand'
        });
    };
    
    app.registerExtension({
        name: "ComfyUI.ControlFreak",
        
        // Define commands that will be used by menu items
        commands: [
            {
                id: "ComfyUI.ControlFreak.OpenManager",
                icon: "pi pi-gamepad",
                label: "Control Freak",
                function: wrappedToggle
            }
        ],

        // Define where these commands appear in the menu
        menuCommands: [
            {
                path: ["Workflow"],
                commands: [
                    null, // Separator
                    "ComfyUI.ControlFreak.OpenManager"
                ]
            }
        ],
        
        async setup() {
            // Setup menu integration and styles
            setupMenuIntegration();
            
            // Check if we need to use the old menu system 
            let useNewMenu = "Enabled"; // Default to new menu system
            
            // Safely check if the settings store exists
            try {
                if (app.ui.settings && app.ui.settings.store && typeof app.ui.settings.store.get === 'function') {
                    useNewMenu = app.ui.settings.store.get("Comfy.UseNewMenu") || "Enabled";
                }
            } catch (e) {
                console.log("[ControlFreak] Could not access settings store, defaulting to new menu system");
            }

            if (useNewMenu === "Disabled") {
                // Old menu system
                const menu = app.ui.menu;
                const workflowMenu = menu.getMenu("Workflow");
                if (workflowMenu) {
                    workflowMenu.addSeparator();
                    workflowMenu.addItem("Control Freak 🎮", wrappedToggle, { icon: "pi pi-gamepad" });
                }
            }
            // New menu system is handled automatically by the menuCommands registration
        }
    });
} 