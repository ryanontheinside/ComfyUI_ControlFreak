function loadCssWithComfyApi(relativePath) {
    try {
        if (window.comfyAPI?.utils?.addStylesheet) {
            const cssUrlPath = `/extensions/ComfyUI_ControlFreak/ui/styles/${relativePath}`;
            window.comfyAPI.utils.addStylesheet(cssUrlPath);
            // console.log(`ControlFreak: Requested loading CSS ${cssUrlPath} via ComfyAPI`);
        } else {
            console.warn(`ControlFreak: comfyAPI.utils.addStylesheet not found. Cannot load ${relativePath} dynamically.`);
        }
    } catch (error) {
        console.error(`ControlFreak: Error calling addStylesheet for ${relativePath}:`, error);
    }
}

// Load all CSS files
loadCssWithComfyApi('contextMenu.css');
loadCssWithComfyApi('notification.css');
loadCssWithComfyApi('panel.css');
loadCssWithComfyApi('dialog.css');
loadCssWithComfyApi('mappingComponent.css');
loadCssWithComfyApi('controllerButton.css');
loadCssWithComfyApi('theme.css');
loadCssWithComfyApi('branding.css');
loadCssWithComfyApi('nodeStyles.css');