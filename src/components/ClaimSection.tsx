"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClaimForm from "./ClaimForm";

export interface ExistingClaimData {
  id: string;
  status: string;
  proofDescription?: string | null;
  verificationNotes?: string | null;
  createdAt?: Date | string | null;
  recoveryId?: string | null;
  recoveryStatus?: string | null;
}

interface ClaimSectionProps {
  itemType: "lost" | "found";
  itemId: string;
  counterpartId?: string | null;
  existingClaim?: ExistingClaimData | null;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  verified: { label: "تم إثبات وقبول الملكية بنجاح!", color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  rejected: { label: "لم يتم قبول الدليل — يرجى مراجعة التفاصيل", color: "hsl(0,80%,35%)", bg: "hsl(0,90%,95%)" },
  pending:  { label: "⏳ تم إرسال إثبات الملكية بنجاح — بانتظار مراجعة الملتقط", color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
};

export default function ClaimSection({ itemType, itemId, counterpartId, existingClaim }: ClaimSectionProps) {
  const router = useRouter();
  const [result, setResult] = useState<{ id: string; status: string; notes: string | null } | null>(null);

  useEffect(() => {
    if (result) {
      router.refresh();
      const timer = setTimeout(() => {
        if (result.status === "verified") {
          router.push(`/dashboard/recoveries?claimId=${result.id}&action=schedule`);
        } else {
          router.push("/dashboard/claims?tab=outgoing");
        }
        router.refresh();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [result, router]);

  // إذا وُجدت مطالبة نشطة مسبقة على هذا الغرض
  if (existingClaim) {
    if (existingClaim.status === "verified") {
      const isScheduled =
        existingClaim.recoveryStatus &&
        ["scheduled", "in_progress", "deposited", "completed"].includes(
          existingClaim.recoveryStatus
        );

      if (isScheduled) {
        return (
          <div
            style={{
              padding: "var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-success-light)",
              border: "1px solid hsl(142, 60%, 35%)33",
              marginTop: "var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "hsl(142, 60%, 25%)",
                fontWeight: 700,
                fontSize: "var(--font-size-base)",
                marginBottom: "var(--space-2)",
              }}
            >
              <span>✓</span>
              <span>تم جدولة موعد الاستلام بنجاح — الرمز متاح في لوحة التحكم</span>
            </div>

            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "hsl(142, 60%, 25%)",
                opacity: 0.9,
                lineHeight: 1.8,
                marginBottom: "var(--space-4)",
              }}
            >
              تم تأكيد موعد ونقطة الاستلام لهذا الغرض. يمكنك استعراض تفاصيل الموعد ورمز الاستلام (OTP) من خلال لوحة التحكم.
            </p>

            <Link
              href="/dashboard/recoveries"
              className="btn btn-primary btn-sm"
            >
              عرض تفاصيل الاستلام والرمز (OTP) ←
            </Link>
          </div>
        );
      }

      return (
        <div
          style={{
            padding: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-success-light)",
            border: "1px solid hsl(142, 60%, 35%)33",
            marginTop: "var(--space-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              color: "hsl(142, 60%, 25%)",
              fontWeight: 700,
              fontSize: "var(--font-size-base)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span>✓</span>
            <span>تم إثبات وقبول ملكيتك لهذا الغرض بنجاح!</span>
          </div>

          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "hsl(142, 60%, 25%)",
              opacity: 0.9,
              lineHeight: 1.8,
              marginBottom: "var(--space-4)",
            }}
          >
            تم توثيق المطالبة بنجاح. يمكنك الآن الانتقال مباشرة لجدولة موعد ومكان الاستلام في إحدى نقاط الأمانة المعتمدة.
          </p>

          <Link
            href={`/dashboard/recoveries?claimId=${existingClaim.id}&action=schedule`}
            className="btn btn-primary btn-sm"
          >
            الانتقال لجدولة موعد الاستلام ←
          </Link>
        </div>
      );
    }

    if (existingClaim.status === "pending") {
      return (
        <div
          style={{
            padding: "var(--space-5)",
            borderRadius: "var(--radius-lg)",
            background: "hsl(200, 60%, 96%)",
            border: "1px solid hsl(200, 60%, 80%)",
            marginTop: "var(--space-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              color: "hsl(200, 60%, 30%)",
              fontWeight: 700,
              fontSize: "var(--font-size-base)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span>⏳</span>
            <span>تم إرسال إثبات الملكية — بانتظار مراجعة الملتقط</span>
          </div>

          {existingClaim.proofDescription && (
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.8,
                marginBottom: "var(--space-3)",
              }}
            >
              <strong>دليل الإثبات المقدَّم:</strong> &quot;{existingClaim.proofDescription}&quot;
            </p>
          )}

          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-4)",
            }}
          >
            تم تسجيل المطالبة وهي قيد المراجعة حالياً لمنع ازدواجية الطلبات. سيتم إشعارك فور اكتمال مراجعتها.
          </p>

          <Link
            href="/dashboard/claims?tab=outgoing"
            className="btn btn-outline btn-sm"
            style={{
              color: "hsl(200, 60%, 30%)",
              borderColor: "hsl(200, 60%, 70%)",
              background: "#fff",
            }}
          >
            متابعة حالة المطالبة في لوحة التحكم ←
          </Link>
        </div>
      );
    }
  }

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
          router.push("/dashboard/claims?tab=outgoing");
        }
        router.refresh();
      }}
    />
  );
}

