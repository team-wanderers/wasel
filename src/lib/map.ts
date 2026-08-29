import type { Map } from "maplibre-gl";

export function cartoVoyagerStyle(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";
  const base = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
  return key ? `${base}?key=${key}` : base;
}

export function createCartoMap(
  maplibre: typeof import("maplibre-gl"),
  container: HTMLElement,
  center: [number, number],
  zoom: number,
): Map {
  if (maplibre.getRTLTextPluginStatus() === "unavailable") {
    void maplibre.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
      true,
    );
  }

  const map = new maplibre.Map({
    container,
    style: cartoVoyagerStyle(),
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
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
  return map;
}
