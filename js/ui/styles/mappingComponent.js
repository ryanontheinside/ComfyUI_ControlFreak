// Mapping Component styles for Control Freak UI

/**
 * Add styles for the mapping component
 */
export function addMappingComponentStyles() {
    const styleId = 'controlfreak-mapping-component-styles';
    if (document.getElementById(styleId)) return; // Already added
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Mapping List Container */
        .mapping-list-container,
        .controller-mapping-list {
            font-family: Arial, sans-serif;
            color: var(--cf-text-primary);
            max-width: 100%;
        }
        
        .mapping-list-header {
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        /* Mapping List */
        .mapping-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 300px;
            overflow-y: auto;
            padding-right: 5px;
        }
        
        /* Inside dialog */
        .controller-mapping-existing-content .mapping-list {
            max-height: none;
        }
        
        /* Mapping Item - Original style */
        .mapping-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background-color: var(--cf-bg-secondary);
            border-radius: 3px;
            border: 1px solid var(--cf-border-color);
        }
        
        /* New Mapping Component Style */
        .controller-mapping-component {
            display: flex;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background-color: var(--cf-bg-tertiary);
            border-radius: 4px;
            position: relative;
        }
        
        .mapping-control-source {
            flex: 1;
            margin-right: 10px;
        }
        
        .mapping-icon {
            margin-right: 5px;
        }
        
        .mapping-name {
            font-weight: bold;
        }
        
        .mapping-arrow {
            margin: 0 10px;
            font-size: 16px;
            color: var(--cf-text-muted);
        }
        
        .mapping-target {
            flex: 1;
        }
        
        .mapping-type-badge {
            padding: 2px 6px;
            background-color: var(--cf-bg-hover);
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .mapping-actions {
            display: flex;
            margin-left: 15px;
            gap: 5px;
        }
        
        .mapping-edit {
            background-color: var(--cf-accent-blue-dark);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 3px 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .mapping-delete {
            background-color: var(--cf-accent-red);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 3px 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .mapping-empty-message {
            color: var(--cf-text-muted);
            font-style: italic;
            text-align: center;
            padding: 10px;
        }
        
        /* Inside dialog, make items more compact */
        .controller-mapping-existing-content .mapping-item,
        .controller-mapping-existing-content .controller-mapping-component {
            padding: 5px;
            font-size: 12px;
        }
        
        /* Mapping Info */
        .mapping-info {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        /* Inside dialog, make info more compact */
        .controller-mapping-existing-content .mapping-info {
            gap: 2px;
        }
        
        /* Buttons */
        .mapping-edit-btn,
        .mapping-delete-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background-color: var(--cf-accent-blue-dark);
            color: white;
        }
        
        /* Inside dialog, make buttons smaller */
        .controller-mapping-existing-content .mapping-edit-btn,
        .controller-mapping-existing-content .mapping-delete-btn,
        .controller-mapping-existing-content .mapping-edit,
        .controller-mapping-existing-content .mapping-delete {
            padding: 2px 6px;
            font-size: 11px;
        }
        
        .mapping-delete-btn {
            background-color: var(--cf-accent-red-dark);
        }
        
        .mapping-edit-btn:hover,
        .mapping-edit:hover {
            background-color: var(--cf-accent-blue);
        }
        
        .mapping-delete-btn:hover,
        .mapping-delete:hover {
            background-color: var(--cf-accent-red);
        }
        
        /* Error State */
        .mapping-error {
            color: var(--cf-status-error);
            padding: 8px;
            background-color: rgba(255, 107, 107, 0.1);
            border-radius: 3px;
            margin-bottom: 8px;
        }
        
        /* Empty State */
        .no-mappings-message {
            color: var(--cf-text-muted);
            font-style: italic;
            text-align: center;
            padding: 10px;
        }
        
        /* Mapping Editor Dialog */
        .mapping-editor-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--cf-bg-overlay);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        .mapping-editor {
            background-color: var(--cf-bg-primary);
            border-radius: 4px;
            border: 1px solid var(--cf-border-color);
            padding: 20px;
            min-width: 400px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .mapping-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .mapping-editor-header h3 {
            margin: 0;
        }
        
        .mapping-editor-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--cf-text-muted);
        }
        
        .mapping-editor-content {
            margin-bottom: 15px;
        }
        
        .mapping-editor-field {
            margin-bottom: 15px;
        }
        
        .mapping-editor-field label {
            display: block;
            margin-bottom: 5px;
        }
        
        .mapping-editor-field select,
        .mapping-editor-field input {
            width: 100%;
            padding: 8px;
            border-radius: 3px;
            border: 1px solid var(--cf-border-color);
            background-color: var(--cf-bg-tertiary);
            color: var(--cf-text-primary);
        }
        
        .mapping-editor-info {
            margin-bottom: 10px;
        }
        
        .mapping-editor-footer {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .mapping-save-btn {
            padding: 8px 16px;
            background-color: var(--cf-accent-blue);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .mapping-editor-cancel-btn,
        .mapping-editor-save-btn {
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            border: none;
        }
        
        .mapping-editor-cancel-btn {
            background-color: var(--cf-bg-secondary);
            color: white;
        }
        
        .mapping-editor-save-btn {
            background-color: var(--cf-accent-blue-dark);
            color: white;
        }
    `;
    
    document.head.appendChild(style);
} 