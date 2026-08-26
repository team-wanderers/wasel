"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function AlertBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const isUnauthorized = searchParams.get("error") === "unauthorized_admin";

  if (!isUnauthorized || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    router.replace("/dashboard");
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-6)",
        background: "hsl(0,70%,95%)",
        borderBottom: "2px solid hsl(0,65%,82%)",
        color: "hsl(0,65%,35%)",
        fontSize: "var(--font-size-sm)",
        fontWeight: 600,
        animation: "slideDown 0.25s ease",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <span>عذراً، الوصول إلى لوحة الإدارة مقتصر على المشرفين فقط.</span>

      <button
        onClick={dismiss}
        aria-label="إغلاق التنبيه"
        style={{
          marginRight: "var(--space-2)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "hsl(0,65%,35%)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-base)",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function UnauthorizedAdminAlert() {
  return (
    <Suspense fallback={null}>
      <AlertBanner />
    </Suspense>
  );
}
