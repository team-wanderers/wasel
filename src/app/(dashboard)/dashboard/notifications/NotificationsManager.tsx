"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationItem } from "@/components/NotificationBell";

interface Props {
  initialNotifications: NotificationItem[];
}

type NotificationVisual = {
  icon: string;
  iconBackground: string;
  iconColor: string;
  badge: string;
  badgeBackground: string;
  badgeColor: string;
};

export default function NotificationsManager({
  initialNotifications,
}: Props) {
  const router = useRouter();

  const [list, setList] =
    useState<NotificationItem[]>(initialNotifications);

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);

  const unreadCount = list.filter(
    (notification) => !notification.readAt,
  ).length;

  const filteredNotifications = list.filter((notification) =>
    filter === "unread" ? !notification.readAt : true,
  );

  function getNotificationVisual(type: string): NotificationVisual {
    if (type.startsWith("match")) {
      return {
        icon: "🎯",
        iconBackground: "bg-blue-100",
        iconColor: "text-blue-700",
        badge: "مطابقة ذكية",
        badgeBackground: "bg-blue-100",
        badgeColor: "text-blue-700",
      };
    }

    if (type.startsWith("claim")) {
      return {
        icon: "🔐",
        iconBackground: "bg-yellow-100",
        iconColor: "text-yellow-700",
        badge: "مطالبة ملكية",
        badgeBackground: "bg-yellow-100",
        badgeColor: "text-yellow-700",
      };
    }

    if (type.startsWith("recovery")) {
      return {
        icon: "📦",
        iconBackground: "bg-green-100",
        iconColor: "text-green-700",
        badge: "استلام وتسليم",
        badgeBackground: "bg-green-100",
        badgeColor: "text-green-700",
      };
    }

    return {
      icon: "ℹ️",
      iconBackground: "bg-purple-100",
      iconColor: "text-purple-700",
      badge: "النظام",
      badgeBackground: "bg-purple-100",
      badgeColor: "text-purple-700",
    };
  }

  function formatTime(dateValue: string | Date) {
    return new Date(dateValue).toLocaleString("ar-YE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function handleMarkAsRead(
    id: string,
    event?: React.MouseEvent,
  ) {
    event?.stopPropagation();

    const target = list.find(
      (notification) => notification.id === id,
    );

    if (!target || target.readAt) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        return;
      }

      setList((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                readAt: new Date().toISOString(),
              }
            : notification,
        ),
      );

      // مهم: مزامنة NotificationBell بعد PR #48
      window.dispatchEvent(
        new CustomEvent("notifications-updated"),
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error,
      );
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/notifications/read-all",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        return;
      }

      const now = new Date().toISOString();

      setList((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? now,
        })),
      );

      // مهم: مزامنة NotificationBell بعد PR #48
      window.dispatchEvent(
        new CustomEvent("notifications-updated", {
          detail: { unreadCount: 0 },
        }),
      );
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNotificationClick(
    notification: NotificationItem,
  ) {
    if (!notification.readAt) {
      void handleMarkAsRead(notification.id);
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
          🔔 مركز التنبيهات
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
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                {loading
                  ? "جارٍ التحديث..."
                  : "تحديد الكل كمقروء"}
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
            filter === "all"
              ? "btn-primary"
              : "btn-ghost"
          }`}
        >
          كافة الإشعارات ({list.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`btn btn-sm ${
            filter === "unread"
              ? "btn-primary"
              : "btn-ghost"
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
              fontSize: "4rem",
              marginBottom: "var(--space-5)",
            }}
          >
            🔔
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
            const visual = getNotificationVisual(
              notification.type,
            );

            return (
              <article
                key={notification.id}
                onClick={() =>
                  handleNotificationClick(notification)
                }
                className="card"
                style={{
                  cursor: notification.link
                    ? "pointer"
                    : "default",
                  borderRight: isUnread
                    ? "4px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  background: isUnread
                    ? "hsl(215, 90%, 99%)"
                    : "#fff",
                  padding: "var(--space-5)",
                  transition:
                    "box-shadow 150ms ease, border-color 150ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                  }}
                >
                  <div
                    className={`${visual.iconBackground} ${visual.iconColor}`}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "var(--radius-lg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {visual.icon}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-3)",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            flexWrap: "wrap",
                          }}
                        >
                          <h2
                            style={{
                              fontSize: "var(--font-size-lg)",
                              fontWeight: isUnread
                                ? 800
                                : 700,
                              margin: 0,
                            }}
                          >
                            {notification.title}
                          </h2>

                          {isUnread && (
                            <span
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background:
                                  "var(--color-primary)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </div>

                        <span
                          style={{
                            fontSize:
                              "var(--font-size-xs)",
                            color:
                              "var(--color-text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatTime(
                            notification.createdAt,
                          )}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "0.3rem 0.65rem",
                            borderRadius: "999px",
                            background:
                              visual.badgeBackground,
                            color: visual.badgeColor,
                            fontSize:
                              "var(--font-size-xs)",
                            fontWeight: 700,
                          }}
                        >
                          {visual.badge}
                        </span>
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize:
                          "var(--font-size-sm)",
                        color:
                          "var(--color-text-secondary)",
                        lineHeight: 1.8,
                        margin:
                          "var(--space-3) 0 var(--space-4)",
                      }}
                    >
                      {notification.body}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: "var(--space-3)",
                        flexWrap: "wrap",
                        borderTop:
                          "1px solid var(--color-border)",
                        paddingTop: "var(--space-3)",
                      }}
                    >
                      <div>
                        {notification.link && (
                          <span
                            style={{
                              color:
                                "var(--color-primary)",
                              fontSize:
                                "var(--font-size-sm)",
                              fontWeight: 700,
                            }}
                          >
                            عرض التفاصيل ←
                          </span>
                        )}
                      </div>

                      {isUnread ? (
                        <button
                          type="button"
                          onClick={(event) =>
                            handleMarkAsRead(
                              notification.id,
                              event,
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color:
                              "var(--color-text-secondary)",
                            cursor: "pointer",
                            textDecoration:
                              "underline",
                            fontSize:
                              "var(--font-size-sm)",
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          تحديد كمقروء
                        </button>
                      ) : (
                        <span
                          style={{
                            color:
                              "var(--color-text-muted)",
                            fontSize:
                              "var(--font-size-sm)",
                          }}
                        >
                          ✓ تمت القراءة
                        </span>
                      )}
                    </div>
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