import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import {
  claims,
  foundItems,
  lostItems,
  matches,
  notifications,
} from "@/db/schema";
import { and, count, eq, isNull, or } from "drizzle-orm";

export default async function ProfilePage() {
  const user = await requireUser();

  const [
    lostResult,
    foundResult,
    matchesResult,
    claimsResult,
    unreadNotificationsResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(lostItems)
      .where(eq(lostItems.userId, user.id)),

    db
      .select({ count: count() })
      .from(foundItems)
      .where(eq(foundItems.userId, user.id)),

    db
      .select({ count: count() })
      .from(matches)
      .innerJoin(
        lostItems,
        eq(matches.lostItemId, lostItems.id),
      )
      .innerJoin(
        foundItems,
        eq(matches.foundItemId, foundItems.id),
      )
      .where(
        or(
          eq(lostItems.userId, user.id),
          eq(foundItems.userId, user.id),
        ),
      ),

    db
      .select({ count: count() })
      .from(claims)
      .where(eq(claims.claimantId, user.id)),

    db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          isNull(notifications.readAt),
        ),
      ),
  ]);

  const lostCount = Number(lostResult[0]?.count ?? 0);
  const foundCount = Number(foundResult[0]?.count ?? 0);
  const matchesCount = Number(matchesResult[0]?.count ?? 0);
  const claimsCount = Number(claimsResult[0]?.count ?? 0);
  const unreadNotificationsCount = Number(
    unreadNotificationsResult[0]?.count ?? 0,
  );

  const stats = [
    {
      href: "/dashboard/lost",
      icon: "📋",
      value: lostCount,
      label: "بلاغات المفقودات",
      background: "hsl(0, 80%, 97%)",
      border: "hsl(0, 70%, 90%)",
      iconBackground: "hsl(0, 80%, 92%)",
    },
    {
      href: "/dashboard/found",
      icon: "📦",
      value: foundCount,
      label: "بلاغات الموجودات",
      background: "hsl(142, 60%, 97%)",
      border: "hsl(142, 50%, 88%)",
      iconBackground: "hsl(142, 55%, 90%)",
    },
    {
      href: "/dashboard/matches",
      icon: "🎯",
      value: matchesCount,
      label: "المطابقات",
      background: "hsl(215, 90%, 97%)",
      border: "hsl(215, 75%, 88%)",
      iconBackground: "hsl(215, 85%, 91%)",
    },
    {
      href: "/dashboard/claims",
      icon: "🔐",
      value: claimsCount,
      label: "المطالبات",
      background: "hsl(38, 90%, 97%)",
      border: "hsl(38, 80%, 87%)",
      iconBackground: "hsl(38, 85%, 89%)",
    },
    {
      href: "/dashboard/notifications",
      icon: "🔔",
      value: unreadNotificationsCount,
      label: "الإشعارات غير المقروءة",
      background: "hsl(270, 70%, 97%)",
      border: "hsl(270, 55%, 89%)",
      iconBackground: "hsl(270, 65%, 92%)",
    },
  ];

  return (
    <div dir="rtl">
      <section style={{ marginBottom: "var(--space-8)" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "0.5rem 0.9rem",
            borderRadius: "999px",
            background: "hsl(215, 90%, 95%)",
            color: "hsl(215, 75%, 40%)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            marginBottom: "var(--space-4)",
          }}
        >
          👤 حسابي
        </span>

        <h1
          className="page-title"
          style={{
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
            marginBottom: "var(--space-3)",
          }}
        >
          الملف الشخصي
        </h1>

        <p
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: 1.9,
            maxWidth: "700px",
          }}
        >
          إدارة معلومات حسابك ومتابعة نشاطك في منصة واصل.
        </p>
      </section>

      <section
        className="card"
        style={{
          overflow: "hidden",
          padding: 0,
          marginBottom: "var(--space-6)",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), hsl(245, 65%, 48%))",
            padding: "var(--space-8)",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-5)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "var(--radius-xl)",
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                flexShrink: 0,
              }}
            >
              👤
            </div>

            <div>
              <h2
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 800,
                  marginBottom: "var(--space-2)",
                }}
              >
                {user.name || "مستخدم واصل"}
              </h2>

              <p
                style={{
                  color: "rgba(255,255,255,0.85)",
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {user.email}
              </p>

              <p
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "var(--font-size-sm)",
                  marginTop: "var(--space-2)",
                }}
              >
                {user.role === "admin"
                  ? "مشرف في منصة واصل"
                  : "عضو في منصة واصل"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: "var(--space-8)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                الاسم الكامل
              </p>

              <p style={{ fontWeight: 700 }}>
                {user.name || "غير مضاف"}
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                البريد الإلكتروني
              </p>

              <p
                style={{
                  fontWeight: 700,
                  direction: "ltr",
                  textAlign: "right",
                  overflowWrap: "anywhere",
                }}
              >
                {user.email}
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                رقم الهاتف
              </p>

              <p
                style={{
                  fontWeight: 700,
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {user.phone || "غير مضاف"}
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                نوع الحساب
              </p>

              <p
                style={{
                  fontWeight: 700,
                  color:
                    user.role === "admin"
                      ? "var(--color-primary)"
                      : "var(--color-success)",
                }}
              >
                {user.role === "admin" ? "مشرف" : "مستخدم"}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "var(--space-8)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: 700,
                marginBottom: "var(--space-5)",
              }}
            >
              نشاط الحساب
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {stats.map((stat) => (
                <Link
                  key={stat.href}
                  href={stat.href}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="card"
                    style={{
                      background: stat.background,
                      borderColor: stat.border,
                      padding: "var(--space-5)",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: stat.iconBackground,
                        fontSize: "1.2rem",
                        marginBottom: "var(--space-4)",
                      }}
                    >
                      {stat.icon}
                    </div>

                    <p
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 800,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {stat.value}
                    </p>

                    <p
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        marginTop: "var(--space-1)",
                      }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: "var(--space-8)",
              paddingTop: "var(--space-6)",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/dashboard"
              className="btn btn-primary"
            >
              العودة إلى لوحة التحكم
            </Link>

            <Link
              href="/dashboard/profile/edit"
              className="btn btn-outline"
            >
              تعديل الملف الشخصي
            </Link>

            <form
              action="/api/auth/logout"
              method="POST"
            >
              <button
                type="submit"
                className="btn btn-outline"
              >
                تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}