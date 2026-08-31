import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { lostItems, foundItems, matches, claims, recoveries } from "@/db/schema";
import { eq, count, desc, or, and, inArray, ne, isNull } from "drizzle-orm";
import { formatRelativeAr } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import {
  IconBookmark,
  IconBriefcase,
  IconChevron,
  IconFileText,
  IconPlus,
  IconShield,
  IconHandshake,
  IconSearch,
  IconCheck,
  IconAlertTriangle,
} from "@/components/icons";
import { DashboardLiveSync } from "@/components/DashboardLiveSync";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const user = await requireUser();

  const [
    lostCountRow,
    foundCountRow,
    pendingMatchRows,
    outgoingClaimRows,
    lostRows,
    foundRows,
    activeRecoveryRows,
    incomingClaimRows,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(lostItems)
      .where(and(eq(lostItems.userId, user.id), eq(lostItems.status, "open"))),

    db
      .select({ count: count() })
      .from(foundItems)
      .where(and(eq(foundItems.userId, user.id), eq(foundItems.status, "open"))),

    db
      .select({
        id: matches.id,
        status: matches.status,
        lostUserConfirmedAt: matches.lostUserConfirmedAt,
        foundUserConfirmedAt: matches.foundUserConfirmedAt,
        createdAt: matches.createdAt,
        lostTitle: lostItems.title,
        lostUserId: lostItems.userId,
        foundTitle: foundItems.title,
        foundUserId: foundItems.userId,
        recoveryStatus: recoveries.status,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .leftJoin(claims, eq(claims.matchId, matches.id))
      .leftJoin(recoveries, eq(recoveries.claimId, claims.id))
      .where(
        and(
          or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)),
          inArray(matches.status, ["suggested", "accepted"]),
          eq(lostItems.status, "open"),
          eq(foundItems.status, "open"),
          or(isNull(recoveries.status), ne(recoveries.status, "completed"))
        )
      )
      .orderBy(desc(matches.createdAt))
      .limit(10),

    db
      .select({
        id: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        foundTitle: foundItems.title,
        recoveryStatus: recoveries.status,
      })
      .from(claims)
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .leftJoin(recoveries, eq(recoveries.claimId, claims.id))
      .where(
        and(
          eq(claims.claimantId, user.id),
          inArray(claims.status, ["pending", "verified"]),
          or(isNull(recoveries.status), ne(recoveries.status, "completed"))
        )
      )
      .orderBy(desc(claims.createdAt))
      .limit(5),

    db
      .select({ id: lostItems.id, title: lostItems.title, createdAt: lostItems.createdAt })
      .from(lostItems)
      .where(eq(lostItems.userId, user.id))
      .orderBy(desc(lostItems.createdAt))
      .limit(4),

    db
      .select({ id: foundItems.id, title: foundItems.title, createdAt: foundItems.createdAt })
      .from(foundItems)
      .where(eq(foundItems.userId, user.id))
      .orderBy(desc(foundItems.createdAt))
      .limit(4),

    db
      .select({
        id: recoveries.id,
        status: recoveries.status,
        scheduledAt: recoveries.scheduledAt,
        lostTitle: lostItems.title,
        foundTitle: foundItems.title,
      })
      .from(recoveries)
      .innerJoin(claims, eq(recoveries.claimId, claims.id))
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(
        and(
          or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)),
          inArray(recoveries.status, ["scheduled", "deposited", "in_progress"])
        )
      )
      .limit(3),

    db
      .select({
        id: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        lostTitle: lostItems.title,
        recoveryStatus: recoveries.status,
      })
      .from(claims)
      .innerJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(recoveries, eq(recoveries.claimId, claims.id))
      .where(
        and(
          eq(foundItems.userId, user.id),
          inArray(claims.status, ["pending", "verified"]),
          or(isNull(recoveries.status), ne(recoveries.status, "completed"))
        )
      )
      .limit(5),
  ]);

  const [lostMedia, foundMedia] = await Promise.all([
    getFirstMediaMap(lostRows.map((r) => r.id), "lost"),
    getFirstMediaMap(foundRows.map((r) => r.id), "found"),
  ]);

  const lostCount = Number(lostCountRow[0]?.count ?? 0);
  const foundCount = Number(foundCountRow[0]?.count ?? 0);
  const outgoingClaimCount = outgoingClaimRows.length;
  const incomingClaimCount = incomingClaimRows.length;
  const activeRecoveryCount = activeRecoveryRows.length;

  const pendingConfirmMatches = pendingMatchRows.filter((m) => {
    if (m.lostUserId === user.id && !m.lostUserConfirmedAt) return true;
    if (m.foundUserId === user.id && !m.foundUserConfirmedAt) return true;
    return false;
  });

  const pendingMatchCount = pendingConfirmMatches.length;

  const hasAnyActivity =
    lostRows.length > 0 ||
    foundRows.length > 0 ||
    pendingMatchRows.length > 0 ||
    outgoingClaimRows.length > 0 ||
    incomingClaimRows.length > 0;

  const claimsTabHref =
    incomingClaimCount > 0
      ? "/dashboard/claims?tab=incoming"
      : outgoingClaimCount > 0
      ? "/dashboard/claims?tab=outgoing"
      : "/dashboard/claims";

  const stats = [
    {
      label: "مفقوداتي المفتوحة",
      hint: "بلاغات نشطة",
      value: lostCount,
      href: "/dashboard/items?type=lost",
      icon: <IconBriefcase size={22} />,
      tone: "is-blue",
    },
    {
      label: "معثوراتي المفتوحة",
      hint: "أبلغت عن العثور عليها",
      value: foundCount,
      href: "/dashboard/items?type=found",
      icon: <IconBookmark size={22} />,
      tone: "is-green",
    },
    {
      label: "مطابقات معلقة",
      hint: "تنتظر تأكيدك",
      value: pendingMatchCount,
      href: "/dashboard/matches?tab=pending",
      icon: <IconShield size={22} />,
      tone: "is-orange",
    },
    {
      label: "طلبات الاسترداد",
      hint: `${outgoingClaimCount} صادرة / ${incomingClaimCount} واردة`,
      value: outgoingClaimCount + incomingClaimCount,
      href: claimsTabHref,
      icon: <IconFileText size={22} />,
      tone: "is-purple",
    },
  ];

  return (
    <>
      <DashboardLiveSync />
      <h1 className="page-title">لوحة التحكم</h1>

      <section className="portal-stats">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <span className={`portal-stat-ico ${s.tone}`}>{s.icon}</span>
            <div>
              <strong>{s.value}</strong>
              <b>{s.label}</b>
              <small>{s.hint}</small>
            </div>
          </Link>
        ))}
      </section>

      <div className="portal-actions">
        <Link href="/dashboard/report" className="portal-btn portal-btn-solid">
          <IconPlus size={18} />
          أضف بلاغ
        </Link>
        <Link href="/search" className="portal-btn portal-btn-ghost">
          <IconSearch size={18} />
          استعراض البلاغات
        </Link>
        <Link href="/dashboard/matches" className="portal-btn portal-btn-ghost">
          <IconShield size={18} />
          المطابقات الذكية
        </Link>
      </div>

      {!hasAnyActivity && (
        <article className="portal-card" style={{ textAlign: "center", padding: "var(--space-12) var(--space-8)", marginTop: "var(--space-4)" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--color-bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto var(--space-4)",
              color: "var(--color-text-muted)",
            }}
          >
            <IconHandshake size={34} />
          </div>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
            مرحباً بك في واصل
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", maxWidth: 380, margin: "0 auto var(--space-6)" }}>
            لم تُضف أي بلاغات بعد. ابدأ بإضافة بلاغ مفقود أو موجود لتتواصل مع أصحابه.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard/report" className="btn btn-primary">
              <IconPlus size={16} />
              أضف بلاغ
            </Link>
            <Link href="/search" className="btn btn-ghost">
              <IconSearch size={16} />
              البحث في البلاغات
            </Link>
          </div>
        </article>
      )}

      {hasAnyActivity && (
        <>
          <div className="portal-grid">

            <article className="portal-card">
              <div className="portal-card-head">
                <h2>مطابقات تنتظر إجراءك</h2>
                <Link href="/dashboard/matches?tab=pending">عرض الكل</Link>
              </div>
              {pendingConfirmMatches.length === 0 ? (
                <p className="portal-empty">
                  <IconCheck size={32} style={{ color: "var(--color-success)" }} />
                  لا توجد مطابقات تنتظر تأكيدك حالياً.
                  <Link href="/dashboard/matches" className="btn btn-ghost btn-sm">استعراض المطابقات</Link>
                </p>
              ) : (
                <>
                  <ul className="portal-latest">
                    {pendingConfirmMatches.map((m) => {
                      const iLost = m.lostUserId === user.id;
                      const itemTitle = iLost ? m.lostTitle : m.foundTitle;
                      const otherTitle = iLost ? m.foundTitle : m.lostTitle;
                      return (
                        <li key={m.id}>
                          <Link href="/dashboard/matches?tab=pending">
                            <span className="portal-thumb">
                              <IconShield size={20} />
                            </span>
                            <span>
                              <b>{itemTitle}</b>
                              <small>مطابقة مع: {otherTitle} · {formatRelativeAr(m.createdAt)}</small>
                            </span>
                            <em style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>
                              يحتاج تأكيدك
                            </em>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/dashboard/matches?tab=pending" className="portal-more">
                    مراجعة المطابقات
                    <IconChevron size={16} />
                  </Link>
                </>
              )}
            </article>

            <article className="portal-card">
              <div className="portal-card-head">
                <h2>مطالباتي الصادرة</h2>
                <Link href="/dashboard/claims?tab=outgoing">عرض الكل</Link>
              </div>
              {outgoingClaimRows.length === 0 ? (
                <p className="portal-empty">
                  <IconFileText size={32} style={{ color: "var(--color-text-muted)" }} />
                  لم تُقدّم أي مطالبة باسترداد بعد.
                  <Link href="/dashboard/matches" className="btn btn-ghost btn-sm">استعراض المطابقات</Link>
                </p>
              ) : (
                <>
                  <ul className="portal-latest">
                    {outgoingClaimRows.map((c) => {
                      const statusBadge =
                        c.status === "verified"
                          ? { label: "مقبولة", bg: "#d1fae5", color: "#059669" }
                          : c.status === "rejected"
                          ? { label: "مرفوضة", bg: "var(--color-danger-light)", color: "var(--color-danger)" }
                          : { label: "قيد المراجعة", bg: "var(--color-warning-light)", color: "var(--color-warning)" };
                      return (
                        <li key={c.id}>
                          <Link href="/dashboard/claims?tab=outgoing">
                            <span className="portal-thumb">
                              <IconFileText size={20} />
                            </span>
                            <span>
                              <b>{c.foundTitle ?? "غرض مطالَب"}</b>
                              <small>{c.createdAt ? formatRelativeAr(c.createdAt) : ""}</small>
                            </span>
                            <em style={{ background: statusBadge.bg, color: statusBadge.color }}>
                              {statusBadge.label}
                            </em>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/dashboard/claims?tab=outgoing" className="portal-more">
                    إدارة مطالباتي
                    <IconChevron size={16} />
                  </Link>
                </>
              )}
            </article>

            <article className="portal-card">
              <div className="portal-card-head">
                <h2>عمليات الاستلام الجارية</h2>
                <Link href="/dashboard/recoveries">عرض الكل</Link>
              </div>
              {activeRecoveryCount === 0 ? (
                <p className="portal-empty">
                  <IconHandshake size={32} style={{ color: "var(--color-text-muted)" }} />
                  لا توجد عمليات تسليم جارية.
                </p>
              ) : (
                <>
                  <ul className="portal-latest">
                    {activeRecoveryRows.map((r) => {
                      const title = r.foundTitle ?? r.lostTitle ?? "غرض للتسليم";
                      const statusBadge =
                        r.status === "deposited"
                          ? { label: "مودع في المركز", bg: "hsl(172,55%,92%)", color: "hsl(172,55%,30%)" }
                          : r.status === "in_progress"
                          ? { label: "بانتظار الاستلام", bg: "var(--color-warning-light)", color: "var(--color-warning)" }
                          : { label: "مجدول", bg: "hsl(200,60%,92%)", color: "hsl(200,60%,30%)" };
                      return (
                        <li key={r.id}>
                          <Link href="/dashboard/recoveries">
                            <span className="portal-thumb">
                              <IconHandshake size={20} />
                            </span>
                            <span>
                              <b>{title}</b>
                              <small>
                                {r.scheduledAt
                                  ? new Date(r.scheduledAt).toLocaleDateString("ar-YE", { month: "short", day: "numeric" })
                                  : "موعد غير محدد"}
                              </small>
                            </span>
                            <em style={{ background: statusBadge.bg, color: statusBadge.color }}>
                              {statusBadge.label}
                            </em>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/dashboard/recoveries" className="portal-more">
                    تفاصيل التسليم
                    <IconChevron size={16} />
                  </Link>
                </>
              )}
            </article>
          </div>

          <div className="portal-split" style={{ marginTop: "var(--space-4)" }}>
            <article className="portal-card">
              <div className="portal-card-head">
                <h2>آخر بلاغاتي</h2>
                <Link href="/dashboard/items">إدارة البلاغات</Link>
              </div>
              {lostRows.length === 0 && foundRows.length === 0 ? (
                <p className="portal-empty">
                  <IconBriefcase size={32} style={{ color: "var(--color-text-muted)" }} />
                  لم تُضف أي بلاغات بعد.
                  <Link href="/dashboard/report" className="btn btn-primary btn-sm">
                    <IconPlus size={14} />
                    أضف بلاغ
                  </Link>
                </p>
              ) : (
                <>
                  <ul className="portal-latest">
                    {[
                      ...lostRows.map((r) => ({
                        key: `lost-${r.id}`,
                        href: "/dashboard/items?type=lost",
                        title: r.title,
                        meta: formatRelativeAr(r.createdAt),
                        badge: { label: "مفقود", bg: "var(--color-primary-light)", color: "var(--color-primary)" },
                        imageSrc: lostMedia.get(r.id) ?? null,
                        at: new Date(r.createdAt).getTime(),
                      })),
                      ...foundRows.map((r) => ({
                        key: `found-${r.id}`,
                        href: "/dashboard/items?type=found",
                        title: r.title,
                        meta: formatRelativeAr(r.createdAt),
                        badge: { label: "موجود", bg: "#d1fae5", color: "#059669" },
                        imageSrc: foundMedia.get(r.id) ?? null,
                        at: new Date(r.createdAt).getTime(),
                      })),
                    ]
                      .sort((a, b) => b.at - a.at)
                      .slice(0, 6)
                      .map((item) => (
                        <li key={item.key}>
                          <Link href={item.href}>
                            <span className="portal-thumb">
                              {item.imageSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageSrc} alt="" />
                              ) : (
                                <IconFileText size={20} />
                              )}
                            </span>
                            <span>
                              <b>{item.title}</b>
                              <small>{item.meta}</small>
                            </span>
                            <em style={{ background: item.badge.bg, color: item.badge.color }}>
                              {item.badge.label}
                            </em>
                          </Link>
                        </li>
                      ))}
                  </ul>
                  <Link href="/dashboard/items" className="portal-more">
                    إدارة بلاغاتي
                    <IconChevron size={16} />
                  </Link>
                </>
              )}
            </article>

            <article className="portal-card">
              <div className="portal-card-head">
                <h2>مطالبات واردة</h2>
                <Link href="/dashboard/claims?tab=incoming">عرض الكل</Link>
              </div>
              {incomingClaimRows.length === 0 ? (
                <p className="portal-empty">
                  <IconAlertTriangle size={28} style={{ color: "var(--color-text-muted)" }} />
                  لا توجد مطالبات واردة على معثوراتك.
                </p>
              ) : (
                <>
                  <ul className="portal-latest">
                    {incomingClaimRows.map((c) => (
                      <li key={c.id}>
                        <Link href="/dashboard/claims?tab=incoming">
                          <span className="portal-thumb">
                            <IconFileText size={20} />
                          </span>
                          <span>
                            <b>{c.lostTitle ?? "غرض مطالَب"}</b>
                            <small>{c.createdAt ? formatRelativeAr(c.createdAt) : ""}</small>
                          </span>
                          {c.status === "pending" && (
                            <em style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>
                              قيد المراجعة
                            </em>
                          )}
                          {c.status === "verified" && <em>مقبولة</em>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard/claims?tab=incoming" className="portal-more">
                    مراجعة المطالبات
                    <IconChevron size={16} />
                  </Link>
                </>
              )}
            </article>
          </div>
        </>
      )}
    </>
  );
}
