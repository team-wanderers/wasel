import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { lostItems, foundItems, matches, claims } from "@/db/schema";
import { eq, count, desc, or } from "drizzle-orm";
import { formatRelativeAr } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import {
  IconBookmark,
  IconBriefcase,
  IconChevron,
  IconFileText,
  IconPlus,
  IconShield,
} from "@/components/icons";

export default async function DashboardHomePage() {
  const user = await requireUser();

  const [lostCountRow, foundCountRow, matchCountRow, claimCountRow, lostRows, foundRows, matchRows] =
    await Promise.all([
      db.select({ count: count() }).from(lostItems).where(eq(lostItems.userId, user.id)),
      db.select({ count: count() }).from(foundItems).where(eq(foundItems.userId, user.id)),
      db
        .select({ count: count() })
        .from(matches)
        .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
        .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
        .where(or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id))),
      db.select({ count: count() }).from(claims).where(eq(claims.claimantId, user.id)),
      db
        .select({
          id: lostItems.id,
          title: lostItems.title,
          createdAt: lostItems.createdAt,
        })
        .from(lostItems)
        .where(eq(lostItems.userId, user.id))
        .orderBy(desc(lostItems.createdAt))
        .limit(6),
      db
        .select({
          id: foundItems.id,
          title: foundItems.title,
          createdAt: foundItems.createdAt,
        })
        .from(foundItems)
        .where(eq(foundItems.userId, user.id))
        .orderBy(desc(foundItems.createdAt))
        .limit(6),
      db
        .select({
          id: matches.id,
          createdAt: matches.createdAt,
          lostId: lostItems.id,
          lostTitle: lostItems.title,
          foundId: foundItems.id,
          foundTitle: foundItems.title,
          lostUserId: lostItems.userId,
        })
        .from(matches)
        .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
        .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
        .where(or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)))
        .orderBy(desc(matches.createdAt))
        .limit(6),
    ]);

  const [lostMedia, foundMedia] = await Promise.all([
    getFirstMediaMap(lostRows.map((r) => r.id), "lost"),
    getFirstMediaMap(
      [...foundRows.map((r) => r.id), ...matchRows.map((r) => r.foundId)],
      "found",
    ),
  ]);

  const activity = [
    ...lostRows.map((item) => ({
      key: `lost-${item.id}`,
      href: `/items/lost/${item.id}`,
      title: `تم الإبلاغ عن ${item.title}`,
      meta: formatRelativeAr(item.createdAt),
      imageSrc: lostMedia.get(item.id) ?? null,
      at: new Date(item.createdAt).getTime(),
    })),
    ...foundRows.map((item) => ({
      key: `found-${item.id}`,
      href: `/items/found/${item.id}`,
      title: `تم العثور على ${item.title}`,
      meta: formatRelativeAr(item.createdAt),
      imageSrc: foundMedia.get(item.id) ?? null,
      at: new Date(item.createdAt).getTime(),
    })),
    ...matchRows.map((item) => ({
      key: `match-${item.id}`,
      href: "/dashboard/matches",
      title: `مطابقة محتملة ل${item.lostUserId === user.id ? item.lostTitle : item.foundTitle}`,
      meta: formatRelativeAr(item.createdAt),
      imageSrc: foundMedia.get(item.foundId) ?? null,
      at: new Date(item.createdAt).getTime(),
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const stats = [
    {
      label: "بلاغات المفقودات",
      hint: "تقاريرك المفتوحة",
      value: Number(lostCountRow[0]?.count ?? 0),
      href: "/dashboard/lost",
      icon: <IconBriefcase size={22} />,
      tone: "is-blue",
    },
    {
      label: "بلاغات الموجودات",
      hint: "ما أبلغت عن العثور عليه",
      value: Number(foundCountRow[0]?.count ?? 0),
      href: "/dashboard/found",
      icon: <IconBookmark size={22} />,
      tone: "is-green",
    },
    {
      label: "المطابقات",
      hint: "اقتراحات النظام",
      value: Number(matchCountRow[0]?.count ?? 0),
      href: "/dashboard/matches",
      icon: <IconShield size={22} />,
      tone: "is-orange",
    },
    {
      label: "المطالبات",
      hint: "طلبات الاسترداد",
      value: Number(claimCountRow[0]?.count ?? 0),
      href: "/dashboard/claims",
      icon: <IconFileText size={22} />,
      tone: "is-purple",
    },
  ];

  return (
    <>
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
        <Link href="/dashboard/lost/new" className="portal-btn portal-btn-solid">
          <IconPlus size={18} />
          أبلغ عن مفقود
        </Link>
        <Link href="/dashboard/found/new" className="portal-btn portal-btn-ghost">
          <IconPlus size={18} />
          أبلغ عن موجود
        </Link>
      </div>

      <article className="portal-card">
        <div className="portal-card-head">
          <h2>النشاط الأخير</h2>
          <Link href="/search">عرض الكل</Link>
        </div>
        {activity.length === 0 ? (
          <p className="portal-empty">لا يوجد نشاط بعد. أضف بلاغاً ليظهر هنا.</p>
        ) : (
          <ul className="portal-latest">
            {activity.map((item) => (
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
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/lost/new" className="portal-more">
          أبلغ عن مفقود
          <IconChevron size={16} />
        </Link>
      </article>
    </>
  );
}
