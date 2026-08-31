"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type MediaImageProps = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  style?: CSSProperties;
  fallback?: ReactNode;
};

export default function MediaImage({
  src,
  alt = "",
  width,
  height,
  fill,
  style,
  fallback = null,
}: MediaImageProps) {
  const [ok, setOk] = useState(true);
  if (!ok) return fallback;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      onError={() => setOk(false)}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              ...style,
            }
          : style
      }
    />
  );
}
