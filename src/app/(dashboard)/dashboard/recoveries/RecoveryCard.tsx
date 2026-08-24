"use client";

import { useState } from "react";
import { IconCheck, IconCircle } from "@/components/icons";

export interface RecoveryItem {
  id: string;
  claimId: string;
  pickupPointId: string | null;
  status: string;
  scheduledAt: string | Date | null;
  completedAt: string | Date | null;
  ownerConfirmedAt: string | Date | null;
  finderConfirmedAt: string | Date | null;
  notes: string | null;
  handoverCode: string | null;
  createdAt: string | Date;
  claimantId: string;
  pickupPointName: string | null;
  pickupPointAddress: string | null;
  pickupPointPhone: string | null;
  lostItemId: string | null;
  foundItemId: string | null;
  lostTitle: string | null;
  lostUserId: string | null;
  foundTitle: string | null;
  foundUserId: string | null;
}

interface RecoveryCardProps {
  recovery: RecoveryItem;
  currentUserId: string;
  onOpenReschedule: (recovery: RecoveryItem) => void;
  onConfirm: (recoveryId: string) => void;
  onConfirmOtp: (recoveryId: string, otp: string) => void;
  isConfirming: boolean;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:   { label: "مجدول",                       color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
  deposited:   { label: "مودع في نقطة الأمانة",       color: "hsl(180,60%,25%)", bg: "hsl(180,60%,92%)" },
  in_progress: { label: "بانتظار اكتمال الاستلام",     color: "hsl(38,90%,30%)",  bg: "hsl(38,90%,92%)" },
  completed:   { label: "مكتمل ومسترجع",              color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  cancelled:   { label: "ملغى",                        color: "var(--color-text-muted)", bg: "var(--color-bg-secondary)" },
};

export function getUserRole(
  rec: RecoveryItem,
  userId: string
): { role: "owner" | "finder" | "other"; label: string; buttonText: string; isConfirmed: boolean } {
  // 1. إذا كان الغرض معثوراً عليه (found_item) والمستخدم الحالي هو صاحب البلاغ -> هو الملتقط (المُودِع)
  if (rec.foundUserId === userId) {
    return {
      role: "finder",
      label: "الملتقط (المُودِع)",
      buttonText: "تأكيد إيداع الغرض في المركز",
      isConfirmed: Boolean(rec.finderConfirmedAt),
    };
  }

  // 2. إذا كان الغرض مفقوداً (lost_item) والمستخدم الحالي هو صاحب البلاغ -> هو المالك (المُستلِم)
  if (rec.lostUserId === userId) {
    return {
      role: "owner",
      label: "المالك (المُستلِم)",
      buttonText: "تأكيد الاستلام",
      isConfirmed: Boolean(rec.ownerConfirmedAt),
    };
  }

  // 3. إذا كان المستخدم هو صاحب المطالبة (claimant)
  if (rec.claimantId === userId) {
    if (rec.foundItemId) {
      return {
        role: "owner",
        label: "المالك (المُستلِم)",
        buttonText: "تأكيد الاستلام",
        isConfirmed: Boolean(rec.ownerConfirmedAt),
      };
    }

    if (rec.lostItemId) {
      return {
        role: "finder",
        label: "الملتقط (المُودِع)",
        buttonText: "تأكيد إيداع الغرض في المركز",
        isConfirmed: Boolean(rec.finderConfirmedAt),
      };
    }

    return {
      role: "owner",
      label: "المالك (المُستلِم)",
      buttonText: "تأكيد الاستلام",
      isConfirmed: Boolean(rec.ownerConfirmedAt),
    };
  }

  return {
    role: "other",
    label: "طرف مصرح",
    buttonText: "تأكيد العملية",
    isConfirmed: false,
  };
}

export default function RecoveryCard({
  recovery,
  currentUserId,
  onOpenReschedule,
  onConfirm,
  onConfirmOtp,
  isConfirming,
}: RecoveryCardProps) {
  const [otpValue, setOtpValue] = useState("");
  const s = statusLabels[recovery.status] ?? statusLabels.scheduled;
  const itemTitle = recovery.foundTitle ?? recovery.lostTitle ?? "غرض غير محدد";

  const { role, label: roleLabel, buttonText, isConfirmed: userAlreadyConfirmed } = getUserRole(recovery, currentUserId);
  const isCompleted = recovery.status === "completed";

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otpValue.length === 4) {
      onConfirmOtp(recovery.id, otpValue);
    }
  }

  return (
    <div className="card" style={{ borderRight: `4px solid ${s.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            عملية تسليم لـ:
          </div>
          <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, marginTop: "var(--space-1)" }}>
            {itemTitle}
          </h3>
        </div>

        <span
          style={{
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.color}33`,
          }}
        >
          {s.label}
        </span>
      </div>

      {/* تنبيه المرونة والتسليم المستقل */}
      <div
        style={{
          background: "hsl(48, 100%, 96%)",
          border: "1px solid hsl(48, 90%, 80%)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          marginBottom: "var(--space-4)",
          fontSize: "var(--font-size-xs)",
          color: "hsl(35, 90%, 25%)",
          lineHeight: 1.6,
        }}
      >
        <strong>ملاحظة للمستلم والملتقط:</strong> يمكن للملتقط إيداع الغرض، وللمالك استلامه بشكل مستقل خلال ساعات عمل المركز دون اشتراط التواجد معاً.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)", background: "var(--color-bg-secondary)", padding: "var(--space-4)", borderRadius: "var(--radius-md)" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>نقطة الاستلام المعتمدة</div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginTop: "var(--space-1)" }}>
            {recovery.pickupPointName || "تسليم مباشر بين الطرفين"}
          </div>
          {recovery.pickupPointAddress && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
              {recovery.pickupPointAddress}
            </div>
          )}
          {recovery.pickupPointPhone && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary)", direction: "ltr", textAlign: "right" }}>
              {recovery.pickupPointPhone}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>موعد التسليم المقترح</span>
            {!isCompleted && (
              <button
                type="button"
                onClick={() => onOpenReschedule(recovery)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary)",
                  fontSize: "var(--font-size-xs)",
                  cursor: "pointer",
                  fontWeight: 600,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                طلب موعد بديل
              </button>
            )}
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginTop: "var(--space-1)" }}>
            {recovery.scheduledAt
              ? new Date(recovery.scheduledAt).toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" })
              : "غير محدد بدقة"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>دورك في العملية</div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, marginTop: "var(--space-1)" }}>
            {roleLabel}
          </div>
        </div>
      </div>

      {/* بطاقة رمز الاستلام للمالك */}
      {recovery.handoverCode && !isCompleted && role === "owner" && (
        <div
          style={{
            background: "hsl(200,60%,96%)",
            border: "1px dashed hsl(200,60%,60%)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "hsl(200,60%,25%)" }}>
              رمز الاستلام السريع (Handover OTP)
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              احتفظ بهذا الرمز وأدخله لتأكيد استلام الغرض عند حضورك لنقطة الأمانة
            </div>
          </div>
          <div
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: 800,
              letterSpacing: "4px",
              color: "var(--color-primary)",
              fontFamily: "monospace",
              background: "#fff",
              padding: "var(--space-1) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            {recovery.handoverCode}
          </div>
        </div>
      )}

      {recovery.notes && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          <strong>ملاحظات:</strong> {recovery.notes}
        </p>
      )}

      {/* شريط المتابعة والتأكيد */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", fontSize: "var(--font-size-xs)" }}>
          <span style={{ color: recovery.finderConfirmedAt ? "hsl(142,60%,30%)" : "var(--color-text-muted)", fontWeight: recovery.finderConfirmedAt ? 600 : 400, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
            {recovery.finderConfirmedAt ? (
              <>
                <IconCheck size={12} strokeWidth={2.4} />
                تم إيداع الغرض في المركز ({new Date(recovery.finderConfirmedAt).toLocaleDateString("ar-YE")})
              </>
            ) : (
              <>
                <IconCircle size={12} />
                لم يتم إيداع الغرض بعد
              </>
            )}
          </span>
          <span style={{ color: recovery.ownerConfirmedAt ? "hsl(142,60%,30%)" : "var(--color-text-muted)", fontWeight: recovery.ownerConfirmedAt ? 600 : 400, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
            {recovery.ownerConfirmedAt ? (
              <>
                <IconCheck size={12} strokeWidth={2.4} />
                تم استلام المالك ({new Date(recovery.ownerConfirmedAt).toLocaleDateString("ar-YE")})
              </>
            ) : (
              <>
                <IconCircle size={12} />
                بانتظار استلام المالك
              </>
            )}
          </span>
        </div>

        {!isCompleted && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
            {/* واجهة الملتقط: إيداع الغرض فقط */}
            {role === "finder" && (
              <>
                {!recovery.finderConfirmedAt ? (
                  <button
                    type="button"
                    onClick={() => onConfirm(recovery.id)}
                    className="btn btn-primary btn-sm"
                    disabled={isConfirming}
                  >
                    {isConfirming ? "جارٍ تسجيل الإيداع..." : buttonText}
                  </button>
                ) : (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "hsl(142,60%,30%)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                    <IconCheck size={12} strokeWidth={2.4} /> تم إيداعك للغرض — بانتظار استلام المالك
                  </span>
                )}
              </>
            )}

            {/* واجهة المالك: تأكيد الاستلام عبر الـ OTP */}
            {role === "owner" && (
              <>
                {!recovery.ownerConfirmedAt ? (
                  <form
                    onSubmit={handleOtpSubmit}
                    style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}
                  >
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="رمز الاستلام (4 أرقام)"
                      className="input input-sm"
                      style={{
                        width: "150px",
                        textAlign: "center",
                        letterSpacing: "3px",
                        fontWeight: 700,
                        fontSize: "var(--font-size-sm)",
                        fontFamily: "monospace",
                      }}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isConfirming || otpValue.length < 4}
                    >
                      {isConfirming ? "جارٍ التحقق..." : "تأكيد الاستلام"}
                    </button>
                  </form>
                ) : (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "hsl(142,60%,30%)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                    <IconCheck size={12} strokeWidth={2.4} /> تم تسجيل استلامك بنجاح
                  </span>
                )}
              </>
            )}

            {/* أدوار المشرفين أو الأطراف الأخرى */}
            {role === "other" && !userAlreadyConfirmed && (
              <button
                type="button"
                onClick={() => onConfirm(recovery.id)}
                className="btn btn-primary btn-sm"
                disabled={isConfirming}
              >
                {isConfirming ? "جارٍ التأكيد..." : buttonText}
              </button>
            )}
          </div>
        )}

        {isCompleted && (
          <span style={{ fontSize: "var(--font-size-xs)", color: "hsl(142,60%,30%)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
            <IconCheck size={12} strokeWidth={2.4} /> اكتمل الاسترجاع وأُغلق البلاغ بنجاح
          </span>
        )}
      </div>
    </div>
  );
}
