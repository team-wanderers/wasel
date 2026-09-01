"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconHistory,
  IconSearch,
  IconFilter,
  IconShield,
  IconUser,
  IconActivity,
  IconEye,
  IconLayers,
  IconRefresh,
} from "@/components/icons";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown> | string | null;
  createdAt: Date | string;
}

interface Props {
  initialLogs: AuditLogEntry[];
}

const ACTION_MAP: Record<string, { label: string; bg: string; color: string }> = {
  "moderate_status": { label: "إشراف على بلاغ", bg: "hsl(215,90%,94%)", color: "hsl(215,90%,35%)" },
  "role_updated": { label: "تعديل دور مستخدم", bg: "hsl(270,70%,94%)", color: "hsl(270,55%,45%)" },
  "settings.update": { label: "تحديث إعدادات المنصة", bg: "hsl(38,90%,92%)", color: "hsl(38,90%,30%)" },
  "create_item": { label: "إنشاء بلاغ", bg: "hsl(142,60%,92%)", color: "hsl(142,60%,25%)" },
  "update_item": { label: "تعديل بلاغ", bg: "hsl(200,60%,92%)", color: "hsl(200,60%,30%)" },
  "delete_item": { label: "حذف بلاغ", bg: "hsl(0,70%,92%)", color: "hsl(0,70%,40%)" },
  "claim_reviewed": { label: "مراجعة مطالبة", bg: "hsl(280,60%,92%)", color: "hsl(280,60%,35%)" },
  "match_created": { label: "اكتشاف مطابقة", bg: "hsl(190,70%,92%)", color: "hsl(190,70%,30%)" },
  "recovery_confirmed": { label: "تأكيد استلام", bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
  "pickup_point_created": { label: "إضافة نقطة أمانة", bg: "hsl(150,60%,92%)", color: "hsl(150,60%,25%)" },
  "pickup_point.create": { label: "إضافة نقطة استلام", bg: "hsl(150,60%,92%)", color: "hsl(150,60%,25%)" },
  "pickup_point.update": { label: "تعديل نقطة استلام", bg: "hsl(200,60%,92%)", color: "hsl(200,60%,30%)" },
  "pickup_point.delete": { label: "تعطيل نقطة استلام", bg: "hsl(0,70%,92%)", color: "hsl(0,70%,40%)" },
};

const FIELD_LABELS: Record<string, string> = {
  maintenanceMode: "وضع الصيانة",
  enableAutoMatching: "المطابقة التلقائية",
  enableSmsNotifications: "إشعارات الرسائل القصيرة SMS",
  enablePublicRegistration: "التسجيل المتاح للعامة",
  maxRadiusKm: "أقصى نطاق جغرافي للمطابقة",
  matchingThreshold: "نسبة قبول التطابق",
  matching: "إعدادات المطابقة",
  recovery: "إعدادات وإجراءات الاستلام",
  features: "الخصائص والميزات",
  siteName: "اسم المنصة",
  supportEmail: "البريد",
  supportPhone: "الهاتف",
  name: "الاسم",
  address: "العنوان",
  phone: "رقم التواصل",
  description: "الوصف",
  notes: "ملاحظات",
  title: "العنوان",
  itemTitle: "عنوان البلاغ",
  status: "الحالة",
  previousStatus: "الحالة السابقة",
  newStatus: "الحالة الجديدة",
  reason: "سبب الإجراء",
  adminName: "اسم المشرف",
  adminEmail: "بريد المشرف",
  role: "الدور",
  email: "البريد الإلكتروني",
  category: "التصنيف",
  city: "المدينة",
  updatedKeys: "الحقول المعدلة",
  inserted: "المطابقات المضافة",
  updated: "المطابقات المحدثة",
  skipped: "المتخطى",
  durationMs: "مدة المعالجة",
  pairs: "الأزواج المفحوصة",
  isActive: "حالة التفعيل",
  location: "الموقع الجغرافي",
  lat: "خط العرض",
  lng: "خط الطول",
  operatingHours: "ساعات العمل",
  contactPerson: "الشخص المسؤول",
  settings: "الإعدادات",
};

function isIsoDateString(str: string): boolean {
  if (typeof str !== "string" || str.length < 10) return false;
  return /^\d{4}-\d{2}-\d{2}(T|\b)/.test(str) && !isNaN(Date.parse(str));
}

function isUuidString(str: string): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateUuid(uuid: string): string {
  if (uuid.length <= 12) return uuid;
  return `${uuid.slice(0, 6)}...${uuid.slice(-4)}`;
}

function formatDisplayValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") {
    if (key === "maintenanceMode") return value ? "مفعّل" : "معطّل";
    if (key === "enableAutoMatching") return value ? "مفعّلة" : "معطّلة";
    return value ? "مفعّل" : "معطّل";
  }
  if (key === "maxRadiusKm" && typeof value === "number") {
    return `${value} كم`;
  }
  if (key === "matchingThreshold" && typeof value === "number") {
    return `${Math.round(value * 100)}% (${value})`;
  }
  if (key === "durationMs" && typeof value === "number") {
    return `${value} مللي ثانية`;
  }
  if (typeof value === "string") {
    if (isIsoDateString(value)) {
      const d = new Date(value);
      return d.toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" });
    }
    if (isUuidString(value)) {
      return truncateUuid(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "لا توجد عناصر";
    if (key === "updatedKeys") {
      return value.map((k) => FIELD_LABELS[String(k)] ?? String(k)).join("، ");
    }
    return value
      .map((item) => {
        if (typeof item === "string" && isUuidString(item)) {
          return truncateUuid(item);
        }
        return isRecord(item)
          ? Object.entries(item)
              .map(([nestedKey, nestedValue]) => `${FIELD_LABELS[nestedKey] ?? nestedKey}: ${formatDisplayValue(nestedKey, nestedValue)}`)
              .join("، ")
          : String(item);
      })
      .join("، ");
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => `${FIELD_LABELS[nestedKey] ?? nestedKey}: ${formatDisplayValue(nestedKey, nestedValue)}`)
      .join("\n");
  }
  return String(value);
}

function parseMeta(meta: unknown): Record<string, unknown> | null {
  if (isRecord(meta)) return meta;
  if (typeof meta !== "string" || meta.trim().length === 0) return null;

  try {
    const parsed: unknown = JSON.parse(meta);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractMetaEntries(meta: unknown): Array<{ key: string; label: string; value: string }> {
  const parsedMeta = parseMeta(meta);
  if (!parsedMeta || Object.keys(parsedMeta).length === 0) return [];

  const entries: Array<{ key: string; label: string; value: string }> = [];

  const settings = isRecord(parsedMeta.settings) ? parsedMeta.settings : null;
  const source = settings ? { ...parsedMeta, ...settings } : parsedMeta;

  for (const [k, v] of Object.entries(source)) {
    if (k === "settings" && isRecord(v)) continue;
    const label = FIELD_LABELS[k] ?? k;
    const formatted = formatDisplayValue(k, v);
    entries.push({ key: k, label, value: formatted });
  }

  return entries;
}

const formatMeta = (meta: unknown) => {
  if (meta === null || meta === undefined) return "لا توجد تفاصيل إضافية";
  try {
    const parsed = typeof meta === "string" ? JSON.parse(meta) : meta;
    return JSON.stringify(parsed, null, 2) ?? String(parsed);
  } catch {
    return String(meta);
  }
};

function formatAction(action: string) {
  return ACTION_MAP[action] ?? {
    label: action,
    bg: "var(--color-bg-secondary)",
    color: "var(--color-text)",
  };
}

function formatDate(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  return d.toLocaleString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLogsManager({ initialLogs }: Props) {
  const [logs] = useState<AuditLogEntry[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedLog) return;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = dialog
      ? Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];

    focusableElements[0]?.focus();
    if (focusableElements.length === 0) dialog?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedLog(null);
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
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [selectedLog]);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set);
  }, [logs]);

  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.entityType));
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const actorName = (log.actorName || "").toLowerCase();
        const actorEmail = (log.actorEmail || "").toLowerCase();
        const actionText = log.action.toLowerCase();
        const entityId = (log.entityId || "").toLowerCase();
        const entityType = log.entityType.toLowerCase();

        return (
          actorName.includes(q) ||
          actorEmail.includes(q) ||
          actionText.includes(q) ||
          entityId.includes(q) ||
          entityType.includes(q)
        );
      }

      return true;
    });
  }, [logs, actionFilter, entityFilter, searchQuery]);

  const totalLogs = logs.length;
  const adminActions = logs.filter((l) => l.actorRole === "admin").length;
  const uniqueActors = new Set(logs.map((l) => l.actorId).filter(Boolean)).size;
  const selectedMetaEntries = selectedLog ? extractMetaEntries(selectedLog.meta) : [];
  const portalTarget = typeof document === "undefined" ? null : document.body;

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "var(--space-6)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              background: "hsl(215,90%,94%)",
              color: "hsl(215,90%,35%)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              marginBottom: "var(--space-3)",
            }}
          >
            <IconHistory size={14} /> سجلات الرقابة الإدارية
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>
            سجلات التدقيق الإداري (Audit Logs)
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-1)" }}>
            متابعة دقيقة لكافة الإجراءات والقرارات المتخذة على مستوى المنصة والتغييرات في قاعدة البيانات
          </p>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        <div className="card" style={{ padding: "var(--space-4)", borderRight: "4px solid var(--color-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>إجمالي السجلات</span>
            <IconActivity size={18} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "var(--space-1)" }}>{totalLogs}</div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)", borderRight: "4px solid hsl(270,55%,45%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>إجراءات المشرفين</span>
            <IconShield size={18} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "var(--space-1)", color: "hsl(270,55%,45%)" }}>
            {adminActions}
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-4)", borderRight: "4px solid hsl(142,60%,25%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>المستخدمون المنفذون</span>
            <IconUser size={18} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "var(--space-1)", color: "hsl(142,60%,25%)" }}>
            {uniqueActors}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flex: 1, minWidth: "260px", position: "relative" }}>
           <span style={{ position: "absolute", right: "12px", top: 0, bottom: 0, display: "flex", alignItems: "center", color: "var(--color-text-muted)" }}>
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            className="input"
            style={{ paddingRight: "36px", width: "100%" }}
            placeholder="بحث بالاسم، البريد، الإجراء، أو المعرف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <IconFilter size={16} />
            <select
              className="select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-2) var(--space-3)" }}
            >
              <option value="all">كافة الإجراءات ({logs.length})</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {formatAction(act).label} ({act})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <IconLayers size={16} />
            <select
              className="select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{ fontSize: "var(--font-size-xs)", padding: "var(--space-2) var(--space-3)" }}
            >
              <option value="all">كافة الكيانات</option>
              {availableEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || actionFilter !== "all" || entityFilter !== "all") && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchQuery("");
                setActionFilter("all");
                setEntityFilter("all");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--font-size-xs)" }}
            >
              <IconRefresh size={12} /> إعادة تعيين
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--color-text-muted)" }}>
            <IconHistory size={40} style={{ margin: "0 auto var(--space-3) auto", opacity: 0.5 }} />
            <p style={{ fontWeight: 600 }}>لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
            <thead>
              <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700 }}>المستخدم / المشرف (Actor)</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700 }}>نوع الإجراء (Action)</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700 }}>الكيان المتأثر (Entity)</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700 }}>التاريخ والوقت</th>
                <th style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 700, textAlign: "center" }}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const act = formatAction(log.action);
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)", transition: "background 150ms" }}>
                      {/* Actor */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        {log.actorName ? (
                          <div>
                            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                              <span>{log.actorName}</span>
                              {log.actorRole === "admin" && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-full)",
                                    background: "hsl(215,90%,94%)",
                                    color: "hsl(215,90%,35%)",
                                    fontWeight: 700,
                                  }}
                                >
                                  مشرف
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                              {log.actorEmail}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                            النظام الآلي (System)
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: act.bg,
                            color: act.color,
                          }}
                        >
                          {act.label}
                        </span>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {log.action}
                        </div>
                      </td>

                      {/* Entity */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <span style={{ fontWeight: 600 }}>{log.entityType}</span>
                        {log.entityId && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontFamily: "monospace",
                              color: "var(--color-text-muted)",
                              maxWidth: "140px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={log.entityId}
                          >
                            {truncateUuid(log.entityId)}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                        {formatDate(log.createdAt)}
                      </td>

                      {/* Details Action */}
                      <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          aria-haspopup="dialog"
                          aria-controls="audit-log-dialog"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <IconEye size={14} className="pointer-events-none" />
                          <span>معاينة</span>
                        </button>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedLog &&
        portalTarget &&
        createPortal(
          <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedLog(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            id="audit-log-dialog"
            aria-labelledby="audit-log-dialog-title"
            aria-describedby="audit-log-dialog-description"
            tabIndex={-1}
            className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatAction(selectedLog.action).label}
                  </span>
                  <span className="text-xs text-slate-500">{selectedLog.action}</span>
                </div>
                <h2 id="audit-log-dialog-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  تفاصيل السجل الإداري
                </h2>
                <p id="audit-log-dialog-description" className="mt-1 text-xs text-slate-500">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setSelectedLog(null)}
                aria-label="إغلاق تفاصيل سجل التدقيق"
              >
                <span className="text-base font-bold" aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm">
              <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">المنفذ</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {selectedLog.actorName || "النظام الآلي"}
                    {selectedLog.actorEmail && (
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">
                        {selectedLog.actorEmail}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">الكيان المتأثر</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {selectedLog.entityType}
                    {selectedLog.entityId && (
                      <span
                        className="mt-0.5 block break-all font-mono text-xs font-normal text-slate-500"
                        dir="ltr"
                        title={selectedLog.entityId}
                      >
                        {truncateUuid(selectedLog.entityId)}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">معرف السجل</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-700" dir="ltr" title={selectedLog.id}>
                    {truncateUuid(selectedLog.id)}
                  </dd>
                </div>
              </dl>

              <section aria-labelledby="audit-log-metadata-title">
                <h3 id="audit-log-metadata-title" className="mb-3 text-sm font-bold text-slate-800">
                  تفاصيل التغييرات والبيانات
                </h3>
                {selectedMetaEntries.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                    لا توجد تفاصيل إضافية مسجلة
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedMetaEntries.map((entry) => (
                      <div key={entry.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">{entry.label}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">
                          {entry.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <details className="border-t border-slate-200 pt-4 text-xs">
                <summary className="w-fit cursor-pointer select-none font-semibold text-slate-600 transition-colors hover:text-slate-900">
                  عرض البيانات التقنية الخام (JSON)
                </summary>
                <pre className="mt-3 max-h-64 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-left font-mono text-xs leading-relaxed text-emerald-400" dir="ltr">
                  {formatMeta(selectedLog.meta)}
                </pre>
              </details>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedLog(null)}>
                إغلاق النافذة
              </button>
            </div>
          </div>
          </div>,
          portalTarget,
        )}
     </div>
   );
 }
