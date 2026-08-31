import type { Map, StyleSpecification } from "maplibre-gl";

const MAPLIBRE_WORKER =
  "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl-worker.mjs";

export function googleMapsStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      "google-tiles": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "&copy; Google Maps",
        maxzoom: 20,
      },
    },
    layers: [
      {
        id: "google-tiles-layer",
        type: "raster",
        source: "google-tiles",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

export function cartoVoyagerStyle(key?: string): StyleSpecification {
  void key;
  return googleMapsStyle();
}

export function createCartoMap(
  maplibre: typeof import("maplibre-gl"),
  container: HTMLElement,
  center: [number, number],
  zoom: number,
  key?: string,
): Map {
  void key;
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
    style: googleMapsStyle(),
    center,
    zoom,
    maxZoom: 20,
    attributionControl: {
      compact: true,
      customAttribution: "&copy; Google Maps",
    },
    dragRotate: false,
    pitchWithRotate: false,
    rollEnabled: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
  return map;
}
