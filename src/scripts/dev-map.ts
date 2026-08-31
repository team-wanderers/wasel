import "dotenv/config";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const PORT = Number(process.env.MAP_DEV_PORT ?? 3001);
const key = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";
const dist = join(process.cwd(), "node_modules", "maplibre-gl", "dist");

const assets: Record<string, [string, string]> = {
  "/maplibre-gl.mjs": ["maplibre-gl.mjs", "text/javascript"],
  "/maplibre-gl-shared.mjs": ["maplibre-gl-shared.mjs", "text/javascript"],
  "/maplibre-gl-worker.mjs": ["maplibre-gl-worker.mjs", "text/javascript"],
  "/maplibre-gl.css": ["maplibre-gl.css", "text/css"],
};

const html = `<!doctype html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>wasel map playground</title>
  <link rel="stylesheet" href="/maplibre-gl.css" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; font: 14px/1.4 system-ui, sans-serif; }
    body { display: flex; flex-direction: column; }
    header {
      display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center;
      padding: 10px 14px; background: #1b2a4a; color: #fff;
    }
    header label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    #map { flex: 1; min-height: 0; }
    #log {
      max-height: 28vh; overflow: auto; margin: 0; padding: 8px 12px;
      background: #111827; color: #d1d5db; font: 12px/1.45 ui-monospace, monospace;
      white-space: pre-wrap;
    }
    .err { color: #fca5a5; }
    .ok { color: #86efac; }
  </style>
</head>
<body>
  <header>
    <strong>map playground</strong>
    <label><input type="radio" name="style" value="vector" checked /> vector</label>
    <label><input type="radio" name="style" value="raster" /> raster</label>
    <label><input type="checkbox" id="rtl" checked /> page RTL</label>
    <label><input type="checkbox" id="useKey" checked /> CARTO key</label>
    <span id="keyState"></span>
  </header>
  <div id="map"></div>
  <pre id="log"></pre>
  <script type="module">
    import * as maplibregl from "/maplibre-gl.mjs";

    const KEY = __CARTO_KEY__;
    const ATAQ = [46.8319, 14.5372];
    const logEl = document.getElementById("log");
    const mapEl = document.getElementById("map");
    const keyState = document.getElementById("keyState");
    keyState.textContent = KEY ? "key loaded" : "no NEXT_PUBLIC_CARTO_API_KEY";

    function log(msg, cls) {
      const line = document.createElement("div");
      if (cls) line.className = cls;
      line.textContent = new Date().toISOString().slice(11, 23) + "  " + msg;
      logEl.prepend(line);
    }

    function withKey(url, enabled) {
      if (!enabled || !KEY || !url.includes("cartocdn.com") || /[?&]key=/.test(url)) return url;
      return url + (url.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(KEY);
    }

    function vectorStyle(enabled) {
      return withKey("https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json", enabled);
    }

    function rasterStyle(enabled) {
      return {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: "abcd".split("").map((s) =>
              withKey("https://" + s + ".basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png", enabled)
            ),
            tileSize: 256,
            attribution: "© OpenStreetMap contributors, © CARTO",
          },
        },
        layers: [{ id: "carto", type: "raster", source: "carto" }],
      };
    }

    let map;
    function boot() {
      if (map) map.remove();
      const rtl = document.getElementById("rtl").checked;
      const useKey = document.getElementById("useKey").checked;
      const styleMode = document.querySelector("input[name=style]:checked").value;
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      mapEl.dir = "ltr";

      if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
        void maplibregl.setRTLTextPlugin(
          "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
          true,
        );
      }

      map = new maplibregl.Map({
        container: mapEl,
        style: styleMode === "vector" ? vectorStyle(useKey) : rasterStyle(useKey),
        center: ATAQ,
        zoom: 14,
        attributionControl: { compact: true },
        transformRequest(url) {
          return { url: withKey(url, useKey) };
        },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      new maplibregl.Marker({ draggable: true }).setLngLat(ATAQ).addTo(map);
      map.on("load", () => log("load " + styleMode + (useKey ? " +key" : " no-key") + (rtl ? " rtl" : " ltr"), "ok"));
      map.on("error", (e) => log(e.error?.message || String(e.error || e), "err"));
      log("init " + styleMode);
    }

    document.querySelectorAll("input").forEach((el) => el.addEventListener("change", boot));
    boot();
  </script>
</body>
</html>
`;

const server = createServer((req, res) => {
  const url = (req.url ?? "/").split("?")[0] ?? "/";
  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html.replace("__CARTO_KEY__", JSON.stringify(key)));
    return;
  }
  const asset = assets[url];
  if (asset) {
    const [name, type] = asset;
    res.writeHead(200, { "content-type": type });
    createReadStream(join(dist, name)).pipe(res);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`map playground  http://localhost:${PORT}  (no db)`);
});
