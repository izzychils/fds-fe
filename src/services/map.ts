/**
 * Map provider configuration.
 *
 * The brief requires a real map provider when one is configured and authorized,
 * and an honest fallback when one is not. OpenStreetMap's embed endpoint needs
 * no API key, so it is enabled by default and gives genuine map tiles. Set
 * `VITE_MAP_PROVIDER=none` to disable map rendering entirely (for example on a
 * locked-down network) and the tracking panel falls back to a status view.
 *
 * NOTE: the map TILES are real. The courier POSITION is produced by the
 * development simulator in `services/orders.ts` and is labelled as such in the
 * UI at all times. Replace it with the backend tracking endpoint before making
 * any claim about live GPS.
 */

export type MapProvider = "openstreetmap" | "none";

const configured = (import.meta.env.VITE_MAP_PROVIDER as string | undefined)?.trim().toLowerCase();

export const MAP_PROVIDER: MapProvider = configured === "none" ? "none" : "openstreetmap";

export const MAP_PROVIDER_LABEL =
  MAP_PROVIDER === "openstreetmap" ? "OpenStreetMap tiles" : "No map provider";

/** True when the build can render a real map surface. */
export const MAP_ENABLED = MAP_PROVIDER !== "none";
