// UI components for controller list (Client-Side)

import { contextProvider } from "../core/contextProvider.js";
import { eventBus } from "../core/eventBus.js";

// Create a simple debounce function
const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
};

/**
 * Loads and displays controller data
 * @param {HTMLElement} panel - The panel to render controllers in
 */
export function loadControllerData(panel) {
    // Set a flag on the panel to prevent multiple simultaneous updates
    if (panel.isUpdating) return;
    panel.isUpdating = true;
    
    panel.innerHTML = '<div class="cf-loading"><span class="cf-loading-icon">🎮</span>Loading controllers...</div>';
    
    try {
        // Get controllers from context
        const midiController = contextProvider.get('midiController');
        const gamepadController = contextProvider.get('gamepadController');
        
        // Clear the panel
        panel.innerHTML = '';
        
        // --- MIDI Controllers ---
        const midiSection = document.createElement('div');
        midiSection.className = 'controller-section midi-section';
        panel.appendChild(midiSection);
        
        const midiHeader = document.createElement('h3');
        midiHeader.className = 'cf-section-header';
        midiHeader.innerHTML = '<span class="cf-section-icon">🎹</span> MIDI Controllers';
        midiSection.appendChild(midiHeader);
        
        // Ensure midiController is initialized before accessing inputs
        if (midiController && midiController.initialized) {
            const midiInputs = midiController.getInputs();
            if (midiInputs.length === 0) {
                midiSection.appendChild(createNoDevicesMessage("No MIDI input devices detected."));
            } else {
                // Create a container for the cards
                const midiCardsContainer = document.createElement('div');
                midiCardsContainer.className = 'cf-cards-container';
                midiSection.appendChild(midiCardsContainer);
                
                midiInputs.forEach(device => {
                    createMidiDeviceCard(midiCardsContainer, device);
                });
            }
        } else {
             midiSection.appendChild(createNoDevicesMessage("Web MIDI API not supported, not enabled, or still initializing."));
        }
        
        // --- Gamepad Controllers ---
        const gamepadSection = document.createElement('div');
        gamepadSection.className = 'controller-section gamepad-section';
        panel.appendChild(gamepadSection);
        
        const gamepadHeader = document.createElement('h3');
        gamepadHeader.className = 'cf-section-header';
        gamepadHeader.innerHTML = '<span class="cf-section-icon">🎮</span> Gamepad Controllers';
        gamepadSection.appendChild(gamepadHeader);
        
        // Ensure gamepadController is initialized
        if (gamepadController) {
            const gamepads = gamepadController.getGamepads();
            if (gamepads.length === 0) {
                gamepadSection.appendChild(createNoDevicesMessage("No gamepads detected. Connect a gamepad and press a button."));
            } else {
                // Create a container for the cards
                const gamepadCardsContainer = document.createElement('div');
                gamepadCardsContainer.className = 'cf-cards-container';
                gamepadSection.appendChild(gamepadCardsContainer);
                
                gamepads.forEach(device => {
                    createGamepadDeviceCard(gamepadCardsContainer, device);
                });
            }
        } else {
            gamepadSection.appendChild(createNoDevicesMessage("Gamepad API not available or not initialized."));
        }
        
        // --- Add listeners to update UI on state change ---
        // Create a debounced update function to avoid excessive refreshes
        const debouncedUpdate = debounce(() => {
            if (panel.parentNode) { // Only update if still in DOM
                panel.isUpdating = false; // Reset the flag before calling update
                loadControllerData(panel);
            }
        }, 250); // 250ms debounce
        
        // Set up event listeners
        const midiUnsubscribe = eventBus.on('midi:stateChanged', () => {
            debouncedUpdate();
        });
        
        const gamepadUnsubscribe = eventBus.on('gamepad:stateChanged', () => {
            debouncedUpdate();
        });
        
        // Store unsubscribe functions on the panel for cleanup
        panel.controllerListCleanup = () => {
            midiUnsubscribe();
            gamepadUnsubscribe();
        };
        
    } catch (error) {
        console.error('Error loading controller data:', error);
        
        // Create error panel
        panel.innerHTML = `
            <div class="cf-error-panel">
                <h3 class="cf-error-title">Error loading controllers</h3>
                <p class="cf-error-message">${error.message}</p>
                <div class="cf-error-stack">${error.stack || "No stack trace available"}</div>
            </div>
        `;
    }
    
    // Reset the updating flag
    panel.isUpdating = false;
}

/** Helper to create "No devices" message */
function createNoDevicesMessage(text) {
    const noDevices = document.createElement('div');
    noDevices.className = 'cf-no-devices';
    noDevices.innerHTML = `
        <div class="cf-no-devices-icon">🔍</div>
        <p>${text}</p>
    `;
    return noDevices;
}

/**
 * Creates a MIDI device card UI component
 * @param {HTMLElement} container - The container to add the card to
 * @param {Object} device - The MIDI device data from WebMidiController
 */
function createMidiDeviceCard(container, device) {
    const deviceCard = document.createElement('div');
    deviceCard.className = 'controller-card midi-card';
    container.appendChild(deviceCard);
    
    // MIDI devices from Web MIDI API have a state property
    const isConnected = device.state === 'connected';
    
    // Add device header with status badge
    const deviceHeader = document.createElement('div');
    deviceHeader.className = 'controller-card-header';
    
    const deviceName = document.createElement('h4');
    deviceName.className = 'controller-card-title';
    deviceName.textContent = device.name;
    deviceName.title = `ID: ${device.id}\nManufacturer: ${device.manufacturer || 'N/A'}`;
    deviceHeader.appendChild(deviceName);
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `controller-status ${isConnected ? 'connected' : 'disconnected'}`;
    statusBadge.textContent = isConnected ? 'Connected' : 'Disconnected';
    deviceHeader.appendChild(statusBadge);
    
    deviceCard.appendChild(deviceHeader);
    
    // Device info (MIDI devices don't typically report button/axis counts)
    const deviceInfo = document.createElement('div');
    deviceInfo.className = 'device-info';
    deviceInfo.innerHTML = `
        <div class="device-type">
            <span class="device-type-icon">🎹</span>
            <span class="device-type-label">MIDI Device</span>
        </div>
        <div class="device-state">${device.state}</div>
    `;
    deviceCard.appendChild(deviceInfo);
    
    // Connect/disconnect controls
    const actions = document.createElement('div');
    actions.className = 'controller-actions';
    
    if (isConnected) {
        const disconnectBtn = document.createElement('button');
        disconnectBtn.className = 'disconnect-btn';
        disconnectBtn.innerHTML = '<span>Disconnect</span>';
        disconnectBtn.onclick = () => {
            eventBus.emit('midi:disconnect', device.id);
        };
        actions.appendChild(disconnectBtn);
    } else {
        const connectBtn = document.createElement('button');
        connectBtn.className = 'connect-btn';
        connectBtn.innerHTML = '<span>Connect</span>';
        connectBtn.onclick = () => {
            eventBus.emit('midi:connect', device.id);
        };
        actions.appendChild(connectBtn);
    }
    
    deviceCard.appendChild(actions);
}

/**
 * Creates a Gamepad device card UI component
 * @param {HTMLElement} container - The container to add the card to
 * @param {Object} device - The Gamepad device data from GamepadController
 */
function createGamepadDeviceCard(container, device) {
    const deviceCard = document.createElement('div');
    deviceCard.className = 'controller-card gamepad-card';
    container.appendChild(deviceCard);
    
    // Check if the gamepad is explicitly connected for input
    const isConnected = device.state === 'connected';
    
    // Add device header with status badge
    const deviceHeader = document.createElement('div');
    deviceHeader.className = 'controller-card-header';
    
    const deviceName = document.createElement('h4');
    deviceName.className = 'controller-card-title';
    deviceName.textContent = device.name;
    deviceName.title = `ID: ${device.id}`;
    deviceHeader.appendChild(deviceName);
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `controller-status ${isConnected ? 'connected' : 'detected'}`;
    statusBadge.textContent = isConnected ? 'Connected' : 'Detected';
    deviceHeader.appendChild(statusBadge);
    
    deviceCard.appendChild(deviceHeader);
    
    // Device info
    const deviceInfo = document.createElement('div');
    deviceInfo.className = 'device-info';
    if (device.buttons && device.axes) {
        deviceInfo.innerHTML = `
            <div class="device-type">
                <span class="device-type-icon">🎮</span>
                <span class="device-type-label">Gamepad</span>
            </div>
            <div class="device-specs">
                <span class="device-buttons">${device.buttons} buttons</span>
                <span class="device-axes">${device.axes} axes</span>
            </div>
        `;
    } else {
        deviceInfo.innerHTML = `
            <div class="device-type">
                <span class="device-type-icon">🎮</span>
                <span class="device-type-label">Gamepad</span>
            </div>
        `;
    }
    deviceCard.appendChild(deviceInfo);
    
    // Connect/disconnect controls
    const actions = document.createElement('div');
    actions.className = 'controller-actions';
    
    if (isConnected) {
        const disconnectBtn = document.createElement('button');
        disconnectBtn.className = 'disconnect-btn';
        disconnectBtn.innerHTML = '<span>Disconnect</span>';
        disconnectBtn.onclick = () => {
            eventBus.emit('gamepad:disconnect', device.id);
        };
        actions.appendChild(disconnectBtn);
    } else {
        const connectBtn = document.createElement('button');
        connectBtn.className = 'connect-btn';
        connectBtn.innerHTML = '<span>Connect</span>';
        connectBtn.onclick = () => {
            eventBus.emit('gamepad:connect', device.id);
        };
        actions.appendChild(connectBtn);
    }
    
    deviceCard.appendChild(actions);
} 