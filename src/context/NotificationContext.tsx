"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
const POLL_INTERVAL_MS = 9000;

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
  const notificationsRef = useRef(initialNotifications);
  const unreadCountRef = useRef(initialUnreadCount);
  const locallyReadIdsRef = useRef(new Map<string, string>());
  const pendingReadsRef = useRef(
    new Map<string, { previous: NotificationItem; optimisticReadAt: string }>(),
  );
  const pendingMarkAllRef = useRef<{
    notifications: NotificationItem[];
    unreadCount: number;
    optimisticReadAt: string;
  } | null>(null);
  const fetchInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    notificationsRef.current = notifications;
    unreadCountRef.current = unreadCount;
  }, [notifications, unreadCount]);

  const fetchLatest = useCallback(async () => {
    const inFlight = fetchInFlightRef.current;
    if (inFlight) return inFlight;

    const request = (async () => {
      try {
        const res = await fetch("/api/notifications?limit=50", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache, no-store" },
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data.notifications)) return;

        const serverNotifications = data.notifications as NotificationItem[];
        const currentById = new Map(notificationsRef.current.map((notification) => [notification.id, notification]));
        const mergedNotifications = serverNotifications.map((notification) => {
          const current = currentById.get(notification.id);
          if (notification.readAt) {
            locallyReadIdsRef.current.delete(notification.id);
            return notification;
          }

          const locallyReadAt = locallyReadIdsRef.current.get(notification.id);
          if (locallyReadAt) return { ...notification, readAt: locallyReadAt };
          if (current?.readAt) return { ...notification, readAt: current.readAt };
          return notification;
        });

        setNotifications(mergedNotifications);

        if (typeof data.unreadCount === "number") {
          let nextUnreadCount = data.unreadCount;
          for (const notification of serverNotifications) {
            if (
              !notification.readAt &&
              (locallyReadIdsRef.current.has(notification.id) || Boolean(currentById.get(notification.id)?.readAt))
            ) {
              nextUnreadCount -= 1;
            }
          }

          setUnreadCount(pendingMarkAllRef.current ? 0 : Math.max(0, nextUnreadCount));
        }
      } catch (error) {
        console.error("[NotificationContext] Failed to fetch notifications", error);
      }
    })();

    fetchInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (fetchInFlightRef.current === request) fetchInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void fetchLatest();
    };

    void fetchLatest();
    const interval = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [fetchLatest]);

  const markAsRead = useCallback(async (id: string) => {
    const previous = notificationsRef.current.find((notification) => notification.id === id);
    if (!previous || previous.readAt || pendingReadsRef.current.has(id)) return;

    const optimisticReadAt = new Date().toISOString();
    pendingReadsRef.current.set(id, { previous, optimisticReadAt });
    locallyReadIdsRef.current.set(id, optimisticReadAt);
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, readAt: optimisticReadAt } : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store" },
      });
      if (!res.ok) throw new Error("Notification read request failed");
      pendingReadsRef.current.delete(id);
      locallyReadIdsRef.current.delete(id);
    } catch (err) {
      const pendingRead = pendingReadsRef.current.get(id);
      pendingReadsRef.current.delete(id);
      locallyReadIdsRef.current.delete(id);
      if (pendingRead && !pendingMarkAllRef.current) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id && notification.readAt === pendingRead.optimisticReadAt
              ? pendingRead.previous
              : notification,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
      console.error("[NotificationContext] Failed to mark notification as read", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notificationsRef.current;
    const previousUnreadCount = unreadCountRef.current;
    const optimisticReadAt = new Date().toISOString();
    pendingMarkAllRef.current = {
      notifications: previousNotifications,
      unreadCount: previousUnreadCount,
      optimisticReadAt,
    };
    previousNotifications.forEach((notification) => {
      if (!notification.readAt) locallyReadIdsRef.current.set(notification.id, optimisticReadAt);
    });
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        readAt: notification.readAt || optimisticReadAt,
      })),
    );
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store" },
      });
      if (!res.ok) throw new Error("Mark-all-read request failed");
      if (pendingMarkAllRef.current?.optimisticReadAt === optimisticReadAt) {
        pendingMarkAllRef.current = null;
        previousNotifications.forEach((notification) => locallyReadIdsRef.current.delete(notification.id));
      }
    } catch (err) {
      if (pendingMarkAllRef.current?.optimisticReadAt === optimisticReadAt) {
        pendingMarkAllRef.current = null;
        previousNotifications.forEach((notification) => locallyReadIdsRef.current.delete(notification.id));
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
      }
      console.error("[NotificationContext] Failed to mark all as read", err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      await fetchLatest();
    } finally {
      setLoading(false);
    }
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
