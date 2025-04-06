/**
 * Web MIDI Controller Implementation using the Web MIDI API
 */

import { eventBus } from "../core/eventBus.js";

export class WebMidiController {
    constructor() {
        this.midiAccess = null;
        this.inputs = new Map();
        this.outputs = new Map();
        this.initialized = false;
        
        // Set up event bus subscriptions
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Listen for requests to connect/disconnect devices
        eventBus.on('midi:connect', async (deviceId) => {
            await this.connect(deviceId);
        });
        
        eventBus.on('midi:disconnect', async (deviceId) => {
            await this.disconnect(deviceId);
        });
    }

    async initialize() {
        if (!navigator.requestMIDIAccess) {
            console.error("WebMidiController: Web MIDI API not supported in this browser.");
            eventBus.emit('midi:error', { message: "Web MIDI API not supported in this browser" });
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.initialized = true;

            this.midiAccess.onstatechange = (event) => this._handleStateChange(event);
            this._updateDeviceLists();
            
            // Re-attach handlers to make sure they're set
            this.midiAccess.inputs.forEach((input) => {
                input.onmidimessage = (event) => {
                    this._handleMidiMessage(event);
                };
            });
            
            // Emit initialization event
            eventBus.emit('midi:initialized', {
                inputs: this.getInputs(),
                outputs: this.getOutputs()
            });

            return true;
        } catch (error) {
            console.error("WebMidiController: Could not access MIDI devices.", error);
            this.initialized = false;
            
            // Emit error event
            eventBus.emit('midi:error', {
                message: "Could not access MIDI devices",
                error
            });
            
            return false;
        }
    }

    _updateDeviceLists() {
        // Clear existing lists
        this.inputs.clear();
        this.outputs.clear();

        // Populate inputs
        this.midiAccess.inputs.forEach((input) => {
            this.inputs.set(input.id, input);
            
            // Detach any existing handler to prevent duplicates
            if (input.onmidimessage) {
                input.onmidimessage = null;
            }
            
            // Attach handler
            input.onmidimessage = (event) => {
                this._handleMidiMessage(event);
            };
        });

        // Populate outputs
        this.midiAccess.outputs.forEach((output) => {
            this.outputs.set(output.id, output);
        });

        // Emit state change event
        eventBus.emit('midi:stateChanged', this.getInputs(), this.getOutputs());
    }

    _handleStateChange(event) {
        const port = event.port;
        const isConnected = port.state === 'connected';
        const deviceType = port.type === 'input' ? 'Input' : 'Output';

        // Re-evaluate device lists
        this._updateDeviceLists();

        // If an input device was connected/disconnected, update listeners
        if (deviceType === 'Input') {
            if (isConnected) {
                // Ensure the listener is attached to the new input
                port.onmidimessage = (event) => this._handleMidiMessage(event);
            }
        }
        
        // Emit device connection/disconnection event
        eventBus.emit(`midi:device${isConnected ? 'Connected' : 'Disconnected'}`, {
            deviceId: port.id,
            deviceName: port.name,
            deviceType: deviceType.toLowerCase()
        });
    }

    _handleMidiMessage(event) {
        try {
            if (!event || !event.data) {
                console.warn("WebMidiController: Received invalid MIDI message event:", event);
                return;
            }
            
            const deviceId = event.currentTarget?.id || 'unknown';
            const deviceName = event.currentTarget?.name || 'Unknown Device';
            const data = event.data;
            
            if (!data.length) {
                console.warn("WebMidiController: Received empty MIDI message data");
                return;
            }
            
            const [command, data1, data2] = data;

            // Basic interpretation (can be expanded)
            const message = {
                deviceId: deviceId,
                deviceName: deviceName,
                timestamp: event.timeStamp,
                command: command, // e.g., 144 for Note On (channel 1), 128 Note Off, 176 CC
                channel: (command & 0x0F) + 1, // MIDI channel 1-16
                control: data1, // Note number or CC number
                value: data2 || 0, // Velocity or CC value (default to 0 if undefined)
                rawData: Array.from(data) // Convert to regular array for better JSON serialization
            };

            // Emit MIDI message event
            eventBus.emit('midi:message', message);
        } catch (error) {
            console.error("WebMidiController: Error handling MIDI message:", error, event);
        }
    }

    /**
     * Connect to a MIDI device
     * @param {string} deviceId - The device ID to connect to
     * @returns {Promise<string>} - The connected device ID
     */
    async connect(deviceId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            
            const input = this.inputs.get(deviceId);
            if (!input) {
                throw new Error(`MIDI input device with ID ${deviceId} not found`);
            }
            
            // We don't need to do anything special to "connect" since the Web MIDI API
            // handles the connection for us. We just make sure the listener is attached.
            input.onmidimessage = (event) => this._handleMidiMessage(event);
            
            // Emit connected event
            eventBus.emit('midi:deviceConnected', {
                deviceId,
                deviceName: input.name,
                deviceType: 'input'
            });
            
            return deviceId;
        } catch (error) {
            console.error(`WebMidiController: Error connecting to MIDI device ${deviceId}:`, error);
            
            // Emit error event
            eventBus.emit('midi:error', {
                message: `Error connecting to MIDI device ${deviceId}`,
                error
            });
            
            throw error;
        }
    }
    
    /**
     * Disconnect from a MIDI device
     * @param {string} deviceId - The device ID to disconnect from
     * @returns {Promise<boolean>} - Whether disconnection was successful
     */
    async disconnect(deviceId) {
        try {
            const input = this.inputs.get(deviceId);
            if (!input) {
                throw new Error(`MIDI input device with ID ${deviceId} not found or already disconnected`);
            }
            
            // The Web MIDI API doesn't have a explicit "disconnect" method for devices
            // We can just detach our message handler
            input.onmidimessage = null;
            
            // Emit disconnected event
            eventBus.emit('midi:deviceDisconnected', {
                deviceId,
                deviceName: input.name,
                deviceType: 'input'
            });
            
            return true;
        } catch (error) {
            console.error(`WebMidiController: Error disconnecting from MIDI device ${deviceId}:`, error);
            
            // Emit error event
            eventBus.emit('midi:error', {
                message: `Error disconnecting from MIDI device ${deviceId}`,
                error
            });
            
            throw error;
        }
    }

    // Public methods for backward compatibility
    getInputs() {
        return Array.from(this.inputs.values()).map(input => ({
            id: input.id,
            name: input.name,
            manufacturer: input.manufacturer,
            state: input.state,
            type: input.type
        }));
    }

    getOutputs() {
        return Array.from(this.outputs.values()).map(output => ({
            id: output.id,
            name: output.name,
            manufacturer: output.manufacturer,
            state: output.state,
            type: output.type
        }));
    }

    sendMessage(outputId, data) {
        const output = this.outputs.get(outputId);
        if (output) {
            output.send(data); // data should be Uint8Array or array of bytes
            
            // Emit message sent event
            eventBus.emit('midi:messageSent', {
                deviceId: outputId,
                data
            });
        } else {
            console.error(`WebMidiController: Output device with ID ${outputId} not found.`);
            
            // Emit error event
            eventBus.emit('midi:error', {
                message: `Output device with ID ${outputId} not found`
            });
        }
    }

    /**
     * Legacy method to maintain backwards compatibility
     */
    onMessage(callback) {
        // Subscribe the callback to the midi:message event
        return eventBus.on('midi:message', callback);
    }

    /**
     * Legacy method to maintain backwards compatibility
     */
    onStateChange(callback) {
        // Subscribe the callback to the midi:stateChanged event
        const unsubscribe = eventBus.on('midi:stateChanged', callback);
        
        // Immediately provide current state if already initialized
        if (this.initialized) {
            callback(this.getInputs(), this.getOutputs());
        }
        
        return unsubscribe;
    }

    /**
     * Get all available MIDI devices (inputs only)
     * @returns {Array} Array of available MIDI input devices
     */
    getAvailableDevices() {
        return this.getInputs().map(input => ({
            id: input.id,
            name: input.name || 'Unknown MIDI Device',
            type: 'midi',
            state: input.state || 'unknown'
        }));
    }
}
