"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications, NotificationItem } from "@/context/NotificationContext";

export { type NotificationItem };

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);

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

  function handleItemClick(notif: NotificationItem) {
    if (!notif.readAt) {
      markAsRead(notif.id);
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

  const latestNotifications = notifications.slice(0, 6);

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
              right: "2px",
              background: "var(--color-danger)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              minWidth: "16px",
              height: "16px",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة السريعة Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + var(--space-2))",
            left: "0",
            width: "360px",
            maxWidth: "90vw",
            background: "#fff",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* رأس القائمة */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-bg-secondary)",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700 }}>الإشعارات</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "var(--color-danger-light)",
                    color: "hsl(0,70%,40%)",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  {unreadCount} جديدة
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "11px",
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

          {/* قائمة التنبيهات السريعة */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {latestNotifications.length === 0 ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                لا توجد إشعارات حالياً
              </div>
            ) : (
              latestNotifications.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderBottom: "1px solid var(--color-border)",
                      background: isUnread ? "hsl(215,100%,98%)" : "#fff",
                      cursor: "pointer",
                      display: "flex",
                      gap: "var(--space-3)",
                      alignItems: "flex-start",
                      transition: "background 150ms",
                    }}
                  >
                    {/* نقطة التنبيه غير المقروء */}
                    <div style={{ paddingTop: "6px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "var(--radius-full)",
                          background: isUnread ? "var(--color-primary)" : "transparent",
                          display: "inline-block",
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-2)" }}>
                        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: isUnread ? 700 : 600, color: "var(--color-text)" }}>
                          {notif.title}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--color-text-secondary)",
                          margin: "2px 0 0 0",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {notif.body}
                      </p>
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        title="تحديد كمقروء"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                          padding: "2px",
                          fontSize: "12px",
                          lineHeight: 1,
                        }}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ذيل القائمة */}
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-bg-secondary)",
              borderTop: "1px solid var(--color-border)",
              textAlign: "center",
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
                padding: "var(--space-1) 0",
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
