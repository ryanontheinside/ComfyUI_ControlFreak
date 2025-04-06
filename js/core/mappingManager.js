// Core API functions for controller mapping

/**
 * Fetches available controller types
 * @returns {Promise<string[]>} List of controller types
 */
export async function fetchControllerTypes() {
    const response = await fetch('/controller/types');
    
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const types = await response.json();
    return types;
}

/**
 * Fetches available devices for each controller type
 * @returns {Promise<Object>} Object mapping controller types to device lists
 */
export async function fetchControllerDevices() {
    const response = await fetch('/controller/devices');
    
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const devices = await response.json();
    return devices;
}

/**
 * Connects a controller device
 * @param {string} type - Controller type
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Response data
 */
export async function connectControllerDevice(type, deviceId) {
    
    const response = await fetch('/controller/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            type: type,
            device_id: deviceId
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error connecting device: ${errorText}`);
        throw new Error(errorText);
    }
    
    const data = await response.json();
    return data;
}

/**
 * Fetches all controller mappings
 * @returns {Promise<Array>} List of mappings
 */
export async function fetchMappings() {
    const response = await fetch('/controller/mappings');
    const mappings = await response.json();
    return mappings;
}

/**
 * Deletes a mapping
 * @param {string} controllerId - Controller ID
 * @param {string} controlId - Control ID
 * @returns {Promise<void>}
 */
export async function deleteMapping(controllerId, controlId) {
    await fetch(`/controller/mapping/${controllerId}:${controlId}`, {
        method: 'DELETE'
    });
}

/**
 * Groups mappings by controller ID
 * @param {Array} mappings - List of mappings
 * @returns {Object} Mappings grouped by controller ID
 */
export function groupMappingsByController(mappings) {
    const groupedMappings = {};
    
    for (const mapping of mappings) {
        if (!groupedMappings[mapping.controller_id]) {
            groupedMappings[mapping.controller_id] = [];
        }
        
        groupedMappings[mapping.controller_id].push(mapping);
    }
    
    return groupedMappings;
} 