/**
 * Context menu functionality for ComfyUI_ControlFreak
 */

import { startMappingNode, startMappingCommand, startQuickMapping } from '../core/learningManager.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';
import { app } from '../../../scripts/app.js'; // Import app
import { showNotification } from '../ui/notifications.js'; // Make sure showNotification is imported

/**
 * Position a context menu at the cursor position
 * @param {HTMLElement} menuElement - The menu element to position
 * @param {MouseEvent} event - The mouse event from which to get cursor position
 */
function positionContextMenu(menuElement, event) {
    menuElement.style.top = event.clientY + "px";
    menuElement.style.left = event.clientX + "px";
}

// Helper to check if a widget is mappable
function isWidgetMappable(widget) {
    return widget &&
        (widget.type === "number" ||
         widget.type === "slider" ||
         widget.type === "combo" ||
         widget.type === "toggle" ||
         widget.type === "boolean" ||
         widget.type === "string") &&
        widget.name &&
        typeof widget.value !== 'undefined';
}

/**
 * Register context menu extensions for nodes
 * @param {Object} app - The ComfyUI app instance
 */
export function registerNodeContextMenu(appInstance) {
    if (!window.LGraphCanvas || !window.LGraphCanvas.prototype) {
        console.warn("ControlFreak: LGraphCanvas not available, cannot register context menu");
        return;
    }

    const originalGetNodeMenuOptions = window.LGraphCanvas.prototype.getNodeMenuOptions;
    const originalProcessContextMenu = window.LGraphCanvas.prototype.processContextMenu;

    // Override processContextMenu to identify the clicked widget using getWidgetAtCursor
    window.LGraphCanvas.prototype.processContextMenu = function(node, event) {
        this.clickedWidget = null; // Reset
        try {
            const widget = this.getWidgetAtCursor(); 
            
            if (widget && node && node.widgets && node.widgets.includes(widget)) {
                 this.clickedWidget = widget;
            } else {
                 this.clickedWidget = null;
            }
        } catch (e) {
            console.error("[ControlFreak Debug] Error calling getWidgetAtCursor():", e);
            this.clickedWidget = null;
        }
        
        // Call the original method AFTER potentially setting this.clickedWidget
        originalProcessContextMenu.call(this, node, event);
    };

    // Override getNodeMenuOptions
    window.LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
        const options = originalGetNodeMenuOptions.call(this, node);
        const clickedWidget = this.clickedWidget;
        this.clickedWidget = null;

        const mappingEngine = contextProvider.get('mappingEngine');
        if (!mappingEngine) return options; // Early exit if engine not ready

        let controlFreakMenuItems = [];
        let controlFreakOptionsAdded = false;

        try {
            // 1. Add specific Quick Map / Quick Unmap options if a widget was clicked
            if (clickedWidget && isWidgetMappable(clickedWidget)) {
                const existingMappings = mappingEngine.getMappingsForWidget(node.id, clickedWidget.name);
                
                controlFreakMenuItems.push(null); // Separator

                // Only show Quick Unmap if there is exactly ONE mapping
                if (existingMappings.length === 1) {
                    const mappingToUnmap = existingMappings[0];
                    
                    // Add Edit Mapping option - this will open the edit dialog directly
                    controlFreakMenuItems.push({
                        content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: Edit Mapping`,
                        callback: () => {
                            try {
                                // Import dynamically to avoid circular dependencies
                                import('./mappingComponent.js').then(({ showMappingEditor }) => {
                                    showMappingEditor(mappingToUnmap.id);
                                }).catch(err => {
                                    console.error("ControlFreak: Error importing mappingComponent:", err);
                                    showNotification("Error opening mapping editor", "error");
                                });
                            } catch (err) {
                                console.error("ControlFreak: Error opening mapping editor:", err);
                                showNotification("Error opening mapping editor", "error");
                            }
                        },
                        className: 'controlfreak-edit-mapping-option'
                    });
                    
                    // Add "Toggle Invert Mapping" option
                    controlFreakMenuItems.push({
                        content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: ${mappingToUnmap.transform?.isInverted ? 'Disable' : 'Enable'} Invert Mapping`,
                        callback: () => {
                            try {
                                // Get current invert state and toggle it
                                const currentIsInverted = !!mappingToUnmap.transform?.isInverted;
                                const newIsInverted = !currentIsInverted;
                                
                                // Update the mapping with new transform
                                const updatedData = {
                                    transform: { 
                                        ...(mappingToUnmap.transform || {}), 
                                        isInverted: newIsInverted 
                                    }
                                };
                                
                                // Update the mapping and save
                                mappingEngine.updateMapping(mappingToUnmap.id, updatedData);
                                mappingEngine.saveMappings();
                                
                                // Show notification and emit event
                                showNotification(
                                    `Invert mapping ${newIsInverted ? 'enabled' : 'disabled'} for '${clickedWidget.name}'`, 
                                    "success"
                                );
                            } catch (err) {
                                console.error("ControlFreak: Error toggling invert mapping:", err);
                                showNotification("Error toggling invert mapping", "error");
                            }
                        },
                        className: 'controlfreak-toggle-invert-option'
                    });
                    
                    // Add Quick Unmap option (existing code)
                    controlFreakMenuItems.push({
                        content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: Quick Unmap '${clickedWidget.name}'`,
                        callback: () => {
                            try {
                                mappingEngine.deleteMapping(mappingToUnmap.id);
                                mappingEngine.saveMappings();
                                showNotification(`Unmapped '${clickedWidget.name}'`, "success");
                                eventBus.emit('mapping:deleted', { mappingId: mappingToUnmap.id });
                            } catch (err) {
                                console.error("ControlFreak: Error during quick unmap:", err);
                                showNotification("Error unmapping widget", "error");
                            }
                        },
                        className: 'controlfreak-quickunmap-option'
                    });
                } else if (existingMappings.length === 0) {
                    // Only show Quick Map if there are NO mappings
                    controlFreakMenuItems.push({
                        content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: Quick Map '${clickedWidget.name}'`,
                        callback: () => {
                            startQuickMapping(node, clickedWidget);
                        },
                        className: 'controlfreak-quickmap-option'
                    });
                } else {
                     // If > 1 mapping exists, don't show Quick Unmap (user should use panel)
                }
                controlFreakOptionsAdded = true;

                // Add the "Standard Map..." option directly since a mappable widget was clicked
                controlFreakMenuItems.push({
                    content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: Standard Map '${clickedWidget.name}'...`,
                    callback: () => {
                        startMappingNode(node.id, clickedWidget.name);
                        eventBus.emit('menu:mappingStarted', {
                            type: 'widget',
                            nodeId: node.id,
                            nodeType: node.type,
                            nodeTitle: node.title || node.type,
                            widgetName: clickedWidget.name,
                            widgetType: clickedWidget.type
                        });
                    },
                    className: 'controlfreak-standardmap-option' // Optional: Add class for styling
                });

            } else if (clickedWidget) {
                 // Clicked on a widget, but it's not mappable (e.g., button, custompaint)
                 // Do nothing specific for ControlFreak here for now
            }
            // ELSE: Clicked on node background OR a non-mappable widget
            else if (node.widgets && node.widgets.length > 0) {
                 const mappableWidgets = node.widgets.filter(isWidgetMappable);
                 if (mappableWidgets.length > 0) {
                    // Only show the "Map Control..." submenu if no specific widget was clicked
                    const widgetMappingOptions = mappableWidgets.map(widget => ({
                        content: widget.name,
                        submenu: {
                            options: [
                                {
                                    content: "Standard Map...",
                                    callback: () => {
                                        startMappingNode(node.id, widget.name);
                                        eventBus.emit('menu:mappingStarted', {
                                            type: 'widget',
                                            nodeId: node.id,
                                            nodeType: node.type,
                                            nodeTitle: node.title || node.type,
                                            widgetName: widget.name,
                                            widgetType: widget.type
                                        });
                                    }
                                },
                                {
                                    content: "Quick Map",
                                    callback: () => {
                                        startQuickMapping(node, widget);
                                        eventBus.emit('menu:quickMappingStarted', {
                                            type: 'widget',
                                            nodeId: node.id,
                                            nodeType: node.type,
                                            nodeTitle: node.title || node.type,
                                            widgetName: widget.name,
                                            widgetType: widget.type
                                        });
                                    }
                                }
                            ]
                        }
                    }));

                    // Check if there are actually mappable widgets before adding the submenu
                    if (widgetMappingOptions.length > 0) {
                        if (controlFreakMenuItems.length === 0 || (controlFreakMenuItems.length > 0 && controlFreakMenuItems[0] !== null) ) {
                             controlFreakMenuItems.push(null); // Separator needed
                        }
                        controlFreakMenuItems.push({
                            content: `Control<span style="color: var(--cf-brand-primary); font-style: italic;">Freak</span>: Map Control...`,
                            submenu: {
                                options: widgetMappingOptions
                            }
                        });
                        controlFreakOptionsAdded = true;
                    }
                 }
            }

            // Add all prepared ControlFreak options
            if (controlFreakOptionsAdded) {
                options.push(...controlFreakMenuItems);
            }

        } catch (error) {
            console.error("ControlFreak: Error creating controller mapping menu:", error);
        }
        return options;
    };
}

/**
 * Register context menu for the queue button
 */
export function registerQueueButtonMenu() {
    try {
        // Find the queue button
        const queueButton = document.getElementById("queue-button");
        if (!queueButton) {
            return;
        }
        
        // Add the context menu handler
        queueButton.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            
            // Create a simple context menu for the queue button
            const menu = document.createElement("div");
            menu.className = "litegraph-context-menu";
            positionContextMenu(menu, e);
            
            const option = document.createElement("div");
            option.className = "menu-entry";
            option.textContent = "Map Controller to Queue Button";
            option.addEventListener("click", () => {
                // Use the imported function directly
                startMappingCommand("Comfy.QueuePrompt", {
                    label: "Queue Prompt",
                    description: "Execute current workflow"
                });
                
                // Remove the menu
                document.body.removeChild(menu);
                
                // Emit an event so we can track this in analytics if desired
                eventBus.emit('menu:mappingStarted', {
                    type: 'command',
                    commandId: 'Comfy.QueuePrompt',
                    commandLabel: 'Queue Prompt'
                });
            });
            
            menu.appendChild(option);
            document.body.appendChild(menu);
            
            // Remove the menu when clicking elsewhere
            const removeMenu = () => {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.body.removeEventListener("click", removeMenu);
            };
            
            setTimeout(() => {
                document.body.addEventListener("click", removeMenu);
            }, 0);
        });
    } catch (error) {
        console.error("ControlFreak: Error registering queue button menu:", error);
    }
} 