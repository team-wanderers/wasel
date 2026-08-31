"use client";

import { useState } from "react";
import { IconClose } from "@/components/icons";

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  workingHours: string | null;
}

export interface VerifiedClaim {
  id: string;
  itemTitle: string;
  matchId?: string | null;
  lostItemId: string | null;
  foundItemId: string | null;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePickupPoints: PickupPoint[];
  verifiedClaims: VerifiedClaim[];
  defaultClaimId?: string;
  existingRecoveryId?: string;
  defaultPickupPointId?: string;
  defaultDate?: string;
  defaultNotes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (message: string, updatedRecovery?: any) => void;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  availablePickupPoints,
  verifiedClaims,
  defaultClaimId,
  existingRecoveryId,
  defaultPickupPointId,
  defaultDate,
  defaultNotes,
  onSuccess,
}: ScheduleModalProps) {
  const [selectedClaimId, setSelectedClaimId] = useState(defaultClaimId || verifiedClaims[0]?.id || "");
  const [selectedPickupPointId, setSelectedPickupPointId] = useState(defaultPickupPointId || availablePickupPoints[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(defaultDate ? defaultDate.split("T")[0] : "");
  const [period, setPeriod] = useState<"morning" | "evening">(() => {
    return defaultNotes && defaultNotes.includes("المسائية") ? "evening" : "morning";
  });
  const [notes, setNotes] = useState(() => {
    return defaultNotes ? defaultNotes.replace(/\[تفضيل الوقت: [^\]]+\]\s*/, "") : "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClaimId && !existingRecoveryId) {
      setError("يرجى اختيار مطالبة معتمدة للجدولة");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // بناء التاريخ والوقت بناءً على الفترة المختارة بدقة
      let scheduledAt: string | null = null;
      if (selectedDate) {
        const timeStr = period === "morning" ? "10:00:00" : "17:00:00";
        scheduledAt = new Date(`${selectedDate}T${timeStr}`).toISOString();
      }

      const periodNote = period === "morning" ? "الفترة الصباحية (8:00 ص - 12:00 م)" : "الفترة المسائية (4:00 م - 8:30 م)";
      const fullNotes = notes.trim()
        ? `[تفضيل الوقت: ${periodNote}] ${notes.trim()}`
        : `[تفضيل الوقت: ${periodNote}]`;

      const endpoint = existingRecoveryId
        ? `/api/recoveries/${existingRecoveryId}`
        : "/api/recoveries";

      const method = existingRecoveryId ? "PATCH" : "POST";

      const payload = existingRecoveryId
        ? {
            pickupPointId: selectedPickupPointId || null,
            scheduledAt,
            notes: fullNotes,
          }
        : {
            claimId: selectedClaimId,
            pickupPointId: selectedPickupPointId || null,
            scheduledAt,
            notes: fullNotes,
          };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل حفظ موعد الجدولة");
        return;
      }

      onSuccess(
        existingRecoveryId ? "تم تحديث موعد الاستلام بنجاح" : "تمت جدولة موعد ونقطة الاستلام بنجاح، وتوليد رمز الاستلام",
        data
      );
      onClose();
    } catch {
      setError("حدث خطأ أثناء الجدولة، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const activePoint = availablePickupPoints.find((p) => p.id === selectedPickupPointId);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          border: "2px solid var(--color-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, margin: 0 }}>
            {existingRecoveryId ? "طلب وتعديل موعد الاستلام" : "جدولة موعد ونقطة الاستلام"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              lineHeight: 1,
              display: "inline-flex",
              padding: "0.2rem",
            }}
          >
            <IconClose size={18} />
          </button>
        </div>

        {error && (
          <div
            className="alert alert-error"
            style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {!existingRecoveryId && (
            <div className="field">
              <label className="label" htmlFor="modal-rec-claim">
                المطالبة المعتمدة المراد جدولتها *
              </label>
              <select
                id="modal-rec-claim"
                className="input"
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                required
              >
                {verifiedClaims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.itemTitle}
                  </option>
                ))}
                {defaultClaimId && !verifiedClaims.some((c) => c.id === defaultClaimId) && (
                  <option key={defaultClaimId} value={defaultClaimId}>
                    المطالبة المحددة
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="modal-rec-point">
              نقطة الاستلام / مركز الأمانة
            </label>
            <select
              id="modal-rec-point"
              className="input"
              value={selectedPickupPointId}
              onChange={(e) => setSelectedPickupPointId(e.target.value)}
            >
              <option value="">-- اختر نقطة أمانة معتمدة --</option>
              {availablePickupPoints.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.address}
                </option>
              ))}
            </select>
          </div>

          {/* معلومات ساعات العمل للمركز */}
          {activePoint && (
            <div
              style={{
                padding: "var(--space-3)",
                background: "hsl(200,60%,96%)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-xs)",
                border: "1px solid hsl(200,60%,80%)",
                color: "hsl(200,60%,25%)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "var(--space-1)" }}>
                ساعات عمل المركز المعتمدة ({activePoint.name}):
              </div>
              {activePoint.workingHours ? (
                <div>{activePoint.workingHours}</div>
              ) : (
                <div>لم تُحدد ساعات عمل لهذا المركز بعد — يرجى التواصل قبل الحضور</div>
              )}
              {activePoint.phone && <div style={{ marginTop: "var(--space-1)" }}>رقم التواصل: {activePoint.phone}</div>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div className="field">
              <label className="label" htmlFor="modal-rec-date">
                اليوم المقترح *
              </label>
              <input
                id="modal-rec-date"
                type="date"
                className="input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">الفترة المفضلة *</label>
              <div style={{ display: "flex", gap: "var(--space-2)", height: "40px" }}>
                <button
                  type="button"
                  onClick={() => setPeriod("morning")}
                  className={`btn btn-sm ${period === "morning" ? "btn-primary" : "btn-outline"}`}
                  style={{ flex: 1 }}
                >
                  صباحية (8-12 ص)
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("evening")}
                  className={`btn btn-sm ${period === "evening" ? "btn-primary" : "btn-outline"}`}
                  style={{ flex: 1 }}
                >
                  مسائية (4-8:30 م)
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="modal-rec-notes">
              ملاحظات أو رسالة للطرف الآخر
            </label>
            <textarea
              id="modal-rec-notes"
              className="textarea"
              rows={2}
              placeholder="مثال: يرجى إحضار إثبات الهوية عند التوجه لنقطة الأمانة"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "جارٍ الحفظ..." : existingRecoveryId ? "حفظ الموعد البديل" : "تأكيد الجدولة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
