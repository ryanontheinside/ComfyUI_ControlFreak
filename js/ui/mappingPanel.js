// UI components for the mapping panel

import { loadControllerData } from './controllerList.js';
import { loadMappingData } from './mappingList.js';
import { loadCommandsData } from './commandsList.js';
import { showNotification } from './notifications.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';
import { app } from "../../../../scripts/app.js";

/**
 * Toggle the management UI
 * @param {boolean} [show] - Force show or hide
 * @param {Object} [mappingEngine] - Optional mappingEngine instance
 * @returns {HTMLElement|null} - The panel element if shown, null if hidden
 */
export function toggleMappingUI(show, mappingEngine) {
    const existingPanel = document.getElementById('controller-mapping-panel');
    
    // Determine if we should show or hide
    const shouldShow = show !== undefined ? show : !existingPanel;
    
    if (existingPanel && !shouldShow) {
        existingPanel.remove();
        eventBus.emit('ui:mappingPanelClosed');
        return null;
    } else if (shouldShow && !existingPanel) {
        const panel = createMappingPanel(mappingEngine);
        eventBus.emit('ui:mappingPanelOpened');
        return panel;
    } else if (existingPanel) {
        return existingPanel; // Already showing
    }
    
    return null;
}

/**
 * Create the mapping management panel
 * @param {Object} [mappingEngine] - Optional mappingEngine instance
 * @returns {HTMLElement} - The created panel
 */
export function createMappingPanel(mappingEngine) {
    // Get mappingEngine from parameter or context
    const engine = mappingEngine || contextProvider.get('mappingEngine');
    
    // Remove mappings for deleted nodes
    removeDeletedNodeMappings(engine);
    
    // Create the main panel
    const panel = document.createElement('div');
    panel.id = 'controller-mapping-panel';
    document.body.appendChild(panel);
    
    // Create the header
    const header = document.createElement('div');
    header.id = 'controller-mapping-header';
    panel.appendChild(header);
    
    // Create logo and title
    const title = document.createElement('h2');
    title.innerHTML = `
        <div class="cf-logo">
            <span class="cf-logo-icon">🎮</span>
            <span class="cf-logo-text">Control<span class="cf-logo-highlight">Freak</span></span>
        </div>
        <span class="cf-tagline">Take control of your workflows</span>
    `;
    header.appendChild(title);
    
    const closeButton = document.createElement('button');
    closeButton.id = 'controller-mapping-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        panel.remove();
        eventBus.emit('ui:mappingPanelClosed');
    });
    header.appendChild(closeButton);
    
    // Create tabs
    const tabs = document.createElement('div');
    tabs.id = 'controller-mapping-tabs';
    panel.appendChild(tabs);
    
    const controllersTab = document.createElement('div');
    controllersTab.className = 'controller-mapping-tab active';
    controllersTab.dataset.tab = 'controllers';
    controllersTab.textContent = 'Controllers';
    tabs.appendChild(controllersTab);
    
    const mappingsTab = document.createElement('div');
    mappingsTab.className = 'controller-mapping-tab';
    mappingsTab.dataset.tab = 'mappings';
    mappingsTab.textContent = 'Mappings';
    tabs.appendChild(mappingsTab);
    
    // Add a new tab for UI commands
    const commandsTab = document.createElement('div');
    commandsTab.className = 'controller-mapping-tab';
    commandsTab.dataset.tab = 'commands';
    commandsTab.textContent = 'UI Commands';
    tabs.appendChild(commandsTab);
    
    // Add a new tab for "About" section
    const aboutTab = document.createElement('div');
    aboutTab.className = 'controller-mapping-tab';
    aboutTab.dataset.tab = 'about';
    aboutTab.textContent = 'Propaganda';
    aboutTab.style.marginLeft = 'auto'; // Push to the right
    tabs.appendChild(aboutTab);
    
    // Create content area
    const content = document.createElement('div');
    content.id = 'controller-mapping-content';
    panel.appendChild(content);
    
    // Create controllers panel
    const controllersPanel = document.createElement('div');
    controllersPanel.className = 'tab-panel active';
    controllersPanel.id = 'controllers-panel';
    content.appendChild(controllersPanel);
    
    // Create mappings panel
    const mappingsPanel = document.createElement('div');
    mappingsPanel.className = 'tab-panel';
    mappingsPanel.id = 'mappings-panel';
    content.appendChild(mappingsPanel);
    
    // Create commands panel
    const commandsPanel = document.createElement('div');
    commandsPanel.className = 'tab-panel';
    commandsPanel.id = 'commands-panel';
    content.appendChild(commandsPanel);
    
    // Create about panel
    const aboutPanel = document.createElement('div');
    aboutPanel.className = 'tab-panel';
    aboutPanel.id = 'about-panel';
    
    // Add about content with proper branding
    aboutPanel.innerHTML = `
        <div class="about-header">
            <a href="https://github.com/ryanontheinside/ComfyUI_ControlFreak" class="cf-logo" style="text-decoration: underline;" target="_blank">
                <span class="cf-logo-icon" style="text-decoration: none;">🎮</span>
                <span class="cf-logo-text">Control<span class="cf-logo-highlight">Freak</span></span>
            </a>
            <div class="cf-tagline">Take control of your ComfyUI workflows</div>
            <p>Universal MIDI & Gamepad Mapping for ComfyUI</p>
        </div>
        <div class="about-content" style="text-align: center; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Control Freak lets you map MIDI controllers and gamepads to ComfyUI widgets and actions,
            giving you physical control over your image generation workflows.</p>
        </div>
           <div style="text-align: right; margin-top: 200px;">
            <a href="https://github.com/ryanontheinside" style="font-size: 15px; text-decoration: none;" class="cf-logo-highlight" target="_blank">RYANONTHEINSIDE</a>
        </div>
    `;
    
    content.appendChild(aboutPanel);
    
    // Add tab switching functionality
    tabs.querySelectorAll('.controller-mapping-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.querySelectorAll('.controller-mapping-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            content.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
            
            // Emit tab change event
            eventBus.emit('ui:mappingPanelTabChanged', { tab: tab.dataset.tab });
        });
    });
    
    // Load data
    loadControllerData(controllersPanel);
    loadMappingData(mappingsPanel, engine);
    loadCommandsData(commandsPanel, engine);
    
    // Add event listeners to refresh mappings panel when mappings change
    const refreshMappings = () => {
        if (document.getElementById('mappings-panel')) {
            loadMappingData(mappingsPanel, engine);
        }
    };
    
    // Listen for mapping events that should trigger a refresh
    eventBus.on('mapping:added', refreshMappings);
    eventBus.on('mapping:deleted', refreshMappings);
    eventBus.on('mapping:updated', refreshMappings);
    
    // Cleanup event listeners when panel is closed
    eventBus.on('ui:mappingPanelClosed', () => {
        eventBus.off('mapping:added', refreshMappings);
        eventBus.off('mapping:deleted', refreshMappings);
        eventBus.off('mapping:updated', refreshMappings);
    });
    
    return panel;
}

/**
 * Remove mappings for deleted nodes
 * @param {Object} mappingEngine - The mapping engine instance
 * @returns {number} - Number of removed mappings
 */
function removeDeletedNodeMappings(mappingEngine) {
    // Get the mapping engine from parameter or context
    const engine = mappingEngine || contextProvider.get('mappingEngine');
    if (!engine || !app?.graph?.nodes) return 0;
    
    // Get mappings for current profile
    const mappings = engine.getMappings();
    let removed = 0;
    
    // Check each widget mapping to see if the node still exists
    mappings.forEach(mapping => {
        if (mapping.target.type === 'widget') {
            const nodeId = mapping.target.nodeId;
            const node = app.graph.getNodeById(nodeId);
            
            // If node doesn't exist, remove the mapping
            if (!node) {
                engine.deleteMapping(mapping.id);
                removed++;
            }
        }
    });
    
    // Save if any mappings were removed
    if (removed > 0) {
        engine.saveMappings();
        
        // Emit event for removed mappings
        eventBus.emit('mappings:cleanedUp', { removed });
    }
    
    return removed;
} 