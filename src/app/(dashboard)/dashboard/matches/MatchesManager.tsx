"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface MatchItem {
  id: string;
  score: number;
  status: "suggested" | "accepted" | "rejected" | "expired";
  createdAt: Date;
  lostTitle: string;
  lostId: string;
  lostUserId: string;
  foundTitle: string;
  foundId: string;
  foundUserId: string;
}

interface Props {
  initialMatches: MatchItem[];
  currentUserId: string;
}

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  suggested: { label: "مطابقة مقترحة", bg: "hsl(200,60%,92%)", color: "hsl(200,60%,30%)" },
  accepted:  { label: "تم القبول",      bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
  rejected:  { label: "مرفوض",         bg: "var(--color-bg-secondary)", color: "var(--color-text-muted)" },
  expired:   { label: "منتهي",         bg: "var(--color-bg-secondary)", color: "var(--color-text-muted)" },
};

function getMatchTier(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "تطابق قوي", color: "var(--color-success)" };
  if (pct >= 60) return { label: "تطابق محتمل", color: "hsl(38, 85%, 40%)" };
  return { label: "تطابق ضعيف", color: "var(--color-text-muted)" };
}

function getMatchReason(pct: number): string {
  if (pct >= 80) {
    return `تشابه عالٍ بين البلاغين في التصنيف والوصف مع تقارب جغرافي واضح. نسبة التطابق ${pct}% — يُنصح بمعاينة الغرض والتقدم بمطالبة.`;
  }
  if (pct >= 60) {
    return `تشابه جيد لكن غير مؤكد: بعض كلمات الوصف والموقع الجغرافي متقاربان. راجع الصور والتفاصيل جيدًا قبل تقديم المطالبة.`;
  }
  return `تشابه مبدئي فقط بنسبة ${pct}٪؛ قد لا يكون الغرضان متطابقين، ويُعتبر مؤشرًا أوليًا للمتابعة فقط.`;
}

export default function MatchesManager({ initialMatches, currentUserId }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "strong" | "review">("all");

  const strongCount = useMemo(
    () => initialMatches.filter((m) => Math.round(m.score * 100) >= 80).length,
    [initialMatches],
  );

  const reviewCount = useMemo(
    () =>
      initialMatches.filter((m) => {
        const p = Math.round(m.score * 100);
        return p >= 60 && p < 80;
      }).length,
    [initialMatches],
  );

  const filteredMatches = useMemo(() => {
    if (filter === "strong") {
      return initialMatches.filter((m) => Math.round(m.score * 100) >= 80);
    }
    if (filter === "review") {
      return initialMatches.filter((m) => {
        const p = Math.round(m.score * 100);
        return p >= 60 && p < 80;
      });
    }
    return initialMatches;
  }, [filter, initialMatches]);

  async function handleRunScan() {
    setRunning(true);
    setMessage(null);

    try {
      const res = await fetch("/api/match/run", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "فشل تشغيل فحص المطابقة" });
        return;
      }

      setMessage({
        type: "success",
        text: data.message || `اكتمل الفحص: تم العثور على ${data.inserted} مطابقة جديدة`,
      });

      // إعادة تحميل الصفحة لتحديث البيانات
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "حدث خطأ في الاتصال بالخادم" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>المطابقات الذكية المقترحة</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            نتائج محرك المطابقة بين بلاغات المفقودات والموجودات بحسب تشابه النصوص والتصنيف والموقع الجغرافي
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunScan}
          disabled={running}
          className="btn btn-outline btn-sm"
        >
          {running ? "جارٍ الفحص والمقارنة..." : "إعادة فحص وتحديث المطابقات"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-6)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            background: message.type === "success" ? "var(--color-success-light)" : "var(--color-danger-light)",
            color: message.type === "success" ? "hsl(142,60%,25%)" : "hsl(0,65%,35%)",
          }}
        >
          {message.text}
        </div>
      )}

      {initialMatches.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {[
            { label: "إجمالي التطابقات", value: initialMatches.length, color: "var(--color-text-primary)" },
            { label: "تطابقات قوية", value: strongCount, color: "var(--color-success)" },
            { label: "تحتاج مراجعة", value: reviewCount, color: "hsl(38, 85%, 40%)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {initialMatches.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
          {([
            { key: "all" as const, label: `الكل (${initialMatches.length})` },
            { key: "strong" as const, label: `تطابقات قوية (${strongCount})` },
            { key: "review" as const, label: `قيد المراجعة (${reviewCount})` },
          ]).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`btn btn-sm ${filter === option.key ? "btn-primary" : "btn-ghost"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {initialMatches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            لا توجد مطابقات مقترحة لبلاغاتك حالياً
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            يقوم محرك المطابقة بمقارنة البلاغات دورياً وعند إضافة أي بلاغ جديد.
          </p>
          <button
            type="button"
            onClick={handleRunScan}
            disabled={running}
            className="btn btn-primary"
          >
            {running ? "جارٍ الفحص..." : "تشغيل فحص يدوي الآن"}
          </button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
          <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-muted)" }}>
            لا توجد مطابقات ضمن هذا التصنيف
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {filteredMatches.map((m) => {
            const s = statusLabels[m.status] ?? statusLabels.suggested;
            const pct = Math.round(m.score * 100);
            const tier = getMatchTier(pct);
            const isMyLost = m.lostUserId === currentUserId;

            return (
              <div key={m.id} className="card" style={{ borderRight: `4px solid ${tier.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "var(--space-1) var(--space-3)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        background: s.bg,
                        color: s.color,
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      {s.label}
                    </span>

                    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap", marginTop: "var(--space-1)" }}>
                      <div>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                          بلاغ المفقود:
                        </span>{" "}
                        <Link href={`/items/lost/${m.lostId}`} style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                          {m.lostTitle}
                        </Link>
                      </div>

                      <span style={{ color: "var(--color-text-muted)", fontWeight: 700 }}>⟷</span>

                      <div>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                          بلاغ المعثور عليه:
                        </span>{" "}
                        <Link href={`/items/found/${m.foundId}`} style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                          {m.foundTitle}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", minWidth: "90px" }}>
                    <div
                      style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: 700,
                        color: tier.color,
                        lineHeight: 1.1,
                      }}
                    >
                      {pct}%
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                      نسبة التطابق
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "var(--space-4)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <span>قوة التطابق</span>
                    <span style={{ fontWeight: 700, color: tier.color }}>{tier.label}</span>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      background: "var(--color-bg-secondary)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: tier.color,
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary-dark)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3) var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                    lineHeight: 1.7,
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <strong>لماذا ظهر هذا التطابق؟ </strong>
                  {getMatchReason(pct)}
                </div>

                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    تاريخ المطابقة: {new Date(m.createdAt).toLocaleDateString("ar-YE")}
                  </div>

                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    {isMyLost ? (
                      <Link
                        href={`/items/found/${m.foundId}?matchId=${m.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        معاينة الغرض وتقديم مطالبة
                      </Link>
                    ) : (
                      <Link
                        href={`/items/lost/${m.lostId}`}
                        className="btn btn-primary btn-sm"
                      >
                        معاينة بلاغ المفقود
                      </Link>
                    )}
                    <Link
                      href={isMyLost ? `/items/lost/${m.lostId}` : `/items/found/${m.foundId}`}
                      className="btn btn-ghost btn-sm"
                    >
                      عرض بلاغي
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
