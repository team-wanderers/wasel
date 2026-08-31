"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

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

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "&copy; Google Maps",
        maxZoom: 20,
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("الموقع التقريبي")
        .openPopup();

      map.invalidateSize();

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);

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
    <div
      ref={containerRef}
      className="relative isolate overflow-hidden z-0 w-full h-64 rounded-xl border border-[var(--color-border)]"
      style={{ minHeight: "256px" }}
      aria-label="موقع الغرض على الخريطة"
    />
  );
}
