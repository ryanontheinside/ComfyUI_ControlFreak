/**
 * EventBus - A centralized event system for cross-module communication
 * Replaces direct global variable access with pub/sub pattern
 */

export class EventBus {
    constructor() {
        this._handlers = new Map();
        this._lastEvents = new Map(); // Stores last event data for late subscribers
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - The event name to listen for
     * @param {Function} handler - The callback function
     * @param {boolean} receiveLastEvent - Whether to immediately receive the last event
     * @returns {Function} - Unsubscribe function
     */
    on(event, handler, receiveLastEvent = false) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, []);
        }
        this._handlers.get(event).push(handler);
        
        // Call handler with last event data if requested and available
        if (receiveLastEvent && this._lastEvents.has(event)) {
            const lastEventData = this._lastEvents.get(event);
            handler(...lastEventData);
        }
        
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - The event name
     * @param {Function} handler - The callback function to remove
     */
    off(event, handler) {
        if (!this._handlers.has(event)) return;
        const handlers = this._handlers.get(event);
        const index = handlers.indexOf(handler);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }
    
    /**
     * Emit an event to all subscribers
     * @param {string} event - The event name
     * @param {...any} args - Arguments to pass to handlers
     */
    emit(event, ...args) {
        // Store last event data
        this._lastEvents.set(event, args);
        
        // Call current handlers
        if (this._handlers.has(event)) {
            for (const handler of this._handlers.get(event)) {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`EventBus: Error in handler for event ${event}:`, error);
                }
            }
        }
    }
    
    /**
     * Clear all handlers for an event
     * @param {string} event - The event name
     */
    clear(event) {
        if (event) {
            this._handlers.delete(event);
            this._lastEvents.delete(event);
        } else {
            this._handlers.clear();
            this._lastEvents.clear();
        }
    }
    
    /**
     * Get all event names with active handlers
     * @returns {Array<string>} - Array of event names
     */
    getEventNames() {
        return Array.from(this._handlers.keys());
    }
    
    /**
     * Get the number of handlers for an event
     * @param {string} event - The event name
     * @returns {number} - Number of handlers
     */
    getHandlerCount(event) {
        return this._handlers.has(event) ? this._handlers.get(event).length : 0;
    }
    
    // Static singleton instance
    static getInstance() {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }
}

// Create and export the singleton instance
export const eventBus = EventBus.getInstance(); 