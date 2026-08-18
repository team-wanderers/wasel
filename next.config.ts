import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // السماح بتحميل صور Leaflet من unpkg
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
  // تجنب مشكلة Leaflet مع SSR
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
