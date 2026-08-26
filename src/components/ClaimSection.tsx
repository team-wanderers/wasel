"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClaimForm from "./ClaimForm";

interface ClaimSectionProps {
  itemType: "lost" | "found";
  itemId: string;
  counterpartId?: string | null;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  verified: { label: "تم إثبات الملكية تلقائياً بنجاح!", color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  rejected: { label: "لم يتطابق الدليل مع التفاصيل السرية — ستتم المراجعة يدوياً", color: "hsl(30,80%,30%)", bg: "hsl(38,90%,92%)" },
  pending:  { label: "تم إرسال المطالبة بنجاح وهي قيد المراجعة", color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
};

export default function ClaimSection({ itemType, itemId, counterpartId }: ClaimSectionProps) {
  const router = useRouter();
  const [result, setResult] = useState<{ id: string; status: string; notes: string | null } | null>(null);

  useEffect(() => {
    if (result) {
      router.refresh();
      const timer = setTimeout(() => {
        if (result.status === "verified") {
          router.push(`/dashboard/recoveries?claimId=${result.id}&action=schedule`);
        } else {
          router.push("/dashboard/claims");
        }
        router.refresh();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [result, router]);

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
        <div style={{ marginBottom: "var(--space-2)" }}>{info.label}</div>
        {result.notes && (
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 400, opacity: 0.85, marginBottom: "var(--space-2)" }}>
            {result.notes}
          </div>
        )}
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            opacity: 0.95,
            marginTop: "var(--space-3)",
            paddingTop: "var(--space-2)",
            borderTop: `1px solid ${info.color}22`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-2)",
          }}
        >
          <span>
            {result.status === "verified"
              ? "جارٍ تحويلك تلقائياً لجدولة موعد ونقطة الاستلام..."
              : "جارٍ تحويلك تلقائياً إلى صفحة المطالبات لمتابعة المراجعة..."}
          </span>
          <Link
            href={result.status === "verified" ? `/dashboard/recoveries?claimId=${result.id}&action=schedule` : "/dashboard/claims"}
            onClick={() => router.refresh()}
            className="btn btn-sm btn-outline"
            style={{ background: "#fff", borderColor: info.color, color: info.color }}
          >
            {result.status === "verified" ? "الانتقال لجدولة الاستلام الآن ←" : "الانتقال للمطالبات الآن ←"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClaimForm
      itemType={itemType}
      itemId={itemId}
      counterpartId={counterpartId}
      onSuccess={(id, status, notes) => {
        setResult({ id, status, notes });
        if (status === "verified") {
          router.push(`/dashboard/recoveries?claimId=${id}&action=schedule`);
        } else {
          router.push("/dashboard/claims");
        }
        router.refresh();
      }}
    />
  );
}
