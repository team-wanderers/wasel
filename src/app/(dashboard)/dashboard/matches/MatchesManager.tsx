"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface MatchItem {
  id: string;
  score: number;
  status: "suggested" | "accepted" | "rejected" | "expired";
  createdAt: Date | string;
  claimId?: string | null;
  claimStatus?: string | null;
  recoveryId?: string | null;
  recoveryStatus?: "scheduled" | "in_progress" | "deposited" | "completed" | "cancelled" | null;
  lost: {
    id: string;
    title: string;
    description: string;
    category: string;
    lat: number | null;
    lng: number | null;
    lostAt: Date | string | null;
    userId: string;
    image: string | null;
  };
  found: {
    id: string;
    title: string;
    description: string;
    category: string;
    lat: number | null;
    lng: number | null;
    foundAt: Date | string | null;
    userId: string;
    image: string | null;
  };
}

interface Props {
  initialMatches: MatchItem[];
  currentUserId: string;
}

const categoryLabels: Record<string, string> = {
  documents: "وثائق ومستندات",
  electronics: "أجهزة وإلكترونيات",
  keys: "مفاتيح",
  bags: "حقائب ومحافظ",
  jewelry: "مجوهرات وساعات",
  pets: "حيوانات أليفة",
  other: "أخرى",
};

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  suggested: { label: "مطابقة مقترحة", bg: "hsl(200,60%,92%)", color: "hsl(200,60%,30%)" },
  accepted:  { label: "تم القبول",      bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
  rejected:  { label: "مرفوضة",         bg: "var(--color-bg-secondary)", color: "var(--color-text-muted)" },
  expired:   { label: "منتهية",         bg: "var(--color-bg-secondary)", color: "var(--color-text-muted)" },
};

function getValidImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // data URL
  if (trimmed.startsWith("data:image/")) return trimmed;

  // Absolute URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  // Root-relative path
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Relative upload path
  if (trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }

  if (/^[a-zA-Z0-9_\-./]+$/.test(trimmed)) {
    return `/${trimmed}`;
  }

  return null;
}

export default function MatchesManager({ initialMatches, currentUserId }: Props) {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [activeTab, setActiveTab] = useState<"suggested" | "accepted" | "rejected" | "all">("suggested");
  const [running, setRunning] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredMatches = matches.filter((m) => {
    if (activeTab === "all") return true;
    return m.status === activeTab;
  });

  const countSuggested = matches.filter((m) => m.status === "suggested").length;
  const countAccepted = matches.filter((m) => m.status === "accepted").length;
  const countRejected = matches.filter((m) => m.status === "rejected").length;

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

      router.refresh();
    } catch {
      setMessage({ type: "error", text: "حدث خطأ في الاتصال بالخادم" });
    } finally {
      setRunning(false);
    }
  }

  async function handleUpdateStatus(matchId: string, newStatus: "suggested" | "accepted" | "rejected") {
    setActionLoading(matchId);
    setMessage(null);

    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "فشل تحديث حالة المطابقة" });
        return;
      }

      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
      );

      const targetMatch = matches.find((m) => m.id === matchId);

      if (newStatus === "accepted") {
        setMessage({
          type: "success",
          text: "تم تأكيد وقبول المطابقة بنجاح! جارٍ تحويلك لتقديم إثبات الملكية...",
        });

        // إذا كان المستخدم هو صاحب المفقود، توجيهه مباشرة إلى صفحة تفاصيل الغرض المعثور عليه لإدخال إثبات الملكية
        if (targetMatch && targetMatch.lost.userId === currentUserId) {
          router.push(`/items/found/${targetMatch.found.id}?matchId=${targetMatch.id}`);
        } else if (targetMatch && targetMatch.found.userId === currentUserId) {
          router.push("/dashboard/recoveries");
        }
      } else if (newStatus === "rejected") {
        setMessage({
          type: "success",
          text: "تم استبعاد المطابقة ووضع علامة مرفوض عليها.",
        });
      } else {
        setMessage({
          type: "success",
          text: "تمت إعادة المطابقة إلى قائمة المقترحات النشطة.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "حدث خطأ أثناء الاتصال بالخادم" });
    } finally {
      setActionLoading(null);
    }
  }

  function getScoreBadge(score: number) {
    const pct = Math.round(score * 100);
    let color = "var(--color-success)";
    let bg = "var(--color-success-light)";
    let label = "تطابق عالي جداً";

    if (pct < 65) {
      color = "var(--color-warning)";
      bg = "hsl(38,90%,92%)";
      label = "تطابق محتمل";
    } else if (pct < 80) {
      color = "var(--color-primary)";
      bg = "var(--color-primary-light)";
      label = "تطابق جيد";
    }

    return { pct, color, bg, label };
  }

  function formatDate(d: Date | string | null) {
    if (!d) return "غير محدد";
    return new Date(d).toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>المطابقات الذكية المقترحة</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            مراجعة ومقارنة البلاغات المتطابقة بناءً على خوارزميات التشابه الذكي وقبولها أو رفضها
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
            border: `1px solid ${message.type === "success" ? "hsl(142,60%,35%)33" : "hsl(0,65%,35%)33"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("suggested")}
          className={`btn btn-sm ${activeTab === "suggested" ? "btn-primary" : "btn-ghost"}`}
        >
          المقترحة والنشطة ({countSuggested})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accepted")}
          className={`btn btn-sm ${activeTab === "accepted" ? "btn-primary" : "btn-ghost"}`}
        >
          المقبولة ({countAccepted})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`btn btn-sm ${activeTab === "rejected" ? "btn-primary" : "btn-ghost"}`}
        >
          المرفوضة ({countRejected})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`btn btn-sm ${activeTab === "all" ? "btn-primary" : "btn-ghost"}`}
        >
          كافة المطابقات ({matches.length})
        </button>
      </div>

      {/* Empty State */}
      {filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            {activeTab === "suggested"
              ? "لا توجد مطابقات مقترحة جديدة بانتظار مراجعتك حالياً"
              : activeTab === "accepted"
              ? "لا توجد مطابقات مقبولة حالياً"
              : activeTab === "rejected"
              ? "لا توجد مطابقات مرفوضة"
              : "لا توجد مطابقات مسجلة"}
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            يقوم محرك المطابقة بمقارنة البلاغات دورياً عند إضافة أو تعديل أي بلاغ
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
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {filteredMatches.map((m) => {
            const scoreInfo = getScoreBadge(m.score);
            const isMyLost = m.lost.userId === currentUserId;
            const isMyFound = m.found.userId === currentUserId;
            const isLoading = actionLoading === m.id;

            const isRejected = m.status === "rejected";
            const isSuggested = m.status === "suggested";
            const isAccepted = m.status === "accepted";
            const isThisMatchRecovered = isAccepted && m.recoveryStatus === "completed";
            const isRecoveryActive = isAccepted && m.recoveryStatus && ["scheduled", "in_progress", "deposited"].includes(m.recoveryStatus);
            const isClaimVerified = isAccepted && m.claimStatus === "verified" && !isThisMatchRecovered && !isRecoveryActive;

            const statusInfo = isThisMatchRecovered
              ? { label: "تم الاسترجاع", bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" }
              : statusLabels[m.status] ?? statusLabels.suggested;

            return (
              <div
                key={m.id}
                className="card"
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 0,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Top Banner / Match Score */}
                <div
                  style={{
                    padding: "var(--space-3) var(--space-5)",
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "var(--space-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 700,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      تاريخ الاقتراح: {formatDate(m.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        color: scoreInfo.color,
                      }}
                    >
                      {scoreInfo.label}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-md)",
                        background: scoreInfo.bg,
                        color: scoreInfo.color,
                        fontWeight: 800,
                        fontSize: "var(--font-size-sm)",
                      }}
                    >
                      {scoreInfo.pct}% تطابق
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Visual Comparison Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "1px",
                    background: "var(--color-border)",
                  }}
                >
                  {/* Lost Item Card */}
                  <div style={{ background: "#fff", padding: "var(--space-5)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                        <span
                          style={{
                            fontSize: "var(--font-size-xs)",
                            fontWeight: 700,
                            color: "hsl(0,65%,40%)",
                            background: "var(--color-danger-light)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          بلاغ المفقود
                        </span>
                        {isMyLost && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--color-primary)",
                              background: "var(--color-primary-light)",
                              padding: "1px 6px",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            بلاغك الشخصي
                          </span>
                        )}
                      </div>

                      {/* Image Thumbnail */}
                      <div
                        style={{
                          width: "100%",
                          height: "140px",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--color-bg-secondary)",
                          position: "relative",
                          marginBottom: "var(--space-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {(() => {
                          const lostImageUrl = getValidImageUrl(m.lost.image);
                          if (lostImageUrl) {
                            return (
                              <Image
                                src={lostImageUrl}
                                alt={m.lost.title}
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="(max-width: 768px) 100vw, 300px"
                              />
                            );
                          }
                          return (
                            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto var(--space-1) auto", display: "block" }}>
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                              </svg>
                              لا توجد صورة مرفقة
                            </div>
                          );
                        })()}
                      </div>

                      <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: "0 0 var(--space-1) 0" }}>
                        {m.lost.title}
                      </h3>

                      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                          التصنيف:
                        </span>
                        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                          {categoryLabels[m.lost.category] ?? m.lost.category}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: "var(--space-3)",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {m.lost.description}
                      </p>
                    </div>

                    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-2)", fontSize: "11px", color: "var(--color-text-muted)", display: "flex", justifyContent: "space-between" }}>
                      <span>تاريخ الفقد: {formatDate(m.lost.lostAt)}</span>
                      <Link href={`/items/lost/${m.lost.id}`} className="hover:underline" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                        عرض البلاغ ←
                      </Link>
                    </div>
                  </div>

                  {/* Found Item Card */}
                  <div style={{ background: "#fff", padding: "var(--space-5)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                        <span
                          style={{
                            fontSize: "var(--font-size-xs)",
                            fontWeight: 700,
                            color: "hsl(142,60%,25%)",
                            background: "var(--color-success-light)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          بلاغ المعثور عليه
                        </span>
                        {isMyFound && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--color-primary)",
                              background: "var(--color-primary-light)",
                              padding: "1px 6px",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            بلاغك الشخصي
                          </span>
                        )}
                      </div>

                      {/* Image Thumbnail */}
                      <div
                        style={{
                          width: "100%",
                          height: "140px",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--color-bg-secondary)",
                          position: "relative",
                          marginBottom: "var(--space-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {(() => {
                          const foundImageUrl = getValidImageUrl(m.found.image);
                          if (foundImageUrl) {
                            return (
                              <Image
                                src={foundImageUrl}
                                alt={m.found.title}
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="(max-width: 768px) 100vw, 300px"
                              />
                            );
                          }
                          return (
                            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto var(--space-1) auto", display: "block" }}>
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                              </svg>
                              لا توجد صورة مرفقة
                            </div>
                          );
                        })()}
                      </div>

                      <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: "0 0 var(--space-1) 0" }}>
                        {m.found.title}
                      </h3>

                      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                          التصنيف:
                        </span>
                        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600 }}>
                          {categoryLabels[m.found.category] ?? m.found.category}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: "var(--space-3)",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {m.found.description}
                      </p>
                    </div>

                    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-2)", fontSize: "11px", color: "var(--color-text-muted)", display: "flex", justifyContent: "space-between" }}>
                      <span>تاريخ العثور: {formatDate(m.found.foundAt)}</span>
                      <Link href={`/items/found/${m.found.id}`} className="hover:underline" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                        عرض المعثور عليه ←
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Interactive Action Toolbar */}
                <div
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    background: "#fff",
                    borderTop: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                  }}
                >
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {isRejected ? (
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
                        ✕ تم استبعاد هذه المطابقة
                      </span>
                    ) : isThisMatchRecovered ? (
                      <span style={{ color: "hsl(142,60%,25%)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <span>✓</span> تم الاسترجاع وإغلاق البلاغ بنجاح
                      </span>
                    ) : isRecoveryActive ? (
                      <span style={{ color: "hsl(215,90%,35%)", fontWeight: 600 }}>
                        {m.recoveryStatus === "deposited"
                          ? "الغرض مودع في نقطة الأمانة وبانتظار استلام المالك"
                          : "تمت جدولة موعد الاستلام والتسليم"}
                      </span>
                    ) : isClaimVerified ? (
                      <span style={{ color: "hsl(142,60%,25%)", fontWeight: 600 }}>
                        ✓ تم إثبات وتوثيق الملكية بنجاح — جاهز للجدولة
                      </span>
                    ) : isAccepted ? (
                      <span style={{ color: "hsl(142,60%,25%)", fontWeight: 600 }}>
                        ✓ تم قبول هذه المطابقة وتأكيدها بين الطرفين
                      </span>
                    ) : (
                      <span>
                        هل هذا هو الغرض المطابق لبلاغك؟
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    {/* 1. Rejected Match - No scheduling or recovery buttons ever */}
                    {isRejected ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(m.id, "suggested")}
                        disabled={isLoading}
                        className="btn btn-outline btn-sm"
                      >
                        إعادة المطابقة للمقترحات النشطة
                      </button>
                    ) : isThisMatchRecovered ? (
                      /* 2. Recovery Completed */
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "hsl(142,60%,25%)",
                          background: "var(--color-success-light)",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                          border: "1px solid hsl(142,60%,35%)33",
                        }}
                      >
                        ✓ تم الاسترجاع بنجاح
                      </span>
                    ) : isRecoveryActive ? (
                      /* 3. Active Recovery / Scheduled */
                      <Link
                        href="/dashboard/recoveries"
                        className="btn btn-primary btn-sm"
                      >
                        متابعة حالة التسليم ←
                      </Link>
                    ) : isClaimVerified ? (
                      /* 4. Verified Claim & Ready for Scheduling */
                      <Link
                        href={m.claimId ? `/dashboard/recoveries?claimId=${m.claimId}&action=schedule` : "/dashboard/recoveries?action=schedule"}
                        className="btn btn-primary btn-sm"
                      >
                        جدولة موعد الاستلام ←
                      </Link>
                    ) : isAccepted ? (
                      /* 5. Accepted but Claim Not Yet Verified */
                      <>
                        {isMyLost ? (
                          <Link
                            href={`/items/found/${m.found.id}?matchId=${m.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            متابعة تقديم إثبات الملكية ←
                          </Link>
                        ) : (
                          <Link
                            href="/dashboard/recoveries"
                            className="btn btn-primary btn-sm"
                          >
                            الانتقال لجدولة التسليم ←
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(m.id, "rejected")}
                          disabled={isLoading}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-text-muted)", fontSize: "11px" }}
                        >
                          تراجع وإلغاء القبول
                        </button>
                      </>
                    ) : isSuggested ? (
                      /* 6. Suggested Match */
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(m.id, "rejected")}
                          disabled={isLoading}
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
                        >
                          {isLoading ? "جارٍ الحفظ..." : "ليس هذا الغرض / استبعاد"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(m.id, "accepted")}
                          disabled={isLoading}
                          className="btn btn-primary btn-sm"
                        >
                          {isLoading ? "جارٍ الحفظ..." : "تأكيد وقبول المطابقة ✓"}
                        </button>
                      </>
                    ) : null}
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
