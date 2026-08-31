"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconAlertTriangle } from "@/components/icons";

export interface MatchItem {
  id: string;
  score: number;
  status: "suggested" | "accepted" | "rejected" | "expired";
  lostUserConfirmedAt?: Date | string | null;
  foundUserConfirmedAt?: Date | string | null;
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
    status?: string;
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
    status?: string;
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

function isItemAdminBlocked(status?: string | null): boolean {
  if (!status) return false;
  return ["closed", "flagged", "rejected"].includes(status);
}

function isMatchAdminBlocked(m: MatchItem): boolean {
  return isItemAdminBlocked(m.lost?.status) || isItemAdminBlocked(m.found?.status);
}

function isMatchSuccessfullyRecovered(m: MatchItem): boolean {
  return m.status === "accepted" && m.recoveryStatus === "completed";
}

function isMatchSupersededByRecovery(m: MatchItem): boolean {
  if (isMatchSuccessfullyRecovered(m)) return false;
  return m.lost?.status === "recovered" || m.found?.status === "recovered";
}

function areBothItemsOpen(m: MatchItem): boolean {
  return (m.lost?.status ?? "open") === "open" && (m.found?.status ?? "open") === "open";
}

function MatchesManagerInner({ initialMatches, currentUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [matches, setMatches] = useState<MatchItem[]>(initialMatches);
  const [selectedTab, setSelectedTab] = useState<"suggested" | "accepted" | "closed" | "all" | null>(null);

  const activeTab: "suggested" | "accepted" | "closed" | "all" =
    selectedTab ??
    (tabParam === "accepted" || tabParam === "closed" || tabParam === "all" || tabParam === "suggested"
      ? tabParam
      : "suggested");

  const [running, setRunning] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const countSuggested = matches.filter(
    (m) => m.status === "suggested" && areBothItemsOpen(m)
  ).length;

  const countAccepted = matches.filter(
    (m) =>
      (m.status === "accepted" || (Boolean(m.lostUserConfirmedAt) && Boolean(m.foundUserConfirmedAt))) &&
      !isMatchAdminBlocked(m) &&
      !isMatchSuccessfullyRecovered(m) &&
      !isMatchSupersededByRecovery(m)
  ).length;

  const countClosed = matches.filter(
    (m) =>
      ["rejected", "expired"].includes(m.status) ||
      isMatchSuccessfullyRecovered(m) ||
      isMatchSupersededByRecovery(m) ||
      isMatchAdminBlocked(m)
  ).length;

  const filteredMatches = matches.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "suggested") {
      return m.status === "suggested" && areBothItemsOpen(m);
    }
    if (activeTab === "accepted") {
      return (
        (m.status === "accepted" || (Boolean(m.lostUserConfirmedAt) && Boolean(m.foundUserConfirmedAt))) &&
        !isMatchAdminBlocked(m) &&
        !isMatchSuccessfullyRecovered(m) &&
        !isMatchSupersededByRecovery(m)
      );
    }
    if (activeTab === "closed") {
      return (
        ["rejected", "expired"].includes(m.status) ||
        isMatchSuccessfullyRecovered(m) ||
        isMatchSupersededByRecovery(m) ||
        isMatchAdminBlocked(m)
      );
    }
    return true;
  });

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

      if (data.match) {
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, ...data.match } : m))
        );
      } else {
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
        );
      }

      if (newStatus === "accepted") {
        if (data.isDualConfirmed) {
          setSelectedTab("accepted");
          router.replace("/dashboard/matches?tab=accepted", { scroll: false });
          setMessage({
            type: "success",
            text: "تم تأكيد وقبول المطابقة بين الطرفين بنجاح! يرجى المتابعة لتقديم ومراجعة إثبات الملكية.",
          });
        } else {
          setSelectedTab("suggested");
          setMessage({
            type: "success",
            text: data.message || "✓ تم تأكيدك - بانتظار الطرف الآخر.",
          });
        }
      } else if (newStatus === "rejected") {
        setMessage({
          type: "success",
          text: data.message || "تم استبعاد المطابقة ووضع علامة مرفوض عليها.",
        });
      } else {
        setMessage({
          type: "success",
          text: data.message || "تمت إعادة المطابقة إلى قائمة المقترحات النشطة.",
        });
      }

      router.refresh();
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
      color = "hsl(200,80%,35%)";
      bg = "hsl(200,90%,92%)";
      label = "تطابق جيد";
    }

    return { pct, color, bg, label };
  }

  function formatDate(dateVal?: Date | string | null) {
    if (!dateVal) return "غير محدد";
    const d = new Date(dateVal);
    return d.toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>المطابقات الذكية</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            مراجعة وتأكيد المطابقات المكتشفة تلقائياً بناءً على الوصف، التصنيف، والموقع الجغرافي
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunScan}
          disabled={running}
          className="btn btn-outline btn-sm"
        >
          {running ? "جارٍ الفحص..." : "إعادة تشغيل الفحص الذكي"}
        </button>
      </div>

      {/* Global Message Banner */}
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
          onClick={() => setSelectedTab("suggested")}
          className={`btn btn-sm ${activeTab === "suggested" ? "btn-primary" : "btn-ghost"}`}
        >
          المقترحة والنشطة ({countSuggested})
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("accepted")}
          className={`btn btn-sm ${activeTab === "accepted" ? "btn-primary" : "btn-ghost"}`}
        >
          المقبولة ({countAccepted})
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("closed")}
          className={`btn btn-sm ${activeTab === "closed" ? "btn-primary" : "btn-ghost"}`}
        >
          المنتهية والمغلقة ({countClosed})
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("all")}
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
              : activeTab === "closed"
              ? "لا توجد مطابقات مغلقة أو منتهية"
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

            const isBlocked = isMatchAdminBlocked(m);
            const isSuccessRecovered = isMatchSuccessfullyRecovered(m);
            const isSuperseded = isMatchSupersededByRecovery(m);
            const isRejected = m.status === "rejected";
            const isSuggested = m.status === "suggested";
            const isAccepted = m.status === "accepted";

            const myConfirmed = isMyLost ? Boolean(m.lostUserConfirmedAt) : isMyFound ? Boolean(m.foundUserConfirmedAt) : false;
            const otherConfirmed = isMyLost ? Boolean(m.foundUserConfirmedAt) : isMyFound ? Boolean(m.lostUserConfirmedAt) : false;
            const isBothConfirmed = isAccepted || (Boolean(m.lostUserConfirmedAt) && Boolean(m.foundUserConfirmedAt));
            const isAwaitingOtherParty = myConfirmed && !otherConfirmed && !isBothConfirmed && isSuggested;
            const isAwaitingMyConfirmation = !myConfirmed && otherConfirmed && !isBothConfirmed && isSuggested;

            const isRecoveryActive = !isBlocked && !isSuccessRecovered && !isSuperseded && isBothConfirmed && m.recoveryStatus && ["scheduled", "in_progress", "deposited"].includes(m.recoveryStatus);
            const isClaimVerified = !isBlocked && !isSuccessRecovered && !isSuperseded && (m.claimStatus === "verified" || m.claimStatus === "approved") && !isRecoveryActive;
            const isClaimPending = !isBlocked && !isSuccessRecovered && !isSuperseded && m.claimStatus === "pending" && !isRecoveryActive;

            let statusInfo: { label: string; bg: string; color: string };
            if (isBlocked) {
              statusInfo = { label: "بلاغ مغلق", bg: "hsl(0, 0%, 90%)", color: "hsl(0, 0%, 40%)" };
            } else if (isSuccessRecovered) {
              statusInfo = { label: "تم الاسترجاع", bg: "var(--color-success-light)", color: "hsl(142, 60%, 25%)" };
            } else if (isSuperseded) {
              statusInfo = { label: "ملغية — تم استرجاع الغرض مسبقاً", bg: "hsl(0, 0%, 93%)", color: "hsl(0, 0%, 40%)" };
            } else if (isRejected) {
              statusInfo = { label: "مطابقة مرفوضة", bg: "hsl(0, 0%, 93%)", color: "hsl(0, 0%, 40%)" };
            } else if (m.status === "expired") {
              statusInfo = { label: "مطابقة منتهية", bg: "hsl(0, 0%, 93%)", color: "hsl(0, 0%, 40%)" };
            } else if (isBothConfirmed) {
              statusInfo = { label: "✓ تم قبول وتأكيد المطابقة بين الطرفين", bg: "var(--color-success-light)", color: "hsl(142, 60%, 25%)" };
            } else if (isAwaitingOtherParty) {
              statusInfo = { label: "تم تأكيدك - بانتظار الطرف الآخر", bg: "hsl(215, 90%, 95%)", color: "hsl(215, 90%, 35%)" };
            } else if (isAwaitingMyConfirmation) {
              statusInfo = { label: "بانتظار تأكيدك", bg: "hsl(35, 95%, 93%)", color: "hsl(35, 90%, 35%)" };
            } else {
              statusInfo = statusLabels[m.status] ?? statusLabels.suggested;
            }

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
                      درجة التطابق:
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 800,
                        background: scoreInfo.bg,
                        color: scoreInfo.color,
                      }}
                    >
                      {scoreInfo.label} ({Math.round(m.score * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Side-by-side Items Comparison */}
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
                            color: "hsl(0,70%,40%)",
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
                {isBlocked ? (
                  <div
                    style={{
                      padding: "var(--space-4) var(--space-5)",
                      background: "hsl(0, 0%, 97%)",
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        background: "hsl(0, 0%, 93%)",
                        border: "1px solid hsl(0, 0%, 82%)",
                        color: "hsl(0, 0%, 35%)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: 600,
                        width: "100%",
                      }}
                    >
                      <IconAlertTriangle size={18} style={{ color: "hsl(0, 0%, 40%)", flexShrink: 0 }} />
                      <span>تم إغلاق البلاغ المرتبط من قِبل الإدارة — تم إيقاف إجراءات الاسترجاع.</span>
                    </div>
                  </div>
                ) : isSuperseded ? (
                  <div
                    style={{
                      padding: "var(--space-4) var(--space-5)",
                      background: "hsl(0, 0%, 97%)",
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        background: "hsl(0, 0%, 93%)",
                        border: "1px solid hsl(0, 0%, 82%)",
                        color: "hsl(0, 0%, 40%)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: 500,
                        width: "100%",
                      }}
                    >
                      <span>تم استرجاع هذا الغرض مسبقاً — تم إيقاف هذا المقترح تلقائياً.</span>
                    </div>
                  </div>
                ) : (
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
                      ) : isSuccessRecovered ? (
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
                      ) : isClaimPending ? (
                        <span style={{ color: "hsl(200,60%,30%)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                          <span>⏳</span> {isMyLost ? "تم إرسال إثبات الملكية — بانتظار مراجعة الملتقط" : "تلقيت إثبات ملكية جديد — يرجى مراجعته واعتماده"}
                        </span>
                      ) : isBothConfirmed ? (
                        <span style={{ color: isMyFound ? "var(--color-text-secondary)" : "hsl(142,60%,25%)", fontWeight: 600 }}>
                          {isMyFound
                            ? "⏳ بانتظار قيام الفاقد بتقديم إثبات الملكية والعلامات المميزة للمراجعة."
                            : "✓ تم قبول وتأكيد المطابقة — يرجى تقديم إثبات الملكية"}
                        </span>
                      ) : isAwaitingOtherParty ? (
                        <span style={{ color: "hsl(215,90%,35%)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                          <span>✓</span> تم تأكيدك — بانتظار تأكيد الطرف الآخر
                        </span>
                      ) : isAwaitingMyConfirmation ? (
                        <span style={{ color: "hsl(35,90%,35%)", fontWeight: 600 }}>
                          قام الطرف الآخر بتأكيد المطابقة — بانتظار موافقتك
                        </span>
                      ) : (
                        <span>
                          هل هذا هو الغرض المطابق لبلاغك؟
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                      {/* 1. Rejected Match */}
                      {isRejected ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(m.id, "suggested")}
                          disabled={isLoading}
                          className="btn btn-outline btn-sm"
                        >
                          إعادة المطابقة للمقترحات النشطة
                        </button>
                      ) : isSuccessRecovered ? (
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
                          عرض تفاصيل الاستلام والرمز (OTP) ←
                        </Link>
                      ) : isClaimVerified ? (
                        /* 4. Verified Claim & Ready for Scheduling */
                        <Link
                          href={m.claimId ? `/dashboard/recoveries?claimId=${m.claimId}&action=schedule` : `/dashboard/recoveries?matchId=${m.id}&action=schedule`}
                          className="btn btn-primary btn-sm"
                        >
                          الانتقال لجدولة موعد الاستلام ←
                        </Link>
                      ) : isClaimPending ? (
                        /* 4.5. Claim Pending: loser sees status badge, finder sees review button */
                        <>
                          {isMyLost ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "hsl(200,60%,30%)",
                                background: "hsl(200,60%,96%)",
                                padding: "4px 10px",
                                borderRadius: "var(--radius-full)",
                                border: "1px solid hsl(200,60%,80%)",
                                fontWeight: 600,
                              }}
                            >
                              ⏳ تم إرسال إثبات الملكية — بانتظار مراجعة الملتقط
                            </span>
                          ) : (
                            <Link
                              href="/dashboard/claims"
                              className="btn btn-primary btn-sm"
                            >
                              مراجعة إثبات الملكية المقدم ←
                            </Link>
                          )}
                        </>
                      ) : isBothConfirmed ? (
                        /* 5. Both confirmed: loser sees "تقديم إثبات الملكية", finder sees "⏳ بانتظار قيام الفاقد بتقديم إثبات الملكية والعلامات المميزة للمراجعة." */
                        <>
                          {isMyLost ? (
                            <Link
                              href={`/items/found/${m.found.id}?matchId=${m.id}`}
                              className="btn btn-primary btn-sm"
                            >
                              تقديم إثبات الملكية (العلامات السرية) ←
                            </Link>
                          ) : (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                background: "var(--color-bg-secondary)",
                                padding: "6px 12px",
                                borderRadius: "var(--radius-full)",
                                border: "1px solid var(--color-border)",
                                fontWeight: 600,
                              }}
                            >
                              ⏳ بانتظار قيام الفاقد بتقديم إثبات الملكية والعلامات المميزة للمراجعة.
                            </span>
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
                      ) : isAwaitingOtherParty ? (
                        /* 6. Current user confirmed, waiting for other party */
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(m.id, "suggested")}
                            disabled={isLoading}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--color-text-muted)", fontSize: "12px" }}
                          >
                            {isLoading ? "جارٍ الحفظ..." : "تراجع عن التأكيد"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(m.id, "rejected")}
                            disabled={isLoading}
                            className="btn btn-outline btn-sm"
                            style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border)" }}
                          >
                            {isLoading ? "جارٍ الحفظ..." : "استبعاد المطابقة"}
                          </button>
                        </>
                      ) : (isAwaitingMyConfirmation || isSuggested) ? (
                        /* 7. Needs current user confirmation */
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MatchesManager(props: Props) {
  return (
    <Suspense fallback={<div className="card" style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--color-text-muted)" }}>جارٍ تحميل المطابقات...</div>}>
      <MatchesManagerInner {...props} />
    </Suspense>
  );
}
