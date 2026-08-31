"use client";

import { useState, useMemo } from "react";
import {
  IconHistory,
  IconSearch,
  IconFilter,
  IconShield,
  IconUser,
  IconClose,
  IconActivity,
  IconFileText,
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
  meta: Record<string, unknown> | null;
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

const formatMeta = (meta: unknown) => {
  if (!meta) return "لا توجد تفاصيل إضافية";
  try {
    if (typeof meta === "string") {
      return JSON.stringify(JSON.parse(meta), null, 2);
    }
    return JSON.stringify(meta, null, 2);
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
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}>
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
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background 150ms",
                    }}
                  >
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
                          {log.entityId}
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
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedLog(log)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--font-size-xs)" }}
                      >
                        <IconFileText size={14} />
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

      {/* Details Modal Dialog */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "640px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <IconFileText size={20} />
                <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0 }}>
                  تفاصيل سجل التدقيق #{selectedLog.id.slice(0, 8)}
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedLog(null)}
                aria-label="إغلاق"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", fontSize: "var(--font-size-xs)", background: "var(--color-bg-secondary)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div>
                <strong>المنفذ (Actor):</strong> {selectedLog.actorName ?? "النظام"} ({selectedLog.actorEmail ?? "system"})
              </div>
              <div>
                <strong>نوع الإجراء:</strong> {selectedLog.action}
              </div>
              <div>
                <strong>الكيان:</strong> {selectedLog.entityType} ({selectedLog.entityId ?? "—"})
              </div>
              <div>
                <strong>التوقيت:</strong> {formatDate(selectedLog.createdAt)}
              </div>
            </div>

            <div>
              <strong style={{ fontSize: "var(--font-size-xs)", display: "block", marginBottom: "var(--space-2)" }}>
                البيانات الوصفية والتغييرات (Metadata / Payload):
              </strong>
              <pre
                style={{
                  background: "hsl(220, 20%, 97%)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  direction: "ltr",
                  textAlign: "left",
                  overflowX: "auto",
                  maxHeight: "320px",
                }}
              >
                {formatMeta(selectedLog.meta)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedLog(null)}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
