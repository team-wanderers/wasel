"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import MediaImage from "@/components/MediaImage";
import {
  IconSearch,
  IconFilter,
  IconCheck,
  IconClose,
  IconShield,
  IconPackage,
  IconMapPin,
} from "@/components/icons";

export type AdminItemStatus = "open" | "matched" | "claimed" | "recovered" | "closed";

export interface AdminMatchCandidate {
  matchId: string;
  matchStatus: "suggested" | "accepted" | "rejected" | "expired";
  id: string;
  type: "lost" | "found";
  title: string;
  description: string;
  category: string;
  status: AdminItemStatus;
  score: number;
  lat: number | null;
  lng: number | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
}

export interface AdminItem {
  id: string;
  type: "lost" | "found";
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  title: string;
  description: string;
  category: string;
  status: AdminItemStatus;
  lat: number | null;
  lng: number | null;
  secretDetails: string | null;
  date: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  images: string[];
  matchCandidates: AdminMatchCandidate[];
}

export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: {
    itemTitle?: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    notes?: string | null;
    adminName?: string;
    adminEmail?: string;
  } | null;
  createdAt: string | Date;
}

interface Props {
  initialItems: AdminItem[];
  initialAuditLogs: AdminAuditLog[];
}

const statusConfig: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  open: {
    label: "مفتوح / نشط",
    bg: "hsl(215,90%,94%)",
    color: "hsl(215,90%,35%)",
    border: "hsl(215,80%,85%)",
  },
  matched: {
    label: "مطابق",
    bg: "hsl(38,90%,92%)",
    color: "hsl(38,90%,30%)",
    border: "hsl(38,80%,80%)",
  },
  claimed: {
    label: "مُطالب به",
    bg: "hsl(270,70%,94%)",
    color: "hsl(270,55%,45%)",
    border: "hsl(270,60%,85%)",
  },
  recovered: {
    label: "مسترجع",
    bg: "var(--color-success-light)",
    color: "hsl(142,60%,25%)",
    border: "hsl(142,50%,80%)",
  },
  closed: {
    label: "مغلق / محجوب",
    bg: "hsl(0,70%,94%)",
    color: "hsl(0,65%,35%)",
    border: "hsl(0,60%,85%)",
  },
};

const categoryLabels: Record<string, string> = {
  documents: "وثائق ومستندات",
  electronics: "أجهزة وإلكترونيات",
  keys: "مفاتيح",
  bags: "حقائب ومحافظ",
  jewelry: "مجوهرات وساعات",
  pets: "حيوانات أليفة",
  other: "أخرى",
};

const matchStatusLabels: Record<string, string> = {
  suggested: "مقترحة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  expired: "منتهية",
};

function formatDate(val: string | Date | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleString("ar-YE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminItemsManager({
  initialItems,
  initialAuditLogs,
}: Props) {
  const [items, setItems] = useState<AdminItem[]>(initialItems);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(initialAuditLogs);

  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found" | "audit">(
    "all"
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [drawerItem, setDrawerItem] = useState<AdminItem | null>(null);
  const [confirmationItem, setConfirmationItem] = useState<AdminItem | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<AdminItemStatus>("closed");
  const [confirmationReason, setConfirmationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const drawerDialogRef = useRef<HTMLDivElement>(null);
  const confirmationDialogRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    const dialog = confirmationItem ? confirmationDialogRef.current : drawerDialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    focusableElements[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (submittingRef.current) return;
        event.preventDefault();
        if (confirmationItem) setConfirmationItem(null);
        else setDrawerItem(null);
        return;
      }

      if (event.key !== "Tab" || focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [confirmationItem, drawerItem]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by type tab
      if (activeTab === "lost" && item.type !== "lost") return false;
      if (activeTab === "found" && item.type !== "found") return false;

      // Filter by status
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchUser =
          item.userName?.toLowerCase().includes(q) ||
          item.userEmail?.toLowerCase().includes(q) ||
          item.userPhone?.includes(q);
        const matchCat = (categoryLabels[item.category] || "").toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);

        if (!matchTitle && !matchDesc && !matchUser && !matchCat && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, selectedStatus, searchQuery]);

  function openStatusConfirmation(item: AdminItem, targetStatus: AdminItemStatus) {
    setConfirmationItem(item);
    setConfirmationStatus(targetStatus);
    setConfirmationReason("");
    setActionError("");
    setActionSuccess("");
  }

  function openModerationDrawer(item: AdminItem) {
    setDrawerItem(item);
    setActionError("");
    setActionSuccess("");
  }

  function closeStatusConfirmation() {
    if (submitting) return;
    setConfirmationItem(null);
    setActionError("");
  }

  function closeModerationDrawer() {
    if (submitting) return;
    setDrawerItem(null);
    setActionError("");
  }

  async function handleStatusSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirmationItem) return;

    setSubmitting(true);
    setActionError("");
    const reason = confirmationReason.trim() || null;

    try {
      const res = await fetch(`/api/admin/items/${confirmationItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: confirmationItem.type,
          status: confirmationStatus,
          reason,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActionError(data.error || "فشل في تحديث حالة البلاغ");
        setSubmitting(false);
        return;
      }

      // Update local items state
      setItems((prev) =>
        prev.map((it) =>
          it.id === confirmationItem.id && it.type === confirmationItem.type
            ? { ...it, status: confirmationStatus, updatedAt: new Date() }
            : it
        )
      );
      setDrawerItem((current) =>
        current && current.id === confirmationItem.id && current.type === confirmationItem.type
          ? { ...current, status: confirmationStatus, updatedAt: new Date() }
          : current,
      );

      // Add to local audit logs
      const newLog: AdminAuditLog = {
        id: `local-${Date.now()}`,
        actorId: null,
        actorName: "مشرف النظام الحالي",
        actorEmail: null,
        action: "moderate_status",
        entityType: confirmationItem.type === "lost" ? "lost_item" : "found_item",
        entityId: confirmationItem.id,
        meta: {
          itemTitle: confirmationItem.title,
          previousStatus: confirmationItem.status,
          newStatus: confirmationStatus,
          reason: reason || "تعديل إشرافي بواسطة المشرف",
          notes: null,
        },
        createdAt: new Date(),
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      setActionSuccess(`تم تعديل حالة "${confirmationItem.title}" إلى (${statusConfig[confirmationStatus]?.label || confirmationStatus}) بنجاح.`);
      setSubmitting(false);
      setConfirmationItem(null);
    } catch {
      setActionError("حدث خطأ في الاتصال بالخادم");
      setSubmitting(false);
    }
  }

  // Count summaries
  const counts = useMemo(() => {
    const total = items.length;
    const lostCount = items.filter((i) => i.type === "lost").length;
    const foundCount = items.filter((i) => i.type === "found").length;
    const openCount = items.filter((i) => i.status === "open").length;
    const closedCount = items.filter((i) => i.status === "closed").length;
    const recoveredCount = items.filter((i) => i.status === "recovered").length;

    return { total, lostCount, foundCount, openCount, closedCount, recoveredCount };
  }, [items]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 800, margin: 0 }}>
            إدارة ومراجعة البلاغات
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-1)",
              marginBottom: 0,
            }}
          >
            استعراض وتعديل حالات بلاغات المفقودات والمعثورات مع تسجيل كامل للرقابة (Audit Logs).
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "hsl(215,90%,94%)",
              color: "hsl(215,90%,35%)",
            }}
          >
            {counts.total} إجمالي البلاغات
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-success-light)",
              color: "hsl(142,60%,25%)",
            }}
          >
            {counts.openCount} نشط
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "hsl(0,70%,94%)",
              color: "hsl(0,65%,35%)",
            }}
          >
            {counts.closedCount} مغلق
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div
          role="status"
          style={{
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-success-light)",
            border: "1px solid hsl(142,50%,80%)",
            color: "hsl(142,60%,25%)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <IconCheck size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--color-border)",
          gap: "var(--space-2)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "all" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: activeTab === "all" ? "var(--color-primary)" : "var(--color-text-secondary)",
            cursor: "pointer",
            marginBottom: "-2px",
          }}
        >
          جميع البلاغات ({counts.total})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lost")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "lost" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: activeTab === "lost" ? "var(--color-primary)" : "var(--color-text-secondary)",
            cursor: "pointer",
            marginBottom: "-2px",
          }}
        >
          المفقودات ({counts.lostCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("found")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "found" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: activeTab === "found" ? "var(--color-primary)" : "var(--color-text-secondary)",
            cursor: "pointer",
            marginBottom: "-2px",
          }}
        >
          المعثورات ({counts.foundCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          style={{
            padding: "var(--space-3) var(--space-4)",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "audit" ? "3px solid var(--color-primary)" : "3px solid transparent",
            color: activeTab === "audit" ? "var(--color-primary)" : "var(--color-text-secondary)",
            cursor: "pointer",
            marginBottom: "-2px",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <IconShield size={16} />
          سجل الرقابة والإشراف ({auditLogs.length})
        </button>
      </div>

      {/* When in Item Tabs (All / Lost / Found) */}
      {activeTab !== "audit" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Controls: Search & Status Filters */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-3)",
            }}
          >
            {/* Search Bar */}
            <div
              style={{
                position: "relative",
                flex: "1",
                minWidth: "260px",
                maxWidth: "420px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }}
              >
                <IconSearch size={16} />
              </div>
              <input
                type="text"
                className="input"
                placeholder="بحث بالعنوان، الوصف، اسم الناشر أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: "36px" }}
              />
            </div>

            {/* Status Pills */}
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <IconFilter size={14} /> الحالة:
              </span>
              {[
                { key: "all", label: "الكل" },
                { key: "open", label: "مفتوح" },
                { key: "matched", label: "مطابق" },
                 { key: "claimed", label: "مُطالب به" },
                 { key: "recovered", label: "مسترجع" },
                { key: "closed", label: "مغلق" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setSelectedStatus(st.key)}
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: selectedStatus === st.key ? 700 : 500,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid",
                    borderColor:
                      selectedStatus === st.key
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    background:
                      selectedStatus === st.key
                        ? "var(--color-primary-light)"
                        : "transparent",
                    color:
                      selectedStatus === st.key
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <IconPackage size={36} style={{ margin: "0 auto var(--space-2)", opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>لا توجد بلاغات مطابقة لمعايير البحث أو الفلترة.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {filteredItems.map((item) => {
                const st = statusConfig[item.status] ?? statusConfig.open;
                const isLost = item.type === "lost";

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="card"
                    style={{
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                      borderRight: `4px solid ${
                        isLost ? "hsl(215,80%,50%)" : "hsl(142,60%,40%)"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "var(--space-3)",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Left: Thumbnail & Details */}
                      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", flex: 1, minWidth: "280px" }}>
                        {/* Thumbnail */}
                        {item.images && item.images.length > 0 ? (
                          <MediaImage
                            src={item.images[0].startsWith("/") ? item.images[0] : `/${item.images[0]}`}
                            alt={item.title}
                            width={72}
                            height={72}
                            style={{
                              width: "72px",
                              height: "72px",
                              borderRadius: "var(--radius-md)",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1px solid var(--color-border)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "72px",
                              height: "72px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--color-bg-secondary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              color: "var(--color-text-muted)",
                            }}
                          >
                            <IconPackage size={28} />
                          </div>
                        )}

                        {/* Title, Category & Publisher */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-full)",
                                background: isLost ? "hsl(215,90%,94%)" : "hsl(142,60%,92%)",
                                color: isLost ? "hsl(215,90%,35%)" : "hsl(142,60%,25%)",
                              }}
                            >
                              {isLost ? "مفقود" : "معثور عليه"}
                            </span>

                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--color-bg-secondary)",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {categoryLabels[item.category] || item.category}
                            </span>

                            <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: 700 }}>
                              <Link
                                href={isLost ? `/items/lost/${item.id}` : `/items/found/${item.id}`}
                                target="_blank"
                                style={{ color: "inherit", textDecoration: "none" }}
                              >
                                {item.title}
                              </Link>
                            </h3>
                          </div>

                          <p
                            style={{
                              fontSize: "var(--font-size-xs)",
                              color: "var(--color-text-secondary)",
                              margin: 0,
                              lineHeight: 1.5,
                              maxWidth: "600px",
                            }}
                          >
                            {item.description}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              gap: "var(--space-3)",
                              fontSize: "var(--font-size-xs)",
                              color: "var(--color-text-muted)",
                              marginTop: "2px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span>{item.userName || "مجهول"} ({item.userEmail || item.userPhone || "بدون وسيلة تواصل"})</span>
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Current Status Badge & Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "var(--space-2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "4px 12px",
                            borderRadius: "var(--radius-full)",
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          {st.label}
                        </span>

                        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                          {item.status === "recovered" ? (
                            <span
                              className="inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"
                              aria-disabled="true"
                            >
                              مكتمل / مسترجع
                            </span>
                          ) : item.status === "closed" ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openStatusConfirmation(item, "open")}
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                            >
                              إعادة تنشيط
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => openStatusConfirmation(item, "closed")}
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                            >
                              إغلاق / حجب
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openModerationDrawer(item)}
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                          >
                            إشراف متقدم...
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit Logs Tab */
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: "0 0 var(--space-3) 0" }}>
              سجل العمليات الرقابية وتعديلات المشرفين الحية
            </h2>

            {auditLogs.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", margin: 0 }}>
                لا توجد عمليات إشراف مسجلة بعد في قاعدة البيانات.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-xs)" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "right" }}>
                      <th style={{ padding: "var(--space-2) var(--space-3)" }}>التاريخ والوقت</th>
                      <th style={{ padding: "var(--space-2) var(--space-3)" }}>المشرف المنفّذ</th>
                      <th style={{ padding: "var(--space-2) var(--space-3)" }}>البلاغ المستهدف</th>
                      <th style={{ padding: "var(--space-2) var(--space-3)" }}>تغيير الحالة</th>
                      <th style={{ padding: "var(--space-2) var(--space-3)" }}>سبب الإجراء والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const prevStatus = (log.meta?.previousStatus as string) || "—";
                      const newStatus = (log.meta?.newStatus as string) || "—";
                      const prevSt = statusConfig[prevStatus];
                      const newSt = statusConfig[newStatus];

                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "var(--space-3)", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                            {formatDate(log.createdAt)}
                          </td>
                          <td style={{ padding: "var(--space-3)", fontWeight: 600 }}>
                            {log.actorName || log.meta?.adminName || "مشرف النظام"}
                            {log.actorEmail && (
                              <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                                {log.actorEmail}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "var(--space-3)" }}>
                            <div style={{ fontWeight: 600 }}>
                              {log.meta?.itemTitle || "بلاغ"}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                              {log.entityType === "lost_item" ? "مفقود" : "معثور عليه"} • {log.entityId?.slice(0, 8)}...
                            </div>
                          </td>
                          <td style={{ padding: "var(--space-3)", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: prevSt?.bg || "var(--color-bg-secondary)",
                                color: prevSt?.color || "inherit",
                              }}
                            >
                              {prevSt?.label || prevStatus}
                            </span>
                            <span style={{ margin: "0 4px", color: "var(--color-text-muted)" }}>➔</span>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: newSt?.bg || "var(--color-bg-secondary)",
                                color: newSt?.color || "inherit",
                              }}
                            >
                              {newSt?.label || newStatus}
                            </span>
                          </td>
                          <td style={{ padding: "var(--space-3)" }}>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                              {log.meta?.reason || "—"}
                            </div>
                            {log.meta?.notes && (
                              <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                                {log.meta.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {(drawerItem || confirmationItem) &&
        portalTarget &&
        createPortal(
          <>
            {drawerItem && (
              <div
                className="fixed inset-0 z-[9999] overflow-hidden bg-black/60 backdrop-blur-sm"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget) closeModerationDrawer();
                }}
              >
                <aside
                  ref={drawerDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="moderation-drawer-title"
                  tabIndex={-1}
                  className="fixed top-0 bottom-0 right-0 z-[10000] flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900"
                  onClick={(event) => event.stopPropagation()}
                >
            <div className="sticky top-0 z-20 shrink-0 bg-white/95 p-4 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <h2 id="moderation-drawer-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  تفاصيل الإشراف المتقدم
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{drawerItem.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerItem(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="إغلاق لوحة الإشراف المتقدم"
              >
                <span className="text-base font-bold" aria-hidden="true">✕</span>
                <span>إغلاق</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {drawerItem.type === "lost" ? "بلاغ مفقود" : "بلاغ معثور عليه"}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: statusConfig[drawerItem.status]?.bg, color: statusConfig[drawerItem.status]?.color }}
                >
                  {statusConfig[drawerItem.status]?.label || drawerItem.status}
                </span>
                <span className="text-xs text-slate-500">{categoryLabels[drawerItem.category] || drawerItem.category}</span>
              </div>

              {drawerItem.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {drawerItem.images.map((image, index) => (
                    <MediaImage
                      key={`${image}-${index}`}
                      src={image.startsWith("/") ? image : `/${image}`}
                      alt={`${drawerItem.title} ${index + 1}`}
                      width={160}
                      height={120}
                      style={{ width: "100%", height: "96px", objectFit: "cover", borderRadius: "var(--radius-md)" }}
                    />
                  ))}
                </div>
              )}

              <section aria-labelledby="moderation-item-details-title" className="space-y-3">
                <h3 id="moderation-item-details-title" className="text-sm font-bold text-slate-800">تفاصيل البلاغ</h3>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{drawerItem.description}</p>
                  {drawerItem.secretDetails && (
                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold text-slate-500">التفاصيل السرية</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{drawerItem.secretDetails}</p>
                    </div>
                  )}
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500">تاريخ البلاغ</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">{formatDate(drawerItem.date || drawerItem.createdAt)}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <dt className="text-xs text-slate-500">معرف البلاغ</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-700" dir="ltr">{drawerItem.id}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby="moderation-reporter-title" className="space-y-3">
                <h3 id="moderation-reporter-title" className="text-sm font-bold text-slate-800">بيانات المبلّغ</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">الاسم</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">{drawerItem.userName || "غير مسجل"}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">البريد الإلكتروني</dt>
                    <dd className="mt-1 break-all text-sm font-semibold text-slate-800" dir="ltr">{drawerItem.userEmail || "غير مسجل"}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">الهاتف</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800" dir="ltr">{drawerItem.userPhone || "غير مسجل"}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">معرف المستخدم</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-700" dir="ltr">{drawerItem.userId}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby="moderation-location-title" className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconMapPin size={17} className="text-slate-500" />
                  <h3 id="moderation-location-title" className="text-sm font-bold text-slate-800">الموقع والإحداثيات</h3>
                </div>
                {drawerItem.lat != null && drawerItem.lng != null ? (
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500">خط العرض</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-800" dir="ltr">{drawerItem.lat}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">خط الطول</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-800" dir="ltr">{drawerItem.lng}</p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لم يحدد المبلّغ إحداثيات دقيقة.</p>
                )}
              </section>

              <section aria-labelledby="moderation-matches-title" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="moderation-matches-title" className="text-sm font-bold text-slate-800">مرشحو المطابقة</h3>
                  <span className="text-xs text-slate-500">{drawerItem.matchCandidates.length} مرشح</span>
                </div>
                {drawerItem.matchCandidates.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد مطابقات مرتبطة بهذا البلاغ.</p>
                ) : (
                  <div className="space-y-3">
                    {drawerItem.matchCandidates.map((candidate) => (
                      <div key={candidate.matchId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-500">
                              {candidate.type === "lost" ? "بلاغ مفقود" : "بلاغ معثور عليه"}
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">{candidate.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {categoryLabels[candidate.category] || candidate.category} · {candidate.userName || "مستخدم غير معروف"}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600">{candidate.description}</p>
                          </div>
                          <div className="shrink-0 text-left" dir="ltr">
                            <p className="text-lg font-bold text-blue-700">{Math.round(candidate.score * 100)}%</p>
                            <p className="text-[11px] text-slate-500" dir="rtl">نسبة المطابقة</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full bg-white px-2.5 py-1">حالة البلاغ: {statusConfig[candidate.status]?.label || candidate.status}</span>
                          <span className="rounded-full bg-white px-2.5 py-1">حالة المطابقة: {matchStatusLabels[candidate.matchStatus] || candidate.matchStatus}</span>
                          {candidate.lat != null && candidate.lng != null && (
                            <span className="rounded-full bg-white px-2.5 py-1" dir="ltr">{candidate.lat}, {candidate.lng}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-3 text-xs font-semibold text-slate-500">إجراءات سريعة</p>
              <div className="flex flex-wrap gap-2">
                {drawerItem.status === "recovered" ? (
                  <span
                    className="inline-flex cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"
                    aria-disabled="true"
                  >
                    مكتمل / مسترجع
                  </span>
                ) : drawerItem.status === "closed" ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openStatusConfirmation(drawerItem, "open")}>
                    إعادة تنشيط البلاغ
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => openStatusConfirmation(drawerItem, "closed")}>
                      إغلاق البلاغ
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openStatusConfirmation(drawerItem, "closed")}>
                      حجب البلاغ
                    </button>
                  </>
                )}
              </div>
            </div>
                </aside>
              </div>
            )}

            {confirmationItem && (
              <div
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closeStatusConfirmation();
                }}
              >
                <div
                  ref={confirmationDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="status-confirmation-title"
                  aria-describedby="status-confirmation-description"
                  className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl outline-none sm:p-6"
                  onMouseDown={(event) => event.stopPropagation()}
                >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">تأكيد الإجراء الإداري</p>
                <h2 id="status-confirmation-title" className="mt-1 text-lg font-bold text-slate-900">
                  {confirmationStatus === "open" ? "إعادة تنشيط البلاغ؟" : "إغلاق أو حجب البلاغ؟"}
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={closeStatusConfirmation}
                aria-label="إغلاق نافذة تأكيد الإجراء"
                disabled={submitting}
              >
                <IconClose size={17} />
              </button>
            </div>

            <p id="status-confirmation-description" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              سيتم تطبيق الإجراء على <strong>{confirmationItem.title}</strong> وتسجيله في سجل التدقيق.
            </p>

            {actionError && (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
              <div className="field">
                <label className="label" htmlFor="statusReason">سبب الإجراء (اختياري)</label>
                <textarea
                  id="statusReason"
                  className="input"
                  rows={3}
                  placeholder="أضف سبباً يظهر في سجل التدقيق..."
                  value={confirmationReason}
                  onChange={(event) => setConfirmationReason(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={closeStatusConfirmation} disabled={submitting}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "جارٍ تنفيذ الإجراء..." : "تأكيد وتسجيل"}
                </button>
              </div>
            </form>
                </div>
              </div>
            )}
          </>,
          portalTarget,
        )}
    </div>
  );
}
