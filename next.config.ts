import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
  serverExternalPackages: ["postgres", "drizzle-orm"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
};

export default nextConfig;
