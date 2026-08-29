"use client";

import { useEffect, useRef } from "react";
import type { Map, Marker } from "maplibre-gl";
import { createCartoMap } from "@/lib/map";
import "maplibre-gl/dist/maplibre-gl.css";

const ATAQ_LAT = 14.5372;
const ATAQ_LNG = 46.8319;
const DEFAULT_ZOOM = 14;

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);

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

      const initialLat = lat ?? ATAQ_LAT;
      const initialLng = lng ?? ATAQ_LNG;

      const map = createCartoMap(maplibre, containerRef.current, [initialLng, initialLat], DEFAULT_ZOOM);
      mapInstanceRef.current = map;

      const marker = new maplibre.Marker({ draggable: true })
        .setLngLat([initialLng, initialLat])
        .setPopup(
          new maplibre.Popup({ offset: 16, closeButton: false }).setText("حرِّك الدبوس لتحديد الموقع"),
        )
        .addTo(map);
      marker.togglePopup();
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        onChange(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onChange(e.lngLat.lat, e.lngLat.lng);
      });

      if (lat && lng) {
        onChange(lat, lng);
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className="map-container"
        style={{ minHeight: "320px", width: "100%", borderRadius: "var(--radius-md)" }}
        aria-label="خريطة تحديد الموقع"
      />
      {lat && lng && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
          الإحداثيات: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
