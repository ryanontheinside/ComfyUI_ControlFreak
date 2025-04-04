/**
 * Controller button functionality for ComfyUI_ControlFreak
 */

import { showControllerDialog } from './dialogs.js';
import { showNotification } from './notifications.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';
import { toggleMappingUI } from './mappingPanel.js';
import { addControllerButtonStyles } from './styles/index.js';

/**
 * Add the controller management button to the UI
 */
export function addControllerButton() {
    try {
        // Find the ComfyUI header
        const headerDiv = document.querySelector(".comfy-menu");
        if (!headerDiv) {
            console.warn("ControlFreak: Could not find ComfyUI header menu");
            return;
        }
        
        // Add styles
        addControllerButtonStyles();
        
        // Create the controller button
        const controllerButton = document.createElement("button");
        controllerButton.className = "comfy-button controller-button";
        controllerButton.innerHTML = `
            <span class="controller-button-icon">🎮</span>
            <span>Control Freak</span>
        `;
        
        controllerButton.onclick = () => {
            // Get controllers from context provider
            const midiController = contextProvider.get('midiController');
            const gamepadController = contextProvider.get('gamepadController');
            const mappingEngine = contextProvider.get('mappingEngine');
            
            if (!midiController || !gamepadController) {
                showNotification("Controller system not fully initialized", 'error');
                return;
            }
            
            // Show the mapping panel instead of the old dialog
            toggleMappingUI(true);
            
            // Emit event for analytics
            eventBus.emit('ui:controllerButtonClicked');
        };
        
        // Add the button to the header
        headerDiv.appendChild(controllerButton);
        
        // Also set up event handling for direct controller connections
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
    const button = document.querySelector('.controller-button');
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