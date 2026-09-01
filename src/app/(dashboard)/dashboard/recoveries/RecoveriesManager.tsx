"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ScheduleModal, { PickupPoint, VerifiedClaim } from "./ScheduleModal";
import RecoveryCard, { RecoveryItem } from "./RecoveryCard";
import Toast from "@/components/Toast";

interface Props {
  initialRecoveries: RecoveryItem[];
  availablePickupPoints: PickupPoint[];
  verifiedClaims: VerifiedClaim[];
  currentUserId: string;
}

function RecoveriesManagerInner({
  initialRecoveries,
  availablePickupPoints,
  verifiedClaims,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramClaimId = searchParams.get("claimId");
  const paramMatchId = searchParams.get("matchId");
  const paramAction = searchParams.get("action");

  const matchedClaim = paramMatchId ? verifiedClaims.find((c) => c.matchId === paramMatchId) : undefined;
  const resolvedParamClaimId = paramClaimId || matchedClaim?.id;

  const [recoveriesList, setRecoveriesList] = useState<RecoveryItem[]>(initialRecoveries);

  // فحص ما إذا كانت المطالبة أو المطابقة مجدولة مسبقاً ولديها سجل استلام
  const existingActiveRecovery = recoveriesList.find((r) => {
    if (resolvedParamClaimId && r.claimId === resolvedParamClaimId) {
      return ["scheduled", "in_progress", "deposited", "completed"].includes(r.status);
    }
    if (matchedClaim) {
      if (r.claimId === matchedClaim.id) {
        return ["scheduled", "in_progress", "deposited", "completed"].includes(r.status);
      }
      if (
        matchedClaim.lostItemId &&
        r.lostItemId === matchedClaim.lostItemId &&
        matchedClaim.foundItemId &&
        r.foundItemId === matchedClaim.foundItemId
      ) {
        return ["scheduled", "in_progress", "deposited", "completed"].includes(r.status);
      }
    }
    return false;
  });

  const [modalOpenOverride, setModalOpenOverride] = useState<boolean | null>(null);
  const isModalOpen =
    modalOpenOverride !== null
      ? modalOpenOverride
      : Boolean(
          !existingActiveRecovery &&
          (paramAction === "schedule" || (resolvedParamClaimId && verifiedClaims.some((c) => c.id === resolvedParamClaimId)))
        );

  // إذا كانت مجدولة مسبقاً مع وجود معلمات في الرابط: تفريغ الرابط فوراً
  useEffect(() => {
    if (existingActiveRecovery && (paramAction || paramClaimId || paramMatchId)) {
      router.replace("/dashboard/recoveries");
    }
  }, [existingActiveRecovery, paramAction, paramClaimId, paramMatchId, router]);

  const [activeModalRecovery, setActiveModalRecovery] = useState<RecoveryItem | null>(null);
  const [customTargetClaimId, setCustomTargetClaimId] = useState<string | undefined>(undefined);
  const targetClaimId = customTargetClaimId ?? (resolvedParamClaimId || undefined);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});

  async function refreshRecoveries() {
    try {
      const res = await fetch("/api/recoveries");
      if (res.ok) {
        const freshList = await res.json();
        setRecoveriesList(freshList);
      }
    } catch (e) {
      console.error("Failed to refresh recoveries", e);
    }
  }

  function handleOpenNewSchedule() {
    setActiveModalRecovery(null);
    setCustomTargetClaimId(undefined);
    setModalOpenOverride(true);
  }

  function handleOpenReschedule(rec: RecoveryItem) {
    setActiveModalRecovery(rec);
    setCustomTargetClaimId(undefined);
    setModalOpenOverride(true);
  }

  async function handleConfirm(recId: string) {
    setConfirmingId(recId);
    setMessage(null);

    try {
      const res = await fetch(`/api/recoveries/${recId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "فشل تأكيد الاستلام" });
        return;
      }

      setMessage({ type: "success", text: data.message || "تم تسجيل تأكيدك بنجاح" });

      if (data.recovery) {
        setRecoveriesList((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, ...data.recovery } : r))
        );
      }
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "حدث خطأ في الاتصال أثناء التأكيد" });
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleConfirmOtp(recId: string, otp: string) {
    setConfirmingId(recId);
    setMessage(null);
    setOtpErrors((prev) => ({ ...prev, [recId]: "" }));

    try {
      const res = await fetch(`/api/recoveries/${recId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverCode: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorText = data.error || "رمز الاستلام غير صحيح";
        setOtpErrors((prev) => ({ ...prev, [recId]: errorText }));
        setMessage({ type: "error", text: errorText });
        return;
      }

      setOtpErrors((prev) => {
        const next = { ...prev };
        delete next[recId];
        return next;
      });
      setMessage({ type: "success", text: data.message || "تم التحقق من الرمز بنجاح واكتمال التسليم" });

      if (data.recovery) {
        setRecoveriesList((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, ...data.recovery } : r))
        );
      }
      router.refresh();
    } catch {
      const errorText = "حدث خطأ أثناء التحقق من الرمز";
      setOtpErrors((prev) => ({ ...prev, [recId]: errorText }));
      setMessage({ type: "error", text: errorText });
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
    <div style={{ maxWidth: "1000px", width: "100%" }}>
          <h1 className="page-title" style={{ margin: 0 }}>عمليات الاستلام والتسليم</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            إدارة مواعيد التسليم في نقاط الأمانة المعتمدة وتوثيق الاستلام عبر الرمز السريع (OTP) والتأكيد الثنائي
          </p>
        </div>

        {verifiedClaims.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenNewSchedule}
          >
            جدولة استلام مطالبة معتمدة +
          </button>
        )}
      </div>

      {message && (
        <Toast
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* مودال الجدولة وتعديل المواعيد */}
      {isModalOpen && (
        <ScheduleModal
          key={activeModalRecovery?.id || targetClaimId || "new-schedule"}
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpenOverride(false);
            setCustomTargetClaimId(undefined);
            if (paramAction || paramClaimId || paramMatchId) {
              router.replace("/dashboard/recoveries");
            }
          }}
          availablePickupPoints={availablePickupPoints}
          verifiedClaims={verifiedClaims}
          defaultClaimId={activeModalRecovery?.claimId || targetClaimId}
          existingRecoveryId={activeModalRecovery?.id}
          defaultPickupPointId={activeModalRecovery?.pickupPointId || undefined}
          defaultDate={activeModalRecovery?.scheduledAt ? String(activeModalRecovery.scheduledAt) : undefined}
          defaultNotes={activeModalRecovery?.notes || undefined}
          onSuccess={(msg, updated) => {
            setMessage({ type: "success", text: msg });
            setModalOpenOverride(false);
            setCustomTargetClaimId(undefined);
            if (paramAction || paramClaimId || paramMatchId) {
              router.replace("/dashboard/recoveries");
            }
            if (updated && updated.id) {
              setRecoveriesList((prev) =>
                prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
              );
            }
            refreshRecoveries();
            router.refresh();
          }}
        />
      )}

      {recoveriesList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            لا توجد عمليات استلام وتسليم مجدولة حالياً
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            عند إثبات ملكية غرض بنجاح، يمكنك جدولة نقطة الاستلام وتوثيق التسليم عبر التأكيد الثنائي أو رمز OTP
          </p>
          <Link href="/dashboard/claims" className="btn btn-primary">
            استعراض مطالباتي
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {recoveriesList.map((rec) => (
            <RecoveryCard
              key={rec.id}
              recovery={rec}
              currentUserId={currentUserId}
              onOpenReschedule={handleOpenReschedule}
              onConfirm={handleConfirm}
              onConfirmOtp={handleConfirmOtp}
              otpError={otpErrors[rec.id]}
              isConfirming={confirmingId === rec.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecoveriesManager(props: Props) {
  return (
    <Suspense fallback={<div>جارٍ التحميل...</div>}>
      <RecoveriesManagerInner {...props} />
    </Suspense>
  );
}
