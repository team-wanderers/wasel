"use client";

import { useState } from "react";
import ClaimForm from "./ClaimForm";

interface ClaimSectionProps {
  itemType: "lost" | "found";
  itemId: string;
  counterpartId?: string | null;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  verified: { label: "تم إثبات الملكية تلقائياً بنجاح", color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  rejected: { label: "لم يتطابق الدليل مع التفاصيل السرية — ستتم المراجعة يدوياً", color: "hsl(30,80%,30%)", bg: "hsl(38,90%,92%)" },
  pending:  { label: "تم إرسال المطالبة وهي قيد المراجعة", color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
};

export default function ClaimSection({ itemType, itemId, counterpartId }: ClaimSectionProps) {
  const [result, setResult] = useState<{ id: string; status: string; notes: string | null } | null>(null);

  if (result) {
    const info = statusLabels[result.status] ?? statusLabels.pending;
    return (
      <div
        style={{
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-md)",
          background: info.bg,
          color: info.color,
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          border: `1px solid ${info.color}33`,
          marginTop: "var(--space-4)",
        }}
      >
        <div style={{ marginBottom: result.notes ? "var(--space-2)" : 0 }}>{info.label}</div>
        {result.notes && (
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 400, opacity: 0.85 }}>
            {result.notes}
          </div>
        )}
      </div>
    );
  }

  return (
    <ClaimForm
      itemType={itemType}
      itemId={itemId}
      counterpartId={counterpartId}
      onSuccess={(id, status, notes) => setResult({ id, status, notes })}
    />
  );
}
