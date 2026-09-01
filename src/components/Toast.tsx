"use client";

import { useEffect } from "react";
import { IconAlertTriangle, IconCheck, IconClose } from "@/components/icons";

export type ToastType = "success" | "error";

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ type, message, onDismiss, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      style={{
        position: "fixed",
        top: "1rem",
        insetInlineEnd: "1rem",
        zIndex: 10000,
        width: "min(420px, calc(100vw - 2rem))",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${type === "error" ? "hsl(0, 65%, 78%)" : "hsl(142, 50%, 75%)"}`,
        background: type === "error" ? "var(--color-danger-light)" : "var(--color-success-light)",
        color: type === "error" ? "hsl(0, 65%, 30%)" : "hsl(142, 60%, 25%)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <span style={{ flexShrink: 0, paddingTop: "2px" }}>
        {type === "error" ? <IconAlertTriangle size={18} /> : <IconCheck size={18} />}
      </span>
      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", fontWeight: 600, lineHeight: 1.7 }}>
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="إغلاق التنبيه"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: "2px",
          border: 0,
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}
