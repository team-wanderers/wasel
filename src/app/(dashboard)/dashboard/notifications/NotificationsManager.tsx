"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications, NotificationItem } from "@/context/NotificationContext";
import {
  IconBell,
  IconCheck,
  IconInfo,
  IconPackage,
  IconShield,
  IconTarget,
} from "@/components/icons";

type NotificationVisual = {
  icon: React.ReactNode;
  iconBackground: string;
  iconColor: string;
  badge: string;
  badgeBackground: string;
  badgeColor: string;
};

const VISUAL_STYLES = {
  match: {
    iconBackground: "hsl(210, 70%, 95%)",
    iconColor: "hsl(210, 60%, 35%)",
    badgeBackground: "hsl(210, 70%, 95%)",
    badgeColor: "hsl(210, 60%, 35%)",
  },
  claim: {
    iconBackground: "hsl(38, 90%, 95%)",
    iconColor: "hsl(38, 80%, 28%)",
    badgeBackground: "hsl(38, 90%, 95%)",
    badgeColor: "hsl(38, 80%, 28%)",
  },
  recovery: {
    iconBackground: "hsl(142, 60%, 95%)",
    iconColor: "hsl(142, 65%, 24%)",
    badgeBackground: "hsl(142, 60%, 95%)",
    badgeColor: "hsl(142, 65%, 24%)",
  },
  system: {
    iconBackground: "hsl(270, 70%, 95%)",
    iconColor: "hsl(270, 55%, 45%)",
    badgeBackground: "hsl(270, 70%, 95%)",
    badgeColor: "hsl(270, 55%, 45%)",
  },
} as const;

export default function NotificationsManager() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((notification) =>
    filter === "unread" ? !notification.readAt : true
  );

  function getNotificationVisual(type: string): NotificationVisual {
    if (type.startsWith("match")) {
      return {
        icon: <IconTarget size={26} />,
        ...VISUAL_STYLES.match,
        badge: "مطابقة ذكية",
      };
    }

    if (type.startsWith("claim")) {
      return {
        icon: <IconShield size={26} />,
        ...VISUAL_STYLES.claim,
        badge: "مطالبة ملكية",
      };
    }

    if (type.startsWith("recovery")) {
      return {
        icon: <IconPackage size={26} />,
        ...VISUAL_STYLES.recovery,
        badge: "استلام وتسليم",
      };
    }

    return {
      icon: <IconInfo size={26} />,
      ...VISUAL_STYLES.system,
      badge: "النظام",
    };
  }

  function formatTime(dateValue: string | Date) {
    return new Date(dateValue).toLocaleString("ar-YE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.readAt) {
      void markAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div dir="rtl">
      {/* Header */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "0.5rem 0.9rem",
            borderRadius: "999px",
            background: "hsl(270, 70%, 95%)",
            color: "hsl(270, 55%, 45%)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            marginBottom: "var(--space-4)",
          }}
        >
          <IconBell size={16} /> مركز التنبيهات
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          <div>
            <h1
              className="page-title"
              style={{
                marginBottom: "var(--space-3)",
              }}
            >
              الإشعارات
            </h1>

            <p
              style={{
                color: "var(--color-text-secondary)",
                lineHeight: 1.9,
                maxWidth: "720px",
              }}
            >
              تابع آخر التحديثات المتعلقة ببلاغاتك ومطابقاتك
              ومطالبات الملكية وعمليات الاستلام والتسليم.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <div
              className="card"
              style={{
                minWidth: "130px",
                padding: "var(--space-4)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-1)",
                }}
              >
                غير المقروءة
              </div>

              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: "var(--color-primary)",
                }}
              >
                {unreadCount}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => markAllAsRead()}
                disabled={loading}
              >
                {loading ? "جارٍ التحديث..." : "تحديد الكل كمقروء"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginBottom: "var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "var(--space-2)",
        }}
      >
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`btn btn-sm ${
            filter === "all" ? "btn-primary" : "btn-ghost"
          }`}
        >
          كافة الإشعارات ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`btn btn-sm ${
            filter === "unread" ? "btn-primary" : "btn-ghost"
          }`}
        >
          غير المقروءة ({unreadCount})
        </button>
      </div>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "var(--space-12)",
          }}
        >
          <div
            style={{
              marginBottom: "var(--space-5)",
              color: "var(--color-text-muted)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <IconBell size={56} strokeWidth={1.2} />
          </div>

          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 700,
              marginBottom: "var(--space-2)",
            }}
          >
            {filter === "unread"
              ? "لا توجد إشعارات غير مقروءة"
              : "لا توجد إشعارات حتى الآن"}
          </h2>

          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.8,
              maxWidth: "560px",
              margin: "0 auto",
            }}
          >
            ستظهر هنا التنبيهات الجديدة المتعلقة بالمطابقات
            والمطالبات وعمليات الاستلام والتسليم.
          </p>
        </div>
      ) : (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {filteredNotifications.map((notification) => {
            const isUnread = !notification.readAt;
            const visual = getNotificationVisual(notification.type);

            return (
              <article
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="card"
                style={{
                  cursor: notification.link ? "pointer" : "default",
                  borderRight: isUnread
                    ? "4px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  background: isUnread ? "hsl(215, 90%, 99%)" : "#fff",
                  padding: "var(--space-5)",
                  transition: "box-shadow 150ms, border-color 150ms",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "var(--radius-md)",
                        background: visual.iconBackground,
                        color: visual.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {visual.icon}
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          marginBottom: "var(--space-1)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "0.2rem 0.6rem",
                            borderRadius: "999px",
                            background: visual.badgeBackground,
                            color: visual.badgeColor,
                          }}
                        >
                          {visual.badge}
                        </span>

                        <span
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: "var(--font-size-base)",
                          fontWeight: isUnread ? 800 : 700,
                          margin: 0,
                        }}
                      >
                        {notification.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.8,
                    margin: "0 0 var(--space-4) 0",
                  }}
                >
                  {notification.body}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "var(--space-3)",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  <div>
                    {notification.link && (
                      <span
                        style={{
                          color: "var(--color-primary)",
                          fontWeight: 700,
                        }}
                      >
                        عرض التفاصيل ←
                      </span>
                    )}
                  </div>

                  <div>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markAsRead(notification.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-text-muted)",
                          cursor: "pointer",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-1)",
                        }}
                      >
                        <IconCheck size={14} /> تحديد كمقروء
                      </button>
                    ) : (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-1)",
                        }}
                      >
                        <IconCheck size={14} /> مقروء
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}