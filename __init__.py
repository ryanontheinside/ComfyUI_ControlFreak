"""
CONTROL FREAK - Map MIDI controllers, gamepads, and other devices to ComfyUI parameters

""" 

class ControlFreakMarker:
    """
    This node is added to workflows with ControlFreak mappings
    to ensure ComfyUI-Manager detects the dependency.
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {}
        }
    
    RETURN_TYPES = tuple()
    FUNCTION = "marker"
    CATEGORY = "controllers"
    HIDDEN = True

    def marker(self):
        return ()

NODE_CLASS_MAPPINGS = {
    "ControlFreak": ControlFreakMarker
}


__all__ = ["NODE_CLASS_MAPPINGS"]

# Define the web directory for our JavaScript files
WEB_DIRECTORY = "./js"

