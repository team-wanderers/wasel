"use client";

import { useEffect, useRef } from "react";
import type { Map } from "maplibre-gl";
import { createCartoMap } from "@/lib/map";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewerProps {
  lat: number;
  lng: number;
  zoom?: number;
}

export default function MapViewer({ lat, lng, zoom = 15 }: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (typeof window === "undefined" || !containerRef.current) return;

      const maplibre = await import("maplibre-gl");

      if (isCancelled || !containerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = createCartoMap(maplibre, containerRef.current, [lng, lat], zoom);
      mapInstanceRef.current = map;

      new maplibre.Marker()
        .setLngLat([lng, lat])
        .setPopup(new maplibre.Popup({ offset: 16, closeButton: false }).setText("الموقع التقريبي"))
        .addTo(map)
        .togglePopup();

      map.resize();

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      }, 100);

      setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          mapInstanceRef.current.resize();
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
      dir="ltr"
      className="relative isolate overflow-hidden z-0 w-full h-64 rounded-xl border border-[var(--color-border)]"
      style={{ minHeight: "256px" }}
      aria-label="موقع الغرض على الخريطة"
    />
  );
}
