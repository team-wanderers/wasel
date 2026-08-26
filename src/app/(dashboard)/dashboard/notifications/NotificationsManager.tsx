"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, NotificationItem } from "@/context/NotificationContext";

export default function NotificationsManager() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.readAt : true));

  function handleItemClick(notif: NotificationItem) {
    if (!notif.readAt) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  }

  function formatTime(dateVal: string | Date) {
    const d = new Date(dateVal);
    return d.toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" });
  }

  function getTypeBadge(type: string) {
    if (type.startsWith("match")) {
      return { label: "مطابقة ذكية", bg: "hsl(215,90%,94%)", color: "hsl(215,90%,35%)" };
    }
    if (type.startsWith("claim")) {
      return { label: "مطالبة ملكية", bg: "hsl(38,90%,92%)", color: "hsl(38,90%,30%)" };
    }
    if (type.startsWith("recovery")) {
      return { label: "استلام وتسليم", bg: "hsl(142,60%,92%)", color: "hsl(142,60%,25%)" };
    }
    return { label: "نظام", bg: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" };
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>مركز الإشعارات والتنبيهات</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            متابعة تنبيهات المطابقات الذكية، توثيق المطالبات، ومواعيد الاستلام والتسليم
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => markAllAsRead()}
            disabled={loading}
          >
            {loading ? "جارٍ التحديث..." : "تحديد كافة الإشعارات كمقروءة"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)" }}>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
        >
          كافة الإشعارات ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-ghost"}`}
        >
          غير المقروءة ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
            {filter === "unread" ? "لا توجد إشعارات غير مقروءة حالياً" : "لا توجد إشعارات مسجلة حتى الآن"}
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            ستصلك تنبيهات فورية عند ظهور مطابقات جديدة لأغراضك أو تحديث حالة الاستلام
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((n) => {
            const isUnread = !n.readAt;
            const badge = getTypeBadge(n.type);

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className="card"
                style={{
                  cursor: n.link ? "pointer" : "default",
                  borderRight: isUnread ? "4px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: isUnread ? "hsl(215, 90%, 99%)" : "#fff",
                  padding: "var(--space-4)",
                  transition: "box-shadow 150ms, border-color 150ms",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                    <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: isUnread ? 700 : 600, margin: 0 }}>
                      {n.title}
                    </h3>
                  </div>

                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {formatTime(n.createdAt)}
                  </span>
                </div>

                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: "var(--space-2) 0 var(--space-3) 0", lineHeight: 1.6 }}>
                  {n.body}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-2)", fontSize: "var(--font-size-xs)" }}>
                  <div>
                    {n.link && (
                      <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                        انتقل للتفاصيل ←
                      </span>
                    )}
                  </div>

                  <div>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-text-muted)",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        تحديد كمقروء
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>
                        ✓ مقروء
                      </span>
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
