/* =========================================================================
   THE IMPOSTOR — 00-config.js
   CONFIG: providers, keys, debug flag
   Classic script (no ES modules): loaded in HTML order, shares the
   global scope with all other js/* modules. Keep load order stable.
   ========================================================================= */
/* =========================================================================
   THE IMPOSTOR — 3D.  Same verified simulation, rendered in a 3D chamber.
   Sim runs in logical 2D coordinates (1200x720 virtual arena); the Three.js
   layer is a view of it. Webcam segmentation becomes a billboard texture.
   ========================================================================= */

const CONFIG = {
  PROVIDER: "auto",              // auto | omniai | openrouter | anthropic | local
  OMNIAI_API_KEY: "YOUR_API_KEY_HERE",
  OMNIAI_MODEL: "gemini-2.5-flash-lite",
  OPENROUTER_API_KEY: "YOUR_API_KEY_HERE",     // openrouter.ai — FREE tier
  OPENROUTER_MODEL: "openrouter/free",         // or any :free variant
  ANTHROPIC_API_KEY: "YOUR_API_KEY_HERE",
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
  DEBUG_MODE: (typeof location !== "undefined" && /[?&]debug/.test(location.search)) || false
};
