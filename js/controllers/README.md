# Adding New Controllers to ComfyUI_ControlFreak

This guide explains how to implement a new controller type for ComfyUI_ControlFreak. Controllers allow physical input devices to interact with ComfyUI nodes and commands.

## Controller Implementation Pattern

Each controller follows a consistent pattern that includes initialization, connection management, input handling, and event emission through the event bus.

## Implementation Steps

### 1. Create a New Controller File

Create a new JavaScript file in this directory with a descriptive name, such as `touchscreen.js` or `voice.js`.

```javascript
/**
 * Your Controller Implementation Description
 */

import { eventBus } from "../core/eventBus.js";

export class YourControllerClass {
    constructor() {
        this.initialized = false;
        this.connectedDevices = new Map();
        // Additional controller-specific properties
        
        // Set up event bus subscriptions
        this._setupEventListeners();
    }
    
    // ... rest of implementation
}
```

### 2. Implement Required Methods

Your controller class should implement these key methods:

- **_setupEventListeners()**: Subscribe to events for connect/disconnect requests
- **initialize()**: Set up the controller API, request permissions if needed
- **connect(deviceId)**: Connect to a specific device 
- **disconnect(deviceId)**: Disconnect from a specific device
- **getDevices()**: Return a list of available devices
- **onMessage() / onUpdate()**: Register callbacks for input events
- **onStateChange()**: Register callbacks for device connection changes

### 3. Event Handling

Controllers must emit standard events through the event bus:

- **controller:input**: When an input is detected (used by mapping engine)
- **[controller-type]:message** / **[controller-type]:update**: Device-specific events
- **[controller-type]:deviceConnected** / **[controller-type]:deviceDisconnected**: When devices connect/disconnect
- **[controller-type]:stateChanged**: When the overall controller state changes
- **[controller-type]:error**: When errors occur

### 4. Example Input Format

For consistency, controller input events should follow this format:

```javascript
const controlInput = {
    type: 'your_controller_type', // Type identifier
    deviceId: deviceId,           // Unique device identifier
    controlId: controlId,         // Specific input identifier within device
    rawValue: value,              // Raw input value (typically 0-1 or 0-127)
    name: `Your Controller Name`, // Human-readable name
    // Additional controller-specific properties
};

// Emit to event bus
eventBus.emit('controller:input', controlInput);
```

### 5. Register Your Controller

Finally, register your controller in `js/index.js`:

```javascript
// 1. Import your controller class
import { YourControllerClass } from './controllers/your_controller.js';

// 2. Create instance in initializeControlFreak()
const yourController = new YourControllerClass();

// 3. Register with context provider
contextProvider.register('yourController', yourController);

// 4. Initialize your controller
await yourController.initialize();

// 5. Set up event listeners in setupControllerEventListeners()
yourController.onUpdate(update => {
    const controlInput = {
        // Format the update as controlInput
    };
    eventBus.emit('controller:input', controlInput);
});
```

## Complete Controller Template

Here's a starter template for a new controller implementation:

```javascript
/**
 * [Your Controller] Implementation
 */

import { eventBus } from "../core/eventBus.js";

export class YourControllerClass {
    constructor() {
        this.initialized = false;
        this.connectedDevices = new Map(); // Track connected devices
        this.messageCallbacks = [];
        this.stateChangeCallbacks = [];
    }
    
    _setupEventListeners() {
        // Listen for requests to connect/disconnect devices
        eventBus.on('yourcontroller:connect', async (deviceId) => {
            await this.connect(deviceId);
        });
        
        eventBus.on('yourcontroller:disconnect', async (deviceId) => {
            await this.disconnect(deviceId);
        });
    }

    async initialize() {
        try {
            // Check if API is available
            if (!window.YourControllerAPI) {
                console.error("YourController: API not supported in this browser.");
                eventBus.emit('yourcontroller:error', { 
                    message: "API not supported in this browser" 
                });
                return false;
            }

            // Initialize API and set up event listeners
            // ...

            this.initialized = true;
            
            // Emit initialization event
            eventBus.emit('yourcontroller:initialized', {
                devices: this.getDevices()
            });
            
            return true;
        } catch (error) {
            console.error("YourController: Error initializing:", error);
            this.initialized = false;
            
            // Emit error event
            eventBus.emit('yourcontroller:error', {
                message: "Error initializing controller",
                error
            });
            
            return false;
        }
    }

    /**
     * Connect to a device
     * @param {string} deviceId - The device ID to connect to
     * @returns {Promise<string>} - The connected device ID
     */
    async connect(deviceId) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            
            // Connect to device
            // ...
            
            // Track the connected device
            this.connectedDevices.set(deviceId, deviceName);
            
            // Emit connected event
            eventBus.emit('yourcontroller:deviceConnected', {
                deviceId,
                deviceName,
                deviceType: 'yourcontroller'
            });
            
            return deviceId;
        } catch (error) {
            console.error(`YourController: Error connecting to device ${deviceId}:`, error);
            eventBus.emit('yourcontroller:error', {
                message: `Error connecting to device ${deviceId}`,
                error
            });
            throw error;
        }
    }
    
    /**
     * Disconnect from a device
     * @param {string} deviceId - The device ID to disconnect from
     * @returns {Promise<boolean>} - Whether disconnection was successful
     */
    async disconnect(deviceId) {
        try {
            // Disconnect from device
            // ...
            
            // Remove from connected devices
            const deviceName = this.connectedDevices.get(deviceId);
            this.connectedDevices.delete(deviceId);
            
            // Emit disconnected event
            eventBus.emit('yourcontroller:deviceDisconnected', {
                deviceId,
                deviceName,
                deviceType: 'yourcontroller'
            });
            
            return true;
        } catch (error) {
            console.error(`YourController: Error disconnecting from device ${deviceId}:`, error);
            eventBus.emit('yourcontroller:error', {
                message: `Error disconnecting from device ${deviceId}`,
                error
            });
            throw error;
        }
    }
    
    /**
     * Get list of available devices
     * @returns {Array} - Array of device objects
     */
    getDevices() {
        // Return array of available devices
        return Array.from(this.connectedDevices.entries()).map(([id, name]) => ({
            id,
            name,
            type: 'yourcontroller',
            connected: true
        }));
    }
    
    /**
     * Register callback for input messages
     * @param {Function} callback - Function to be called with message data
     */
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }
    
    /**
     * Register callback for state changes
     * @param {Function} callback - Function to be called with new device list
     */
    onStateChange(callback) {
        this.stateChangeCallbacks.push(callback);
    }
    
    /**
     * Trigger message callbacks
     * @param {Object} message - Message data to pass to callbacks
     */
    _triggerMessageCallbacks(message) {
        for (const callback of this.messageCallbacks) {
            try {
                callback(message);
            } catch (error) {
                console.error("YourController: Error in message callback:", error);
            }
        }
    }
    
    /**
     * Trigger state change callbacks
     * @param {Array} devices - Updated device list to pass to callbacks
     */
    _triggerStateChangeCallbacks(devices) {
        for (const callback of this.stateChangeCallbacks) {
            try {
                callback(devices);
            } catch (error) {
                console.error("YourController: Error in state change callback:", error);
            }
        }
    }
}
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try/catch blocks and emit errors through the event bus
2. **Logging**: Use descriptive console logs for debugging with consistent format
3. **Standard Events**: Follow the established event naming conventions
4. **Value Normalization**: Convert input values to a 0-1 range when possible
5. **Resource Management**: Clean up event listeners and resources in disconnect/cleanup methods

## Existing Controller Examples

For reference, examine these existing controllers:
- `midi.js`: WebMIDI API integration for MIDI controllers
- `gamepad.js`: Gamepad API integration for game controllers 