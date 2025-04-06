/**
 * LearningStateManager - Manages state related to controller mapping learning
 * Replaces global variables for learning state
 */

export class LearningStateManager {
    constructor(eventBus) {
        this._eventBus = eventBus;
        this._isLearning = false;
        this._learningTarget = null;
        this._selectedControl = null;
        this._learningDialog = null;
        this._isQuickLearning = false;
        this._learningType = null;
        this._quickLearningContext = null;
        this._lastDetectedInput = null;
        
        // Set up event listeners
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        // Listen for controller:input events
        this._eventBus.on('controller:input', (controlInput) => {
            // If learning mode is active, handle the input
            if (this._isLearning || this._isQuickLearning) {
                // Directly forward to handleControllerInput
                this.handleControllerInput(controlInput);
            }
        });
    }
    
    /**
     * Get whether learning mode is active
     * @returns {boolean} - Whether learning mode is active
     */
    get isLearning() { 
        return this._isLearning; 
    }
    
    /**
     * Get the current learning target
     * @returns {Object|null} - The target information or null
     */
    get learningTarget() { 
        return this._learningTarget; 
    }
    
    /**
     * Get the currently selected control
     * @returns {Object|null} - The control information or null
     */
    get selectedControl() { 
        return this._selectedControl; 
    }
    
    /**
     * Get the current learning dialog element
     * @returns {HTMLElement|null} - The dialog element or null
     */
    get learningDialog() { 
        return this._learningDialog; 
    }
    
    /**
     * Get whether quick learning mode is active
     * @returns {boolean} - Whether quick learning mode is active
     */
    get isQuickLearning() {
        return this._isQuickLearning;
    }
    
    /**
     * Get the current learning type
     * @returns {string|null} - The learning type or null
     */
    get learningType() {
        return this._learningType;
    }
    
    /**
     * Get the current quick learning context
     * @returns {Object|null} - The quick learning context or null
     */
    get quickLearningContext() {
        return this._quickLearningContext;
    }
    
    /**
     * Get the last detected input
     * @returns {Object|null} - The last detected input or null
     */
    get lastDetectedInput() {
        return this._lastDetectedInput;
    }
    
    /**
     * Start the learning process for a target
     * @param {string} type - The learning type
     * @param {Object} target - The target information
     */
    startLearning(type, target) {
        if (this._isLearning || this._isQuickLearning) this.cancelLearning(); // Cancel any existing learning
        this._isLearning = true;
        this._isQuickLearning = false; // Ensure quick learning is off
        this._learningType = type;
        this._learningTarget = target;
        this._lastDetectedInput = null;
        this._eventBus.emit('learning:started', { type, target });
    }
    
    /**
     * Start quick learning for a widget
     * @param {Object} node - The node information
     * @param {Object} widget - The widget information
     * @param {Object} defaultSettings - The default settings for the widget
     */
    startQuickLearning(node, widget, defaultSettings) {
        if (this._isLearning || this._isQuickLearning) this.cancelLearning(); // Cancel any existing learning
        this._isLearning = false; // Ensure standard learning is off
        this._isQuickLearning = true;
        this._learningType = 'widget'; // Quick learning is always for widgets
        this._quickLearningContext = { node, widget, defaultSettings };
        this._lastDetectedInput = null;
        this._eventBus.emit('learning:quickStarted', { node, widget });
    }
    
    /**
     * Select a control for the current learning target
     * @param {Object} control - The control information
     */
    selectControl(control) {
        this._selectedControl = control;
        this._eventBus.emit('learning:controlSelected', control, this._learningTarget);
    }
    
    /**
     * Cancel the learning process
     */
    cancelLearning() {
        const wasLearning = this._isLearning || this._isQuickLearning;
        this._isLearning = false;
        this._isQuickLearning = false;
        this._learningTarget = null;
        this._selectedControl = null;
        this._learningType = null;
        this._quickLearningContext = null;
        this._lastDetectedInput = null;
        
        if (wasLearning) {
            this._eventBus.emit('learning:canceled');
        }
    }
    
    /**
     * Complete the learning process with a mapping
     * @param {Object} mapping - The created mapping (optional, not always available)
     */
    completeLearning(mapping) {
        const wasLearning = this._isLearning || this._isQuickLearning; // Check if any learning was active
        
        this._isLearning = false;      // Reset standard learning flag
        this._isQuickLearning = false; // Reset quick learning flag
        
        const target = this._learningTarget;
        const control = this._selectedControl;
        const quickContext = this._quickLearningContext; // Capture context if needed for event
        
        // Clear all learning-related state properties
        this._learningTarget = null;
        this._selectedControl = null;
        this._learningType = null;
        this._quickLearningContext = null;
        this._lastDetectedInput = null; // Also clear last detected input
        
        // Close dialog if it exists (relevant for standard learning)
        if (this._learningDialog) {
            try {
                if (document.body.contains(this._learningDialog)) {
                    if(this._learningDialog.cleanupEvents) this._learningDialog.cleanupEvents(); // Clean up dialog listeners
                    document.body.removeChild(this._learningDialog);
                }
            } catch (error) {
                 console.warn("ControlFreak: Error removing learning dialog on complete:", error);
            }
            this._learningDialog = null;
        }
        
        // Emit event only if learning was active
        if (wasLearning) {
             // Pass relevant info based on which mode was active
             const eventData = mapping ? { mapping, target, control } : { quickContext }; 
             this._eventBus.emit('learning:completed', eventData);
        }
    }
    
    /**
     * Set the learning dialog element
     * @param {HTMLElement|null} dialog - The dialog element
     */
    setDialog(dialog) {
        this._learningDialog = dialog;
    }
    
    /**
     * Handle controller input during learning
     * @param {Object} controlInput - The controller input information
     * @returns {boolean} - Whether the input was handled
     */
    handleControllerInput(controlInput) {
        if (!this._isLearning && !this._isQuickLearning) return false;
        
        this._eventBus.emit('learning:controlInput', controlInput, this._learningTarget);
        return true;
    }
    
    /**
     * Update the last detected input
     * @param {Object} controlInput - The controller input information
     */
    updateDetectedInput(controlInput) {
        this._lastDetectedInput = controlInput;
        this._eventBus.emit('learning:inputDetected', controlInput);
    }
    
    /**
     * Get learning information
     * @returns {Object|null} - The learning information or null
     */
    getLearningInfo() {
        if (!this._isLearning && !this._isQuickLearning) return null;
        if (this._isQuickLearning) {
            return { type: this._learningType, target: this._quickLearningContext, isQuickLearning: true };
        }
        return { type: this._learningType, target: this._learningTarget, isQuickLearning: false };
    }
    
    /**
     * Get the quick learning context
     * @returns {Object|null} - The quick learning context or null
     */
    getQuickLearningContext() {
        return this._isQuickLearning ? this._quickLearningContext : null;
    }
    
    // Static singleton instance
    static getInstance(eventBus) {
        if (!LearningStateManager._instance) {
            LearningStateManager._instance = new LearningStateManager(eventBus);
        }
        return LearningStateManager._instance;
    }
}

// Don't export a singleton instance here
// It will be created and registered by the main module 