// Index file for all Control Freak UI styles
import { defineThemeVariables } from './theme.js';
import { addPanelStyles } from './panel.js';
import { addDialogStyles } from './dialog.js';
import { addNotificationStyles } from './notification.js';
import { addMappingComponentStyles } from './mappingComponent.js';
import { addContextMenuStyles } from './contextMenu.js';
import { addControllerButtonStyles } from './controllerButton.js';
import { applyBrandingStyles } from './branding.js';
import { applyNodeStyles, styleNode } from './nodeStyles.js';

// Export all style functions
export {
    defineThemeVariables,
    addPanelStyles,
    addDialogStyles,
    addNotificationStyles,
    addMappingComponentStyles,
    addContextMenuStyles,
    addControllerButtonStyles,
    applyBrandingStyles,
    applyNodeStyles,
    styleNode
};

/**
 * Adds all styles at once
 */
export function addStyles() {
    // Theme variables should be applied first
    defineThemeVariables();
    
    // Then apply styling
    addPanelStyles();
    addDialogStyles();
    addNotificationStyles();
    addMappingComponentStyles();
    addContextMenuStyles();
    addControllerButtonStyles();
    
    // Apply special styling
    applyBrandingStyles();
    applyNodeStyles();
} 