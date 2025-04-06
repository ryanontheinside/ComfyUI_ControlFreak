/**
 * Controller button functionality for ComfyUI_ControlFreak
 */

import { app } from "../../../../scripts/app.js";
import { showNotification } from './notifications.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';
import { toggleMappingUI } from './mappingPanel.js';

/**
 * Add the controller management button to the UI
 */
export async function addControllerButton() {
    try {
        // Find the ComfyUI header
        const menu = document.querySelector(".comfy-menu");
        if (!menu) {
            console.warn("ControlFreak: Could not find ComfyUI header menu");
            return;
        }
        
        // Add a separator
        const separator = document.createElement("hr");
        separator.className = "cf-menu-separator";
        menu.append(separator);
        
        // Create the click handler
        const handleClick = () => {
            // Get controllers from context provider
            const midiController = contextProvider.get('midiController');
            const gamepadController = contextProvider.get('gamepadController');
            const mappingEngine = contextProvider.get('mappingEngine');
            
            if (!midiController || !gamepadController) {
                showNotification("Controller system not fully initialized", 'error');
                return;
            }
            
            // Show the mapping panel
            toggleMappingUI(true);
            
            // Emit event for analytics
            eventBus.emit('ui:controllerButtonClicked');
        };

        try {
            // Import the ComfyButtonGroup for proper integration
            const { ComfyButtonGroup } = await import("../../../../scripts/ui/components/buttonGroup.js");
            
            // Create our branded button
            const controlFreakButton = document.createElement("button");
            controlFreakButton.className = "cf-menu-button";
            controlFreakButton.id = "controlfreak-menu-button";
            controlFreakButton.title = "Control Freak - Map your controllers to ComfyUI";
            
            // Add the branded text
            const brandText = document.createElement("span");
            brandText.className = "cf-brand-text";
            brandText.innerHTML = 'Control<span class="cf-brand-highlight">Freak</span>';
            controlFreakButton.appendChild(brandText);
            
            // Set click handler
            controlFreakButton.onclick = handleClick;
            
            // Create a wrapper for proper menu integration
            const buttonWrapper = document.createElement("div");
            buttonWrapper.className = "comfyui-tool-group cf-button-wrapper";
            buttonWrapper.appendChild(controlFreakButton);
            
            // Insert before settings group
            app.menu?.settingsGroup.element.before(buttonWrapper);
        }
        catch(exception) {
            console.error('ControlFreak: Error adding button to menu:', exception);
        }
        
        // Set up event handling for controller connections
        setupControllerEvents();
        
        // Set up handler to update button state when controllers connect
        updateButtonState();
    } catch (error) {
        console.error("ControlFreak: Error adding controller button:", error);
    }
}

/**
 * Update button state based on connected controllers
 */
function updateButtonState() {
    const button = document.querySelector('#controlfreak-menu-button');
    if (!button) return;
    
    const midiController = contextProvider.get('midiController');
    const gamepadController = contextProvider.get('gamepadController');
    
    // Count total connected controllers
    let connectedCount = 0;
    
    if (midiController) {
        const midiInputs = midiController.getInputs();
        connectedCount += midiInputs.filter(d => d.state === 'connected').length;
    }
    
    if (gamepadController) {
        const gamepads = gamepadController.getGamepads();
        connectedCount += gamepads.filter(d => d.state === 'connected').length;
    }
    
    // Update button state
    if (connectedCount > 0) {
        button.classList.add('connected');
        button.title = `${connectedCount} controller${connectedCount > 1 ? 's' : ''} connected`;
    } else {
        button.classList.remove('connected');
        button.title = 'No controllers connected';
    }
}

/**
 * Set up handler functions for controller events
 */
function setupControllerEvents() {
    // Set up event handlers for controller connections
    eventBus.on('midi:deviceConnected', (device) => {
        showNotification(`MIDI Device Connected: ${device.deviceName}`, 'success');
        updateButtonState();
    });
    
    eventBus.on('midi:deviceDisconnected', (device) => {
        showNotification(`MIDI Device Disconnected: ${device.deviceName}`, 'info');
        updateButtonState();
    });
    
    eventBus.on('gamepad:deviceConnected', (device) => {
        showNotification(`Gamepad Connected: ${device.deviceName}`, 'success');
        updateButtonState();
    });
    
    eventBus.on('gamepad:deviceDisconnected', (device) => {
        showNotification(`Gamepad Disconnected: ${device.deviceName}`, 'info');
        updateButtonState();
    });
    
    // State changes
    eventBus.on('midi:stateChanged', () => updateButtonState());
    eventBus.on('gamepad:stateChanged', () => updateButtonState());
    
    // Error handling
    eventBus.on('midi:error', (error) => {
        showNotification(`MIDI Error: ${error.message}`, 'error');
    });
    
    eventBus.on('gamepad:error', (error) => {
        showNotification(`Gamepad Error: ${error.message}`, 'error');
    });
} 