/**
 * Gamepad Controller Implementation using the Gamepad API
 */

import { eventBus } from "../core/eventBus.js";

export class GamepadController {
    constructor() {
        this.gamepads = {};
        this.lastGamepadStates = {};
        this.initialized = false;
        this.animationFrameId = null;
        this.connectedGamepads = new Map();
        
        // Set up event bus subscriptions
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Listen for requests to connect/disconnect devices
        eventBus.on('gamepad:connect', async (gamepadId) => {
            await this.connect(gamepadId);
        });
        
        eventBus.on('gamepad:disconnect', async (gamepadId) => {
            await this.disconnect(gamepadId);
        });
    }

    initialize() {
        try {
            if (!navigator.getGamepads) {
                console.error("GamepadController: Gamepad API not supported in this browser.");
                eventBus.emit('gamepad:error', { message: "Gamepad API not supported in this browser" });
                return false;
            }

            // Set up event listeners for gamepad connection/disconnection
            window.addEventListener('gamepadconnected', (e) => this._handleGamepadConnected(e));
            window.addEventListener('gamepaddisconnected', (e) => this._handleGamepadDisconnected(e));

            // Start polling for gamepad state changes
            this._startPolling();
            this.initialized = true;
            
            // Emit initialization event
            eventBus.emit('gamepad:initialized', {
                gamepads: this.getGamepads()
            });
            
            return true;
        } catch (error) {
            console.error("GamepadController: Error initializing Gamepad API:", error);
            this.initialized = false;
            
            // Emit error event
            eventBus.emit('gamepad:error', {
                message: "Error initializing Gamepad API",
                error
            });
            
            return false;
        }
    }

    _startPolling() {
        // Clear any existing animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Function to poll gamepad states
        const pollGamepads = () => {
            // Get all currently connected gamepads
            const gamepads = navigator.getGamepads();
            
            // Update our gamepad states
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                
                if (!gamepad) continue;
                
                // Store the gamepad
                this.gamepads[gamepad.index] = gamepad;
                
                // Skip if we haven't connected this gamepad explicitly yet
                if (!this.connectedGamepads.has(gamepad.index.toString())) {
                    continue;
                }
                
                // Check for button state changes
                if (!this.lastGamepadStates[gamepad.index]) {
                    this.lastGamepadStates[gamepad.index] = {
                        buttons: Array(gamepad.buttons.length).fill(0),
                        axes: Array(gamepad.axes.length).fill(0)
                    };
                }
                
                // Check buttons
                for (let b = 0; b < gamepad.buttons.length; b++) {
                    const buttonValue = gamepad.buttons[b].value;
                    
                    // If button state has changed
                    if (buttonValue !== this.lastGamepadStates[gamepad.index].buttons[b]) {
                        // Create update object
                        const update = {
                            gamepadId: gamepad.index.toString(),
                            gamepadName: gamepad.id,
                            type: 'button',
                            index: b,
                            value: buttonValue,
                            pressed: gamepad.buttons[b].pressed
                        };
                        
                        // Emit the update event
                        eventBus.emit('gamepad:update', update);
                        
                        // Update the last state
                        this.lastGamepadStates[gamepad.index].buttons[b] = buttonValue;
                    }
                }
                
                // Check axes
                for (let a = 0; a < gamepad.axes.length; a++) {
                    const axisValue = gamepad.axes[a];
                    
                    // Apply deadzone to reduce noise
                    const deadzone = 0.05;
                    const processedValue = Math.abs(axisValue) < deadzone ? 0 : axisValue;
                    
                    // If axis state has changed
                    if (Math.abs(processedValue - this.lastGamepadStates[gamepad.index].axes[a]) > 0.01) {
                        // Create update object
                        const update = {
                            gamepadId: gamepad.index.toString(),
                            gamepadName: gamepad.id,
                            type: 'axis',
                            index: a,
                            value: processedValue,
                            // Some additional properties that might be useful
                            raw: axisValue
                        };
                        
                        // Emit the update event
                        eventBus.emit('gamepad:update', update);
                        
                        // Update the last state
                        this.lastGamepadStates[gamepad.index].axes[a] = processedValue;
                    }
                }
            }
            
            // Continue polling
            this.animationFrameId = requestAnimationFrame(pollGamepads);
        };
        
        // Start the polling loop
        this.animationFrameId = requestAnimationFrame(pollGamepads);
    }

    _stopPolling() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    _handleGamepadConnected(event) {
        const gamepad = event.gamepad;
        this.gamepads[gamepad.index] = gamepad;
        
        // Automatically connect new gamepads for input polling
        // This ensures inputs are processed without requiring manual connection
        this.connect(gamepad.index.toString());
        
        // Emit gamepad connected event
        eventBus.emit('gamepad:deviceConnected', {
            deviceId: gamepad.index.toString(),
            deviceName: gamepad.id,
            deviceType: 'gamepad'
        });
        
        // Update gamepad list
        eventBus.emit('gamepad:stateChanged', this.getGamepads());
    }

    _handleGamepadDisconnected(event) {
        const gamepad = event.gamepad;
        
        // Stop tracking this gamepad
        delete this.gamepads[gamepad.index];
        delete this.lastGamepadStates[gamepad.index];
        
        // Remove from connected gamepads
        this.connectedGamepads.delete(gamepad.index.toString());
        
        // Emit gamepad disconnected event
        eventBus.emit('gamepad:deviceDisconnected', {
            deviceId: gamepad.index.toString(),
            deviceName: gamepad.id,
            deviceType: 'gamepad'
        });
        
        // Update gamepad list
        eventBus.emit('gamepad:stateChanged', this.getGamepads());
    }

    /**
     * Connect to a gamepad to start receiving updates
     * @param {string} gamepadId - The gamepad ID to connect to (usually its index as string)
     * @returns {Promise<string>} - The connected gamepad ID
     */
    async connect(gamepadId) {
        try {
            if (!this.initialized) {
                this.initialize();
            }
            
            // Get the numeric index from the string ID
            const index = parseInt(gamepadId);
            
            // Check if the gamepad exists
            const gamepads = navigator.getGamepads();
            if (!gamepads[index]) {
                throw new Error(`Gamepad with ID ${gamepadId} not found`);
            }
            
            // Mark this gamepad as connected (for polling)
            this.connectedGamepads.set(gamepadId, gamepads[index].id);
            
            // Initialize the last state if needed
            if (!this.lastGamepadStates[index]) {
                this.lastGamepadStates[index] = {
                    buttons: Array(gamepads[index].buttons.length).fill(0),
                    axes: Array(gamepads[index].axes.length).fill(0)
                };
            }
            
            // Emit connected event
            eventBus.emit('gamepad:deviceConnected', {
                deviceId: gamepadId,
                deviceName: gamepads[index].id,
                deviceType: 'gamepad'
            });
            
            return gamepadId;
        } catch (error) {
            console.error(`GamepadController: Error connecting to gamepad ${gamepadId}:`, error);
            
            // Emit error event
            eventBus.emit('gamepad:error', {
                message: `Error connecting to gamepad ${gamepadId}`,
                error
            });
            
            throw error;
        }
    }
    
    /**
     * Disconnect from a gamepad to stop receiving updates
     * @param {string} gamepadId - The gamepad ID to disconnect from (usually its index as string)
     * @returns {Promise<boolean>} - Whether disconnection was successful
     */
    async disconnect(gamepadId) {
        try {
            // Get the numeric index from the string ID
            const index = parseInt(gamepadId);
            
            // Check if the gamepad is connected
            if (!this.connectedGamepads.has(gamepadId)) {
                throw new Error(`Gamepad with ID ${gamepadId} not found or already disconnected`);
            }
            
            // Stop tracking this gamepad
            this.connectedGamepads.delete(gamepadId);
            
            // Emit disconnected event
            eventBus.emit('gamepad:deviceDisconnected', {
                deviceId: gamepadId,
                deviceName: this.gamepads[index]?.id || "Unknown",
                deviceType: 'gamepad'
            });
            
            return true;
        } catch (error) {
            console.error(`GamepadController: Error disconnecting from gamepad ${gamepadId}:`, error);
            
            // Emit error event
            eventBus.emit('gamepad:error', {
                message: `Error disconnecting from gamepad ${gamepadId}`,
                error
            });
            
            return false;
        }
    }

    /**
     * Get all available gamepad devices
     * @returns {Array} Array of objects with gamepad information
     */
    getGamepads() {
        // Get fresh gamepad data from the API
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepadList = [];
        
        // Filter connected gamepads
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (gamepad) {
                gamepadList.push({
                    id: gamepad.index.toString(),
                    name: gamepad.id,
                    type: 'gamepad',
                    state: this.connectedGamepads.has(gamepad.index.toString()) ? 'connected' : 'detected',
                    buttons: gamepad.buttons.length,
                    axes: gamepad.axes.length
                });
            }
        }
        
        return gamepadList;
    }

    /**
     * Get available devices (for external API)
     * @returns {Array} List of available devices
     */
    getAvailableDevices() {
        return this.getGamepads();
    }

    /**
     * Legacy method to maintain backwards compatibility
     */
    onUpdate(callback) {
        // Subscribe the callback to the gamepad:update event
        return eventBus.on('gamepad:update', callback);
    }

    /**
     * Legacy method to maintain backwards compatibility
     */
    onStateChange(callback) {
        // Subscribe the callback to the gamepad:stateChanged event
        const unsubscribe = eventBus.on('gamepad:stateChanged', callback);
        
        // Immediately provide current state if already initialized
        if (this.initialized) {
            callback(this.getGamepads());
        }
        
        return unsubscribe;
    }
}

