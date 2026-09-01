"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IconShield, IconCheck, IconClose, IconAlertTriangle } from "@/components/icons";
import Toast from "@/components/Toast";

export interface ClaimItem {
  id: string;
  status: "pending" | "verified" | "rejected" | "cancelled";
  proofDescription: string | null;
  verificationNotes: string | null;
  createdAt: Date | string;
  claimantId: string;
  claimantName: string | null;
  claimantEmail: string | null;
  lostTitle: string | null;
  lostId: string | null;
  lostStatus?: string | null;
  lostUserId: string | null;
  foundTitle: string | null;
  foundId: string | null;
  foundStatus?: string | null;
  foundUserId: string | null;
  recoveryId?: string | null;
  recoveryStatus?: "scheduled" | "in_progress" | "deposited" | "completed" | "cancelled" | null;
}

function isItemAdminBlocked(status?: string | null): boolean {
  if (!status) return false;
  return ["closed", "flagged", "rejected"].includes(status);
}

interface Props {
  initialClaims: ClaimItem[];
  currentUserId: string;
}

const statusDisplay: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "قيد المراجعة والتحقق", color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
  verified:  { label: "معتمد ومثبَّت", color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  rejected:  { label: "مرفوض",       color: "hsl(0,65%,35%)",   bg: "var(--color-danger-light)" },
  cancelled: { label: "ملغى",        color: "var(--color-text-muted)", bg: "var(--color-bg-secondary)" },
};

function ClaimsManagerInner({ initialClaims, currentUserId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [claimsList, setClaimsList] = useState<ClaimItem[]>(initialClaims);

  const activeTab: "incoming" | "outgoing" | "all" =
    tabParam === "outgoing" || tabParam === "incoming" || tabParam === "all"
      ? tabParam
      : "incoming";

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const incomingClaims = claimsList.filter(
    (c) =>
      c.claimantId !== currentUserId &&
      ((c.foundUserId && c.foundUserId === currentUserId) ||
        (c.lostUserId && c.lostUserId === currentUserId))
  );

  const outgoingClaims = claimsList.filter((c) => c.claimantId === currentUserId);

  const displayedClaims =
    activeTab === "incoming"
      ? incomingClaims
      : activeTab === "outgoing"
      ? outgoingClaims
      : claimsList;

  const countPendingIncoming = incomingClaims.filter((c) => c.status === "pending").length;

  async function handleReview(claimId: string, newStatus: "verified" | "rejected") {
    setActionLoading(claimId);
    setMessage(null);

    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "فشل تحديث حالة المطالبة" });
        return;
      }

      setClaimsList((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status: newStatus } : c))
      );

      setMessage({
        type: "success",
        text:
          newStatus === "verified"
            ? "تم قبول إثبات الملكية واعتماده بنجاح! يمكنك الآن الانتقال لجدولة موعد الاستلام."
            : "تم رفض المطالبة وإشعار مقدِّم الطلب.",
      });

      router.refresh();
    } catch {
      setMessage({ type: "error", text: "حدث خطأ أثناء الاتصال بالخادم" });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconShield size={22} />
              <span>مطالبات إثبات الملكية</span>
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              مراجعة إثباتات الملكية الواردة والصادرة ومتابعة حالتها
            </p>
          </div>

          <Link href="/search" className="btn btn-outline btn-sm">
            البحث في البلاغات
          </Link>
        </div>
      </div>

      {message && (
        <Toast
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-6)",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => {
            router.replace("/dashboard/claims?tab=incoming", { scroll: false });
          }}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "incoming" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "incoming" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "incoming" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <span>الواردة</span>
          <span
            style={{
              padding: "1px 8px",
              borderRadius: "var(--radius-full)",
              fontSize: "11px",
              background: countPendingIncoming > 0 ? "var(--color-primary)" : "var(--color-bg-secondary)",
              color: countPendingIncoming > 0 ? "#fff" : "var(--color-text-muted)",
              fontWeight: 700,
            }}
          >
            {incomingClaims.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            router.replace("/dashboard/claims?tab=outgoing", { scroll: false });
          }}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "outgoing" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "outgoing" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "outgoing" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          <span>الصادرة</span>
          <span
            style={{
              padding: "1px 8px",
              borderRadius: "var(--radius-full)",
              fontSize: "11px",
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-muted)",
            }}
          >
            {outgoingClaims.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            router.replace("/dashboard/claims?tab=all", { scroll: false });
          }}
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: activeTab === "all" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "all" ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === "all" ? 700 : 500,
            fontSize: "var(--font-size-sm)",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <span>الكل ({claimsList.length})</span>
        </button>
      </div>

      {/* List */}
      {displayedClaims.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            {activeTab === "incoming"
              ? "لا توجد مطالبات واردة بانتظار مراجعتك حالياً"
              : activeTab === "outgoing"
              ? "لم تقم بتقديم أي مطالبات حتى الآن"
              : "لا توجد أي مطالبات مسجلة"}
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            {activeTab === "incoming"
              ? "عندما يقدم فاقد مطالبة بإثبات ملكية على غرض نشرته، ستظهر بياناته ودليله هنا لمراجعته واعتماده."
              : "عند العثور على غرضك في قائمة المعثورات وتقديم دليل الملكية، يمكنك متابعة حالته هنا."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {displayedClaims.map((row) => {
            const isBlocked = isItemAdminBlocked(row.foundStatus) || isItemAdminBlocked(row.lostStatus);
            const isCompleted = row.recoveryStatus === "completed";
            let s = statusDisplay[row.status] ?? statusDisplay.pending;
            if (isBlocked) {
              s = { label: "بلاغ مغلق إدارياً", color: "hsl(0, 0%, 40%)", bg: "hsl(0, 0%, 90%)" };
            } else if (isCompleted) {
              s = { label: "✓ تم الاستلام والاسترجاع (مغلق)", color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" };
            }

            const isIncoming =
              row.claimantId !== currentUserId &&
              ((row.foundUserId && row.foundUserId === currentUserId) ||
                (row.lostUserId && row.lostUserId === currentUserId));
            const itemTitle = row.foundTitle ?? row.lostTitle ?? "غرض غير محدد";
            const itemType = row.foundId ? "found" : "lost";
            const itemId = row.foundId ?? row.lostId;
            const isLoading = actionLoading === row.id;

            return (
              <div
                key={row.id}
                className="card"
                style={{
                  border: isBlocked
                    ? "1px solid hsl(0, 0%, 80%)"
                    : isIncoming && row.status === "pending"
                    ? "1px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  boxShadow: isIncoming && row.status === "pending" && !isBlocked ? "var(--shadow-sm)" : "none",
                  opacity: isBlocked ? 0.9 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
    <div style={{ maxWidth: "1000px", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          background: isIncoming ? "var(--color-primary-light)" : "var(--color-bg-secondary)",
                          color: isIncoming ? "var(--color-primary)" : "var(--color-text-secondary)",
                        }}
                      >
                        {isIncoming ? "مطالبة واردة على بلاغك" : "مطالبة صادرة من قِبلك"}
                      </span>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                        {row.foundId ? "معثور عليه" : "مفقود"}
                      </span>
                    </div>

                    <div style={{ fontSize: "var(--font-size-base)", fontWeight: 700 }}>
                      {itemTitle}
                    </div>

                    {isIncoming && row.claimantName && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
                        مقدَّم المطالبة (الفاقد): <strong>{row.claimantName}</strong>
                        {row.claimantEmail && ` (${row.claimantEmail})`}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      padding: "var(--space-1) var(--space-3)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 700,
                      background: s.bg,
                      color: s.color,
                      border: `1px solid ${s.color}33`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Admin Block Alert Banner */}
                {isBlocked && (
                  <div
                    style={{
                      margin: "var(--space-3) 0",
                      padding: "var(--space-3) var(--space-4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      fontSize: "var(--font-size-sm)",
                      color: "hsl(35, 90%, 25%)",
                      background: "hsl(35, 95%, 93%)",
                      border: "1px solid hsl(35, 90%, 80%)",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 600,
                    }}
                  >
                    <IconAlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>⚠️ تم إغلاق هذا البلاغ من قِبل الإدارة — تم إيقاف إجراءات المطالبة والجدولة.</span>
                  </div>
                )}

                {/* Proof Description Box */}
                {row.proofDescription && (
                  <div
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-bg-secondary)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>
                      دليل إثبات الملكية المكتوب:
                    </div>
                    <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", lineHeight: 1.7, margin: 0 }}>
                      &quot;{row.proofDescription}&quot;
                    </p>
                  </div>
                )}

                {row.verificationNotes && (
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-3)",
                      padding: "var(--space-2) var(--space-3)",
                      background: "#fff",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    ملاحظات التحقق: {row.verificationNotes}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "var(--space-3)",
                    paddingTop: "var(--space-3)",
                    borderTop: "1px solid var(--color-border)",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    تاريخ التقديم: {new Date(row.createdAt).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" })}
                  </span>

                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    {isBlocked ? (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "hsl(0, 0%, 40%)",
                          background: "hsl(0, 0%, 90%)",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        موقوفة إدارياً
                      </span>
                    ) : (
                      <>
                        {/* Action buttons for Incoming Pending Claim */}
                        {isIncoming && row.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReview(row.id, "rejected")}
                              disabled={isLoading}
                              className="btn btn-outline btn-sm"
                              style={{ color: "hsl(0,65%,35%)", borderColor: "hsl(0,65%,80%)" }}
                            >
                              <IconClose size={14} />
                              <span>{isLoading ? "جارٍ الحفظ..." : "رفض"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReview(row.id, "verified")}
                              disabled={isLoading}
                              className="btn btn-primary btn-sm"
                            >
                              <IconCheck size={14} />
                              <span>{isLoading ? "جارٍ الحفظ..." : "قبول"}</span>
                            </button>
                          </>
                        )}

                        {row.status === "verified" && (
                          isCompleted ? (
                            <span
                              className="btn btn-sm"
                              style={{
                                color: "hsl(142,60%,25%)",
                                borderColor: "hsl(142,60%,75%)",
                                background: "var(--color-success-light)",
                                fontWeight: 700,
                                cursor: "default",
                                pointerEvents: "none",
                                opacity: 0.95,
                              }}
                            >
                              <IconCheck size={14} />
                              <span>✓ تم الاستلام والاسترجاع (مغلق)</span>
                            </span>
                          ) : row.recoveryStatus &&
                          ["scheduled", "in_progress", "deposited"].includes(
                            row.recoveryStatus
                          ) ? (
                            <Link
                              href="/dashboard/recoveries"
                              className="btn btn-outline btn-sm"
                              style={{
                                color: "hsl(215, 90%, 35%)",
                                borderColor: "hsl(215, 90%, 75%)",
                                background: "hsl(215, 90%, 96%)",
                                fontWeight: 700,
                              }}
                            >
                              <span>✓ مجدول للاستلام (عرض الرمز OTP) ←</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/recoveries?claimId=${row.id}&action=schedule`}
                              className="btn btn-primary btn-sm"
                            >
                              الانتقال لجدولة الاستلام ←
                            </Link>
                          )
                        )}
                      </>
                    )}

                    {itemId && (
                      <Link href={`/items/${itemType}/${itemId}`} className="btn btn-ghost btn-sm">
                        عرض
                      </Link>
                    )}
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

export default function ClaimsManager(props: Props) {
  return (
    <Suspense fallback={<div className="card" style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--color-text-muted)" }}>جارٍ تحميل المطالبات...</div>}>
      <ClaimsManagerInner {...props} />
    </Suspense>
  );
}