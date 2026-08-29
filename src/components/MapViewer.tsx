"use client";

import { useEffect, useRef } from "react";

interface MapViewerProps {
  lat: number;
  lng: number;
  zoom?: number;
}

export default function MapViewer({ lat, lng, zoom = 15 }: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (typeof window === "undefined" || !containerRef.current) return;

      const L = await import("leaflet");

      if (isCancelled || !containerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const el = containerRef.current as HTMLElement & { _leaflet_id?: number | null };
      if (el._leaflet_id) {
        delete el._leaflet_id;
      }

      if (isCancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        zoomControl: true,
        dragging: true,
      }).setView([lat, lng], zoom);

      mapInstanceRef.current = map;

      L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY ?? ""}`,
        {
        attribution: "© OpenStreetMap contributors, © CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("الموقع التقريبي")
        .openPopup();

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom]);

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        className="map-container"
        style={{
          minHeight: "280px",
          width: "100%",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          zIndex: 0,
        }}
        aria-label="موقع الغرض على الخريطة"
      />
    </div>
  );
}
