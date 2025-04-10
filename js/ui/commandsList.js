// UI components for command list (Client-Side)

import { showNotification } from './notifications.js';
// REMOVED: import { showLearningDialog, hideLearningDialog } from './dialogs.js';
// REMOVED: import { contextProvider } from '../core/contextProvider.js';
import { startMappingCommand } from '../core/learningManager.js'; // Keep this import
// REMOVED style imports

// Access the global instance instead
// const getMappingEngine = () => window.controlFreakMappingEngine;

// Define common ComfyUI commands - these would typically be fetched from the server
// but we can define them directly in the client for our simplified architecture
const COMFY_UI_COMMANDS = [
    // Workflow execution
    { id: "Comfy.QueuePrompt", label: "Queue Prompt" },
    { id: "Comfy.QueuePromptFront", label: "Queue Prompt (Front)" },
    { id: "Comfy.Interrupt", label: "Interrupt" },
    
    // Workflow management
    { id: "Comfy.OpenWorkflow", label: "Open Workflow" },
    { id: "Comfy.ClearWorkflow", label: "Clear Workflow" },
    
    // Canvas controls
    { id: "Comfy.Canvas.ZoomIn", label: "Canvas Zoom In" },
    { id: "Comfy.Canvas.ZoomOut", label: "Canvas Zoom Out" },
    { id: "Comfy.Canvas.FitView", label: "Canvas Fit View" },
    
    // UI panels
    { id: "Workspace.ToggleSidebarTab.queue", label: "Toggle Queue Panel" },
    { id: "Workspace.ToggleSidebarTab.workflows", label: "Toggle Workflows Panel" },
    { id: "Workspace.ToggleSidebarTab.node-library", label: "Toggle Node Library Panel" }
];

/**
 * Loads and displays available commands
 * @param {HTMLElement} panel - The panel to render commands in
 */
export function loadCommandsData(panel) {
    panel.innerHTML = '<div style="text-align: center; padding: 20px;">Loading commands...</div>';
    
    try {
        // Use the predefined commands instead of fetching from server
        const commands = COMFY_UI_COMMANDS;
        
        panel.innerHTML = '';
        
        if (commands.length === 0) {
            panel.innerHTML = '<div class="no-commands">No commands available. ComfyUI commands system may not be accessible.</div>';
            return;
        }
        
        // Create a container for the commands list
        const container = document.createElement('div');
        container.className = 'commands-container';
        
        // Create a header with instructions
        const header = document.createElement('div');
        header.className = 'commands-panel-header';
        header.innerHTML = '<h3>Map Controllers to UI Commands</h3>' +
            '<p>Select a command to map it to a controller input.</p>';
        container.appendChild(header);
        
        // Group commands by category
        const commandsByCategory = groupCommandsByCategory(commands);
        
        // Create command sections for each category
        for (const [category, categoryCommands] of Object.entries(commandsByCategory)) {
            createCommandCategorySection(container, category, categoryCommands);
        }
        
        panel.appendChild(container);
        
    } catch (error) {
        console.error('Error loading commands data:', error);
        panel.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error loading commands: ' + error.message + '</div>';
    }
}

/**
 * Groups commands by category based on their id prefix
 * @param {Array} commands - List of all commands
 * @returns {Object} Commands grouped by category
 */
function groupCommandsByCategory(commands) {
    const groupedCommands = {};
    
    for (const command of commands) {
        let category = 'Other';
        
        // Extract category from command ID (e.g., "Comfy.Canvas.ZoomIn" -> "Comfy.Canvas")
        if (command.id && command.id.includes('.')) {
            const parts = command.id.split('.');
            if (parts.length >= 2) {
                category = `${parts[0]}.${parts[1]}`;
            }
        }
        
        if (!groupedCommands[category]) {
            groupedCommands[category] = [];
        }
        
        groupedCommands[category].push(command);
    }
    
    return groupedCommands;
}

/**
 * Creates a section for commands in a specific category
 * @param {HTMLElement} container - Container to append to
 * @param {String} category - Category name
 * @param {Array} commands - Commands in this category
 */
function createCommandCategorySection(container, category, commands) {
    const section = document.createElement('div');
    section.className = 'command-category-section';
    
    // Add a header for this category
    const header = document.createElement('h4');
    header.className = 'category-header';
    header.textContent = formatCategoryName(category);
    section.appendChild(header);
    
    // Create the command list
    const commandList = document.createElement('div');
    commandList.className = 'command-list';
    
    // Add each command
    commands.forEach(command => {
        const commandItem = createCommandItem(command);
        commandList.appendChild(commandItem);
    });
    
    section.appendChild(commandList);
    container.appendChild(section);
}

/**
 * Format category name for display
 * @param {String} category - Raw category name
 * @returns {String} Formatted category name
 */
function formatCategoryName(category) {
    return category.replace(/\./g, ' / ');
}

/**
 * Create a single command item
 * @param {Object} command - The command data
 * @returns {HTMLElement} The command item element
 */
function createCommandItem(command) {
    const item = document.createElement('div');
    item.className = 'command-item';
    
    // Command info
    const info = document.createElement('div');
    info.className = 'command-info';
    
    // Command label
    const label = document.createElement('div');
    label.className = 'command-label';
    label.textContent = command.label || command.id.split('.').pop();
    info.appendChild(label);
    
    // Command ID (smaller text below)
    const id = document.createElement('div');
    id.className = 'command-id';
    id.textContent = command.id;
    info.appendChild(id);
    
    item.appendChild(info);
    
    // Map button
    const mapBtn = document.createElement('button');
    mapBtn.textContent = 'Map';
    mapBtn.className = 'command-map-btn';
    mapBtn.onclick = () => initiateCommandMapping(command);
    
    item.appendChild(mapBtn);
    
    return item;
}

/**
 * Start mapping a command to a controller
 * @param {Object} command - The command to map
 */
function initiateCommandMapping(command) {
    try {
        // Call the centralized function from learningManager
        startMappingCommand(command.id, {
            label: command.label || command.id,
            description: `Execute "${command.label}" command`
        });

        // Notification is handled by startMappingCommand/showLearningDialog now
        // showNotification(`Move a controller to map to "${command.label}"`);
        
    } catch (error) {
        console.error("Error starting command mapping:", error);
        showNotification(`Failed to start mapping for "${command.label}"`, true);
    }
}

/**
 * Execute a ComfyUI command
 * @param {String} commandId - The ID of the command to execute
 */
// This function is replaced by the mappingEngine.executeCommand method
/* 
function executeCommand(commandId) {
    
    // Based on the command ID, perform different actions
    switch (commandId) {
        case "Comfy.QueuePrompt":
            app.queuePrompt();
            break;
        case "Comfy.QueuePromptFront":
            app.queuePrompt(true); // true for front of queue
            break;
        case "Comfy.Interrupt":
            app.interrupt();
            break;
        case "Comfy.ClearPendingTasks":
            if (typeof app.clearQueueInProgress === 'function') app.clearQueueInProgress();
            break;
        // Other command implementations can be added as needed
        // Many can be accessed via the app API or dispatched as events
        default:
            console.warn(`ControlFreak: Command ${commandId} not implemented`);
    }
}
*/

/**
 * Register default command handlers (if needed)
 */
(function registerDefaultCommandHandlers() {
    // Example of registering a handler directly using the CommandExecutor
    /* 
    const commandExecutor = contextProvider.get('commandExecutor');
    if (commandExecutor) {
        commandExecutor.registerCommandHandler('MyCustomCommand.Action', () => {
            console.log("My custom command handler executed!");
        });
    }
    */
})(); 