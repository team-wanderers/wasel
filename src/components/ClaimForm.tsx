"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClaimFormProps {
  itemType: "lost" | "found";
  itemId: string;
  counterpartId?: string | null;
  onSuccess?: (claimId: string, status: string, notes: string | null) => void;
}

export default function ClaimForm({ itemType, itemId, counterpartId, onSuccess }: ClaimFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: {
        itemType: "lost" | "found";
        itemId: string;
        lostItemId?: string;
        foundItemId?: string;
        proofDescription: string;
      } = {
        itemType,
        itemId,
        proofDescription: proof,
      };

      if (counterpartId) {
        if (itemType === "lost") {
          payload.foundItemId = counterpartId;
        } else {
          payload.lostItemId = counterpartId;
        }
      }

      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: { id?: string; status?: string; verificationNotes?: string | null; error?: string } = {};
      
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: `استجابة غير متوقعة من الخادم (${res.status})` };
        }
      }

      if (!res.ok) {
        setError(data.error || `حدث خطأ أثناء تقديم المطالبة (${res.status})`);
        return;
      }

      if (!data.id || !data.status) {
        setError("لم يتم استلام تأكيد صحيح من الخادم");
        return;
      }

      onSuccess?.(data.id, data.status, data.verificationNotes ?? null);
      setOpen(false);

      if (data.status === "verified") {
        router.push(`/dashboard/recoveries?claimId=${data.id}&action=schedule`);
      } else {
        router.push("/dashboard/claims");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاتصال بالخادم، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        {itemType === "found" ? "هذا ملكي — تقديم مطالبة" : "وجدت هذا الغرض — تقديم مطالبة"}
      </button>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-6)",
        background: "var(--color-bg-secondary)",
        marginTop: "var(--space-4)",
      }}
    >
      <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
        تقديم مطالبة لإثبات الملكية
      </h3>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        اذكر تفاصيل سرية تعرفها فقط عن هذا الغرض (الرقم التسلسلي، علامة مميزة، محتوى المحفظة...).
        لن تُشارَك إجابتك مع أي شخص آخر.
      </p>

      {error && (
        <div
          className="alert alert-error"
          style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)" }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="field">
          <label className="label" htmlFor="proof-desc">
            دليل إثبات الملكية *
          </label>
          <textarea
            id="proof-desc"
            className="textarea"
            rows={4}
            placeholder="مثال: يوجد خدش صغير على الزاوية اليسرى السفلية، والرقم التسلسلي يبدأ بـ SN-"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            required
            minLength={10}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setOpen(false); setError(""); setProof(""); }}
            disabled={loading}
          >
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || proof.length < 10}>
            {loading ? "جارٍ الإرسال..." : "إرسال المطالبة"}
          </button>
        </div>
      </form>
    </div>
  );
}
