"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconSearch,
  IconFilter,
  IconCheck,
  IconClose,
  IconShield,
  IconPackage,
} from "@/components/icons";

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
  status: "open" | "matched" | "claimed" | "recovered" | "closed";
  lat: number | null;
  lng: number | null;
  secretDetails: string | null;
  date: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  images: string[];
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

const reasonPresets = [
  "تم حل البلاغ واسترجاعه بنجاح",
  "محتوى مكرر أو سبام",
  "مخالف للشروط والأحكام",
  "بيانات غير مكتملة أو غير واضحة",
  "إغلاق بناءً على طلب صاحب البلاغ",
  "إعادة تنشيط البلاغ بعد المراجعة",
  "أخرى",
];

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

  // Modal State
  const [modalItem, setModalItem] = useState<AdminItem | null>(null);
  const [modalStatus, setModalStatus] = useState<AdminItem["status"]>("open");
  const [modalReason, setModalReason] = useState(reasonPresets[0]);
  const [modalCustomNotes, setModalCustomNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

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

  function openModerationModal(item: AdminItem, targetStatus?: AdminItem["status"]) {
    setModalItem(item);
    setModalStatus(targetStatus ?? item.status);
    setModalReason(
      targetStatus === "closed"
        ? "مخالف للشروط والأحكام"
        : targetStatus === "recovered"
        ? "تم حل البلاغ واسترجاعه بنجاح"
        : reasonPresets[0]
    );
    setModalCustomNotes("");
    setActionError("");
    setActionSuccess("");
  }

  function closeModal() {
    setModalItem(null);
    setActionError("");
  }

  async function handleModerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalItem) return;

    setSubmitting(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/items/${modalItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: modalItem.type,
          status: modalStatus,
          reason: modalReason,
          notes: modalCustomNotes.trim() || null,
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
          it.id === modalItem.id ? { ...it, status: modalStatus, updatedAt: new Date() } : it
        )
      );

      // Add to local audit logs
      const newLog: AdminAuditLog = {
        id: `local-${Date.now()}`,
        actorId: null,
        actorName: "مشرف النظام الحالي",
        actorEmail: null,
        action: "moderate_status",
        entityType: modalItem.type === "lost" ? "lost_item" : "found_item",
        entityId: modalItem.id,
        meta: {
          itemTitle: modalItem.title,
          previousStatus: modalItem.status,
          newStatus: modalStatus,
          reason: modalReason,
          notes: modalCustomNotes.trim() || null,
        },
        createdAt: new Date(),
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      setActionSuccess(`تم تعديل حالة "${modalItem.title}" إلى (${statusConfig[modalStatus]?.label || modalStatus}) بنجاح.`);
      setSubmitting(false);

      setTimeout(() => {
        closeModal();
      }, 900);
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
                  top: "50%",
                  transform: "translateY(-50%)",
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
                          <Image
                            src={item.images[0].startsWith("/") ? item.images[0] : `/${item.images[0]}`}
                            alt={item.title}
                            width={72}
                            height={72}
                            unoptimized
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
                            <span>👤 {item.userName || "مجهول"} ({item.userEmail || item.userPhone || "بدون وسيلة تواصل"})</span>
                            <span>📅 {formatDate(item.createdAt)}</span>
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
                          {item.status !== "closed" ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => openModerationModal(item, "closed")}
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                            >
                              إغلاق / حجب
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openModerationModal(item, "open")}
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                            >
                              إعادة تنشيط
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openModerationModal(item)}
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

      {/* Moderation Modal Dialog */}
      {modalItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: 800 }}>
                تعديل حالة البلاغ (إشراف الرقابة)
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                }}
              >
                <IconClose size={20} />
              </button>
            </div>

            {actionError && (
              <div
                role="alert"
                style={{
                  padding: "var(--space-3)",
                  background: "var(--color-danger-light)",
                  color: "hsl(0,70%,35%)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                }}
              >
                {actionError}
              </div>
            )}

            {/* Target Item Info */}
            <div
              style={{
                padding: "var(--space-3)",
                background: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {modalItem.title}
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                النوع: {modalItem.type === "lost" ? "بلاغ مفقود" : "بلاغ معثور عليه"} • الناشر: {modalItem.userName || "مجهول"}
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                الحالة الحالية: <strong style={{ color: "var(--color-text-primary)" }}>{statusConfig[modalItem.status]?.label || modalItem.status}</strong>
              </div>
            </div>

            <form onSubmit={handleModerateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Select Status */}
              <div className="field">
                <label className="label" htmlFor="modalStatus">الحالة الجديدة المعتمدة *</label>
                <select
                  id="modalStatus"
                  className="input"
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as AdminItem["status"])}
                  required
                >
                  <option value="open">مفتوح / نشط (open)</option>
                  <option value="matched">مطابق مع بلاغ آخر (matched)</option>
                  <option value="claimed">مُطالب به ومثبت (claimed)</option>
                  <option value="recovered">مسترجع ومكتمل الاستلام (recovered)</option>
                  <option value="closed">مغلق / محجوب (closed)</option>
                </select>
              </div>

              {/* Select Reason Preset */}
              <div className="field">
                <label className="label" htmlFor="modalReason">سبب الإجراء الإشرافي *</label>
                <select
                  id="modalReason"
                  className="input"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  required
                >
                  {reasonPresets.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Notes */}
              <div className="field">
                <label className="label" htmlFor="modalNotes">ملاحظات إضافية / تفاصيل الرقابة (اختياري)</label>
                <textarea
                  id="modalNotes"
                  className="input"
                  rows={3}
                  placeholder="اكتب أي ملاحظات موجهة للإدارة أو لسجل العمليات..."
                  value={modalCustomNotes}
                  onChange={(e) => setModalCustomNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "جارٍ حفظ الإجراء..." : "تأكيد وتسجيل الإجراء في Audit Logs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
