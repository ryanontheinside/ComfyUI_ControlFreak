/**
 * Command Executor for ComfyUI_ControlFreak
 */

/**
 * Class to handle command registration and execution
 */
export class CommandExecutor {
    constructor(app) {
        this.commandHandlers = {}; // Object to store command handlers
        this.app = app;
        // Access the ComfyUI API if available
        this.api = window.comfyAPI?.api?.api;
        // Access ComfyUI command store if available
        this.commandStore = window.comfyAPI?.stores?.useCommandStore?.();
    }

    /**
     * Register a handler for a specific command
     * @param {String} commandId - The command ID
     * @param {Function} handler - The function to call when the command is triggered
     */
    registerCommandHandler(commandId, handler) {
        if (typeof handler !== 'function') {
            console.error(`CommandExecutor: Handler for command ${commandId} must be a function.`);
            return;
        }
        this.commandHandlers[commandId] = handler;
    }

    /**
     * Execute a command if a handler is registered
     * @param {String} commandId - The command ID to execute
     * @returns {Boolean} Whether the command was handled
     */
    executeCommand(commandId) {
        // 1. Try our own registered handlers first
        const handler = this.commandHandlers[commandId];
        if (handler) {
            try {
                handler();
                return true;
            } catch (error) {
                console.error(`CommandExecutor: Error executing command ${commandId}:`, error);
                return false;
            }
        }

        // 2. Try to use the ComfyUI command store if available (preferred method)
        if (this.commandStore && typeof this.commandStore.execute === 'function') {
            try {
                this.commandStore.execute(commandId);
                return true;
            } catch (error) {
                // Fall through to our direct implementations
            }
        }

        // 3. Fallback to our direct implementations
        if (this.app) {
            switch (commandId) {
                // Methods available on the app object
                case "Comfy.QueuePrompt":
                    if (typeof this.app.queuePrompt === 'function') {
                        this.app.queuePrompt(0);
                        return true;
                    }
                    break;
                case "Comfy.QueuePromptFront":
                    if (typeof this.app.queuePrompt === 'function') {
                        this.app.queuePrompt(-1);
                        return true;
                    }
                    break;
                case "Comfy.OpenClipspace":
                    if (typeof this.app.openClipspace === 'function') {
                        this.app.openClipspace();
                        return true;
                    }
                    break;
                case "Comfy.RefreshNodeDefinitions":
                    if (typeof this.app.refreshComboInNodes === 'function') {
                        this.app.refreshComboInNodes();
                        return true;
                    }
                    break;
                case "Comfy.Canvas.ZoomIn":
                    if (this.app.canvas && this.app.canvas.ds) {
                        const ds = this.app.canvas.ds;
                        ds.changeScale(
                            ds.scale * 1.1,
                            ds.element ? [ds.element.width / 2, ds.element.height / 2] : undefined
                        );
                        this.app.canvas.setDirty(true, true);
                        return true;
                    }
                    break;
                case "Comfy.Canvas.ZoomOut":
                    if (this.app.canvas && this.app.canvas.ds) {
                        const ds = this.app.canvas.ds;
                        ds.changeScale(
                            ds.scale / 1.1,
                            ds.element ? [ds.element.width / 2, ds.element.height / 2] : undefined
                        );
                        this.app.canvas.setDirty(true, true);
                        return true;
                    }
                    break;
                case "Comfy.Canvas.FitView":
                    if (this.app.canvas) {
                        if (this.app.canvas.empty) {
                            console.warn("Canvas is empty, cannot fit view");
                            return false;
                        }
                        this.app.canvas.fitViewToSelectionAnimated();
                        return true;
                    }
                    break;
                case "Comfy.Canvas.ToggleLock":
                    if (this.app.canvas) {
                        this.app.canvas["read_only"] = !this.app.canvas["read_only"];
                        return true;
                    }
                    break;
                
                // Methods that use the API object
                case "Comfy.Interrupt":
                    if (this.api && typeof this.api.interrupt === 'function') {
                        this.api.interrupt();
                        return true;
                    }
                    break;
                
                case "Comfy.OpenWorkflow":
                    if (this.app.ui && typeof this.app.ui.loadFile === 'function') {
                        this.app.ui.loadFile();
                        return true;
                    }
                    break;
                case "Comfy.ClearWorkflow":
                    if (typeof this.app.clean === 'function' && this.app.graph) {
                        this.app.clean();
                        this.app.graph.clear();
                        return true;
                    }
                    break;
            }
        }

        // If we're handling a sidebar tab command and the workspaceStore is available
        if (commandId.startsWith("Workspace.ToggleSidebarTab.") && window.comfyAPI?.stores?.useWorkspaceStore) {
            const tabName = commandId.split(".").pop();
            try {
                const workspaceStore = window.comfyAPI.stores.useWorkspaceStore();
                if (workspaceStore && workspaceStore.sidebarTab && typeof workspaceStore.sidebarTab.toggleSidebarTab === 'function') {
                    workspaceStore.sidebarTab.toggleSidebarTab(tabName);
                    return true;
                }
            } catch (error) {
                console.error(`CommandExecutor: Error executing sidebar tab command ${commandId}:`, error);
            }
        }

        console.warn(`CommandExecutor: No handler registered for command ${commandId}`);
        return false;
    }
} 