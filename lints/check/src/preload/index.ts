// The preload bridge exposes only the typed window bridge; it never imports
// the renderer or core internals. Clean control: no markers, so nothing may
// fire here — the preload wall stays quiet on a compliant bridge.
export const bridgeChannel = "rpc";
