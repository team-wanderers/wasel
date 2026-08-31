"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({
  children,
  initialNotifications = [],
  initialUnreadCount = 0,
}: {
  children: React.ReactNode;
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const markAllLockUntilRef = React.useRef<number>(0);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store" },
      });
      if (res.ok) {
        const data = await res.json();
        const isLocked = Date.now() < markAllLockUntilRef.current;

        if (Array.isArray(data.notifications)) {
          if (isLocked) {
            setNotifications(
              data.notifications.map((n: NotificationItem) => ({
                ...n,
                readAt: n.readAt ? n.readAt : new Date().toISOString(),
              }))
            );
          } else {
            setNotifications(data.notifications);
          }
        }

        if (typeof data.unreadCount === "number") {
          if (isLocked) {
            setUnreadCount(0);
          } else {
            setUnreadCount(data.unreadCount);
          }
        }
      }
    } catch (e) {
      console.error("[NotificationContext] Failed to fetch notifications", e);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatest();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchLatest]);

  const markAsRead = useCallback(async (id: string) => {
    // 1. Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              readAt: n.readAt ? n.readAt : new Date().toISOString(),
            }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // 2. Background API call
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store" },
      });
    } catch (err) {
      console.error("[NotificationContext] Failed to mark notification as read", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // 1. Set 5-second lock against stale polling overwrite
    markAllLockUntilRef.current = Date.now() + 5000;

    // 2. Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ? n.readAt : new Date().toISOString(),
      }))
    );
    setUnreadCount(0);

    // 3. Background API call
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store" },
      });
    } catch (err) {
      console.error("[NotificationContext] Failed to mark all as read", err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await fetchLatest();
    setLoading(false);
  }, [fetchLatest]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
