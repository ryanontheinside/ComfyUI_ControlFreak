/**
 * ContextProvider - A centralized registry for core instances
 * Replaces global variables with a singleton registry pattern
 */

class ControlFreakContext {
    constructor() {
        this._instances = new Map();
    }
    
    /**
     * Register an instance with the context
     * @param {string} key - The key to store the instance under
     * @param {any} instance - The instance to store
     * @returns {any} - The registered instance
     */
    register(key, instance) {
        this._instances.set(key, instance);
        return instance;
    }
    
    /**
     * Get an instance from the context
     * @param {string} key - The key of the instance to retrieve
     * @returns {any} - The instance or undefined if not found
     */
    get(key) {
        return this._instances.get(key);
    }
    
    /**
     * Check if an instance exists in the context
     * @param {string} key - The key to check
     * @returns {boolean} - Whether the instance exists
     */
    has(key) {
        return this._instances.has(key);
    }
    
    /**
     * Remove an instance from the context
     * @param {string} key - The key of the instance to remove
     * @returns {boolean} - Whether the instance was removed
     */
    remove(key) {
        return this._instances.delete(key);
    }
    
    /**
     * Get all registered keys
     * @returns {Array<string>} - Array of registered keys
     */
    getKeys() {
        return Array.from(this._instances.keys());
    }
    
    // Static singleton instance
    static getInstance() {
        if (!ControlFreakContext._instance) {
            ControlFreakContext._instance = new ControlFreakContext();
        }
        return ControlFreakContext._instance;
    }
}

// Create and export the singleton instance
export const contextProvider = ControlFreakContext.getInstance(); 