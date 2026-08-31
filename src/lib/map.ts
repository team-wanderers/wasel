import type { Map } from "maplibre-gl";

function withCartoKey(url: string): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";
  if (!key || !url.includes("cartocdn.com") || /[?&]key=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
}

export function cartoVoyagerStyle(): string {
  return withCartoKey("https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json");
}

export function createCartoMap(
  maplibre: typeof import("maplibre-gl"),
  container: HTMLElement,
  center: [number, number],
  zoom: number,
): Map {
  container.dir = "ltr";

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
    transformRequest(url) {
      return { url: withCartoKey(url) };
    },
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
  return map;
}
