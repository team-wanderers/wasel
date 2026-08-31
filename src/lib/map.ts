import type { Map } from "maplibre-gl";

const MAPLIBRE_WORKER =
  "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl-worker.mjs";

function withCartoKey(url: string, key: string): string {
  if (!key || !url.includes("cartocdn.com") || /[?&]key=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
}

export function cartoVoyagerStyle(key: string): string {
  return withCartoKey("https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json", key);
}

export function createCartoMap(
  maplibre: typeof import("maplibre-gl"),
  container: HTMLElement,
  center: [number, number],
  zoom: number,
  key = "",
): Map {
  container.dir = "ltr";

  if (maplibre.getWorkerUrl() !== MAPLIBRE_WORKER) {
    maplibre.setWorkerUrl(MAPLIBRE_WORKER);
  }

  if (maplibre.getRTLTextPluginStatus() === "unavailable") {
    void maplibre.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
      true,
    );
  }

  const map = new maplibre.Map({
    container,
    style: cartoVoyagerStyle(key),
    center,
    zoom,
    attributionControl: {
      compact: true,
      customAttribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
    },
    dragRotate: false,
    pitchWithRotate: false,
    rollEnabled: false,
    transformRequest(url) {
      return { url: withCartoKey(url, key) };
    },
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
  return map;
}
