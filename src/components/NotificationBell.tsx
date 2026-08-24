"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications?limit=6");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore network errors silently
    }
  }

  useEffect(() => {
    fetchNotifications();

    // فحص دوري خفيف كل دقيقة
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleMarkAsRead(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllAsRead() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleItemClick(notif: NotificationItem) {
    if (!notif.readAt) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  }

  function formatTime(dateVal: string | Date) {
    const d = new Date(dateVal);
    return d.toLocaleDateString("ar-YE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="التنبيهات والإشعارات"
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "var(--space-2)",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-full)",
          transition: "background 150ms",
        }}
      >
        {/* أيقونة جرس SVG نظيفة */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              insetInlineEnd: "2px",
              minWidth: "18px",
              height: "18px",
              padding: "0 4px",
              backgroundColor: "var(--color-danger)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              border: "2px solid #fff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات المنسدلة Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineEnd: 0,
            width: "320px",
            maxWidth: "90vw",
            background: "#fff",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-secondary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700 }}>الإشعارات</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                  }}
                >
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "350px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-8) var(--space-4)",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                لا توجد إشعارات حالياً
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderBottom: "1px solid var(--color-border)",
                      cursor: "pointer",
                      background: isUnread ? "hsl(215, 90%, 98%)" : "transparent",
                      transition: "background 150ms",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                      <div style={{ fontWeight: isUnread ? 700 : 600, fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)" }}>
                        {n.title}
                      </div>
                      {isUnread && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "var(--color-primary)",
                            flexShrink: 0,
                            marginTop: "4px",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-secondary)",
                        marginTop: "var(--space-1)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {n.body}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--color-text-muted)",
                        marginTop: "var(--space-2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{formatTime(n.createdAt)}</span>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "10px",
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          تحديد كمقروء
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              textAlign: "center",
              background: "var(--color-bg-secondary)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                color: "var(--color-primary)",
                textDecoration: "none",
                display: "block",
                padding: "var(--space-1)",
              }}
            >
              عرض كافة الإشعارات ←
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
