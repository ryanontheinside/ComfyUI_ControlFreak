"""
CONTROL FREAK - Map MIDI controllers, gamepads, and other devices to ComfyUI parameters

"""

class DummyNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "input": ("*", {}),
            }
        }
    
    RETURN_TYPES = ("*",)
    FUNCTION = "dummy"
    CATEGORY = "testing"

    def dummy(self, input):
        return (input,)

NODE_CLASS_MAPPINGS = {
    "DummyNode": DummyNode
}


__all__ = ["NODE_CLASS_MAPPINGS"]

# Define the web directory for our JavaScript files
WEB_DIRECTORY = "./js"

