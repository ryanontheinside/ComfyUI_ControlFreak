/**
 * Handles highlighting mapped widgets on the graph canvas.
 */

import { app } from '../../../scripts/app.js';
import { contextProvider } from '../core/contextProvider.js';
import { eventBus } from '../core/eventBus.js';

// Attempt to get LiteGraph from the global scope or app instance
const LiteGraph = window.LiteGraph || (app ? app.LiteGraph : null);

let original_drawNodeWidgets = null;
let isHighlightingActive = false;

/**
 * Applies the global patch to LGraphCanvas.drawNodeWidgets to enable highlighting.
 */
function applyWidgetHighlightPatch() {
    if (!LiteGraph || !LiteGraph.LGraphCanvas || !LiteGraph.LGraphCanvas.prototype?.drawNodeWidgets) {
        console.error("ControlFreak: Cannot apply widget highlight patch. LGraphCanvas.drawNodeWidgets not found.");
        return;
    }

    if (original_drawNodeWidgets) {
        console.warn("ControlFreak: Widget highlight patch already applied.");
        return; // Already patched
    }

    original_drawNodeWidgets = LiteGraph.LGraphCanvas.prototype.drawNodeWidgets;

    LiteGraph.LGraphCanvas.prototype.drawNodeWidgets = function(node) {
        // --- Draw Highlights FIRST (Behind Widgets) ---
        if (node.widgets && node.widgets.length > 0 && isHighlightingActive) {
            const mappingEngine = contextProvider.get('mappingEngine');
            if (mappingEngine) { // Check if mapping engine is available
                const ctx = this.ctx; // Get canvas context from LGraphCanvas instance
                try {
                    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--cf-brand-primary').trim() || '#ff5722';
                    const colorParts = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(brandColor);
                    // Slightly more transparent for a background glow
                    const widgetHighlightColor = colorParts
                        ? `rgba(${parseInt(colorParts[1], 16)}, ${parseInt(colorParts[2], 16)}, ${parseInt(colorParts[3], 16)}, 0.25)` 
                        : "rgba(255, 87, 34, 0.25)";

                    node.widgets.forEach(widget => {
                        if (mappingEngine.isWidgetMapped(node.id, widget.name)) {
                            if (typeof widget.last_y === 'number') {
                                const widgetHeight = (widget.size && widget.size[1] > 0) ? widget.size[1] : (LiteGraph.NODE_WIDGET_HEIGHT || 20);
                                const nodeWidth = node.size[0];
                                const padding = 15;
                                const widgetY = widget.last_y;
                                const widgetX = padding / 2;
                                const widgetWidth = nodeWidth - padding;

                                if (widgetWidth > 0 && widgetHeight > 0) {
                                    // Save context state 
                                    ctx.save();
                                    ctx.fillStyle = widgetHighlightColor;
                                    ctx.beginPath();
                                    // Draw slightly larger rect behind the widget area
                                    const margin = 3; // How much larger the highlight is
                                    ctx.roundRect(widgetX - margin, widgetY - margin, widgetWidth + (margin * 2), widgetHeight + (margin * 2), 5); // Increased radius slightly
                                    ctx.fill();
                                    ctx.restore();
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error(`ControlFreak: Error drawing highlights for node ${node.id}:`, e);
                }
            }
        }

        // --- Call the original function AFTER drawing highlights ---
        let result;
        try {
           result = original_drawNodeWidgets.apply(this, arguments);
        } catch (e) {
            console.error(`ControlFreak: Error in original drawNodeWidgets for node ${node.id}:`, e);
        }

        return result;
    };
}

/**
 * Removes the global patch from LGraphCanvas.drawNodeWidgets.
 */
function removeWidgetHighlightPatch() {
    if (original_drawNodeWidgets && LiteGraph && LiteGraph.LGraphCanvas && LiteGraph.LGraphCanvas.prototype) {
        LiteGraph.LGraphCanvas.prototype.drawNodeWidgets = original_drawNodeWidgets;
        original_drawNodeWidgets = null;
        // Request redraw to remove highlights
        if(app.graph) app.graph.setDirtyCanvas(true, true);
    }
}

/**
 * Initializes the widget highlighter system.
 * Applies the patch and sets up event listeners to trigger redraws.
 */
export function initWidgetHighlighter() {
    if (!LiteGraph) {
         console.error("ControlFreak: LiteGraph not available, cannot initialize widget highlighter.");
         return;
    }
    applyWidgetHighlightPatch();
    isHighlightingActive = true; // Activate highlighting

    // Listen for events that change mappings and trigger redraw
    const redrawCanvas = () => {
        // Check if graph exists and has changed before forcing redraw
        if(app.graph) { // && app.graph.status !== LGraph.STATUS_STOPPED - add if needed
            app.graph.setDirtyCanvas(true, false); // Redraw only, don't recompute paths
        }
    };

    // Debounce redraw calls slightly to prevent excessive redraws during rapid changes
    let redrawTimeout = null;
    const debouncedRedraw = () => {
        if (redrawTimeout) clearTimeout(redrawTimeout);
        redrawTimeout = setTimeout(redrawCanvas, 50); // 50ms debounce
    };

    eventBus.on('mapping:created', debouncedRedraw);
    eventBus.on('mapping:deleted', debouncedRedraw);
    eventBus.on('mappings:loaded', debouncedRedraw);
    eventBus.on('mappings:profileChanged', debouncedRedraw);
    // Also redraw if a mapping is updated (e.g., settings changed)
    eventBus.on('mapping:updated', debouncedRedraw); 


}

/**
 * Cleans up the widget highlighter system.
 * Removes the patch and potentially event listeners if needed.
 */
export function cleanupWidgetHighlighter() {
     removeWidgetHighlightPatch();
     isHighlightingActive = false;
}
