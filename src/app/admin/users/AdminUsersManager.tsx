"use client";

import { useState, useMemo } from "react";
import {
  IconSearch,
  IconShield,
  IconUser,
  IconCheck,
  IconAlertTriangle,
} from "@/components/icons";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string | Date;
}

interface Props {
  initialUsers: AdminUser[];
  currentAdminId: string;
}

const roleConfig: Record<
  "user" | "admin",
  { label: string; bg: string; color: string; border: string }
> = {
  user: {
    label: "مستخدم",
    bg: "hsl(215,20%,94%)",
    color: "hsl(215,20%,40%)",
    border: "hsl(215,20%,82%)",
  },
  admin: {
    label: "مشرف النظام",
    bg: "hsl(215,90%,94%)",
    color: "hsl(215,90%,35%)",
    border: "hsl(215,80%,82%)",
  },
};

export default function AdminUsersManager({ initialUsers, currentAdminId }: Props) {
  const [usersList, setUsersList] = useState<AdminUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return usersList.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [usersList, searchQuery, roleFilter]);

  async function handleRoleChange(userId: string, newRole: "user" | "admin") {
    if (updatingId) return;
    setUpdatingId(userId);
    setFeedbackMap((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedbackMap((prev) => ({
          ...prev,
          [userId]: { type: "error", message: data.error ?? "حدث خطأ غير متوقع" },
        }));
        return;
      }

      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setFeedbackMap((prev) => ({
        ...prev,
        [userId]: {
          type: "success",
          message: `تم تغيير الدور إلى "${roleConfig[newRole].label}" بنجاح`,
        },
      }));

      setTimeout(() => {
        setFeedbackMap((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 4000);
    } catch {
      setFeedbackMap((prev) => ({
        ...prev,
        [userId]: { type: "error", message: "تعذّر الاتصال بالخادم، يرجى المحاولة مجدداً" },
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  const totalAdmins = usersList.filter((u) => u.role === "admin").length;
  const totalUsers = usersList.filter((u) => u.role === "user").length;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          إدارة المستخدمين والأدوار
        </h1>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
          استعرض حسابات المستخدمين المسجلين وقم بتعديل أدوارهم وصلاحياتهم.
        </p>
      </div>

      {/* إحصائيات سريعة */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "إجمالي المستخدمين", value: usersList.length, color: "hsl(215,60%,35%)", bg: "hsl(215,60%,94%)" },
          { label: "المشرفون", value: totalAdmins, color: "hsl(215,90%,35%)", bg: "hsl(215,90%,94%)" },
          { label: "المستخدمون العاديون", value: totalUsers, color: "hsl(215,20%,40%)", bg: "hsl(215,20%,94%)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ textAlign: "center", padding: "var(--space-4)" }}
          >
            <div
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: 800,
                color: stat.color,
                background: stat.bg,
                borderRadius: "var(--radius-full)",
                width: 56,
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-2)",
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* أدوات الفلترة والبحث */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "var(--space-4)",
          padding: "var(--space-4)",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <IconSearch
            size={16}
            style={{
              position: "absolute",
              right: "var(--space-3)",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder="ابحث بالاسم أو البريد..."
            className="input input-sm"
            style={{ paddingRight: "var(--space-8)", width: "100%" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {(["all", "admin", "user"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setRoleFilter(f)}
              className={`btn btn-sm ${roleFilter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {f === "all" ? "الكل" : roleConfig[f].label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginRight: "auto" }}>
          عرض {filtered.length} من {usersList.length} مستخدم
        </div>
      </div>

      {/* جدول المستخدمين */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--color-text-muted)" }}>
          لا توجد نتائج مطابقة لبحثك.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filtered.map((u) => {
            const isSelf = u.id === currentAdminId;
            const isUpdating = updatingId === u.id;
            const feedback = feedbackMap[u.id];
            const rc = roleConfig[u.role];

            return (
              <div
                key={u.id}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--space-4)",
                  padding: "var(--space-4) var(--space-5)",
                  opacity: isSelf ? 0.85 : 1,
                  borderRight: `4px solid ${rc.border}`,
                }}
              >
                {/* أيقونة الدور */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-full)",
                    background: rc.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {u.role === "admin" ? (
                    <IconShield size={18} style={{ color: rc.color }} />
                  ) : (
                    <IconUser size={18} style={{ color: rc.color }} />
                  )}
                </div>

                {/* بيانات المستخدم */}
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--font-size-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    {u.name}
                    {isSelf && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          background: "hsl(38,90%,92%)",
                          color: "hsl(38,90%,30%)",
                          padding: "1px 6px",
                          borderRadius: "var(--radius-full)",
                          border: "1px solid hsl(38,80%,80%)",
                        }}
                      >
                        حسابك الحالي
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px", direction: "ltr", textAlign: "right" }}>
                    {u.email}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    انضم في:{" "}
                    {new Date(u.createdAt).toLocaleDateString("ar-YE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* شارة الدور الحالي */}
                <span
                  style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    background: rc.bg,
                    color: rc.color,
                    border: `1px solid ${rc.border}`,
                    flexShrink: 0,
                  }}
                >
                  {rc.label}
                </span>

                {/* رسالة التغذية الراجعة */}
                {feedback && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      color: feedback.type === "success" ? "hsl(142,60%,30%)" : "hsl(0,70%,40%)",
                    }}
                  >
                    {feedback.type === "success" ? (
                      <IconCheck size={13} strokeWidth={2.4} />
                    ) : (
                      <IconAlertTriangle size={13} />
                    )}
                    {feedback.message}
                  </div>
                )}

                {/* أزرار تغيير الدور */}
                {isSelf ? (
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    لا يمكن تعديل حسابك الخاص
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                    {u.role === "user" ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={isUpdating}
                        onClick={() => handleRoleChange(u.id, "admin")}
                        style={{ minWidth: 120 }}
                      >
                        {isUpdating ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                border: "2px solid currentColor",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                display: "inline-block",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                            جارٍ التحديث...
                          </span>
                        ) : (
                          <>
                            <IconShield size={13} />
                            ترقية لمشرف
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={isUpdating}
                        onClick={() => handleRoleChange(u.id, "user")}
                        style={{ minWidth: 120 }}
                      >
                        {isUpdating ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                border: "2px solid currentColor",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                display: "inline-block",
                                animation: "spin 0.7s linear infinite",
                              }}
                            />
                            جارٍ التحديث...
                          </span>
                        ) : (
                          <>
                            <IconUser size={13} />
                            خفض لمستخدم
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
