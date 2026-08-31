import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { foundItems, pickupPoints, recoveries, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getFirstMediaMap } from "@/lib/media";
import { categoryLabels, formatRelativeAr, searchCategories } from "@/lib/labels";
import MediaImage from "@/components/MediaImage";
import {
  IconBag,
  IconBookmark,
  IconBriefcase,
  IconChevron,
  IconFileText,
  IconHandshake,
  IconKey,
  IconPaw,
  IconPhone,
  IconSearch,
  IconShield,
  IconUsers,
  IconWallet,
  IconWatch,
} from "@/components/icons";

export const metadata: Metadata = {
  title: {
    absolute: "واصل — منصة المفقودات والموجودات في عتق وشبوة",
  },
  description:
    "منصة موحدة للمفقودات والموجودات في عتق ومحافظة شبوة. بلّغ عن مفقوداتك أو ابحث عمّا عُثر عليه.",
};

function fmt(n: number) {
  return n.toLocaleString("ar-EG");
}

const browseCats = [
  { value: "electronics", label: "إلكترونيات", icon: <IconPhone size={40} /> },
  { value: "bags", label: "محافظ وهويات", icon: <IconWallet size={40} /> },
  { value: "documents", label: "وثائق", icon: <IconBag size={40} /> },
  { value: "keys", label: "مفاتيح", icon: <IconKey size={40} /> },
  { value: "jewelry", label: "مجوهرات وساعات", icon: <IconWatch size={40} /> },
  { value: "pets", label: "حيوانات", icon: <IconPaw size={40} /> },
];

export default async function HomePage() {
  const session = await getSession();

  const [foundCountRow, returnedCountRow, userCountRow, pointCountRow, latestFound] =
    await Promise.all([
      db.select({ count: count() }).from(foundItems),
      db
        .select({ count: count() })
        .from(recoveries)
        .where(eq(recoveries.status, "completed")),
      db.select({ count: count() }).from(users),
      db
        .select({ count: count() })
        .from(pickupPoints)
        .where(eq(pickupPoints.isActive, true)),
      db
        .select({
          id: foundItems.id,
          title: foundItems.title,
          category: foundItems.category,
          createdAt: foundItems.createdAt,
        })
        .from(foundItems)
        .orderBy(desc(foundItems.createdAt))
        .limit(3),
    ]);

  const media = await getFirstMediaMap(
    latestFound.map((row) => row.id),
    "found",
  );

  const foundTotal = Number(foundCountRow[0]?.count ?? 0);
  const returnedTotal = Number(returnedCountRow[0]?.count ?? 0);
  const userTotal = Number(userCountRow[0]?.count ?? 0);
  const pointTotal = Number(pointCountRow[0]?.count ?? 0);

  const reportHref = session ? "/dashboard/report?type=lost" : "/register";

  return (
    <>
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <h1>
            منصة موحدة
            <br />
            للمفقودات والموجودات
          </h1>
          <p>بلّغ عن مفقوداتك، أو ابحث عن شيء فُقد في عتق وأي مكان في محافظة شبوة.</p>
        </div>
        <div className="portal-hero-art">
          <Image
            src="/city.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
          />
        </div>
        <form className="portal-search" action="/search" method="get">
          <label className="portal-search-cat">
            <span className="sr-only">التصنيف</span>
            <select name="category" defaultValue="">
              <option value="">جميع التصنيفات</option>
              {searchCategories.map((c) =>
                c.value ? (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ) : null,
              )}
            </select>
          </label>
          <label className="portal-search-q">
            <span className="sr-only">عبارة البحث</span>
            <input
              name="q"
              type="search"
              placeholder="ابحث عن شيء (مثل: محفظة، هاتف، مفاتيح...)"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            بحث
            <IconSearch size={16} />
          </button>
        </form>
      </section>

      <section className="portal-stats">
        <div>
          <span className="portal-stat-ico is-blue">
            <IconBriefcase size={32} />
          </span>
          <div>
            <strong>{fmt(foundTotal)}</strong>
            <b>مفقود تم العثور عليه</b>
            <small>حتى الآن</small>
          </div>
        </div>
        <div>
          <span className="portal-stat-ico is-green">
            <IconBookmark size={32} />
          </span>
          <div>
            <strong>{fmt(returnedTotal)}</strong>
            <b>تمت إعادته</b>
            <small>إلى أصحابه</small>
          </div>
        </div>
        <div>
          <span className="portal-stat-ico is-orange">
            <IconUsers size={32} />
          </span>
          <div>
            <strong>{fmt(userTotal)}</strong>
            <b>مستخدم نشط</b>
            <small>على المنصة</small>
          </div>
        </div>
        <div>
          <span className="portal-stat-ico is-purple">
            <IconShield size={32} />
          </span>
          <div>
            <strong>{fmt(pointTotal)}</strong>
            <b>نقطة أمانة</b>
            <small>تعتمدها المنصة</small>
          </div>
        </div>
      </section>

      <section className="portal-grid">
        <article className="portal-card">
          <h2>كيف تعمل الخدمة</h2>
          <ol className="portal-steps">
            <li>
              <span>
                <IconFileText size={36} />
              </span>
              <div>
                <b>بلّغ</b>
                <p>أبلِغ عن مفقود أو موجود بخطوات بسيطة.</p>
              </div>
            </li>
            <li>
              <span>
                <IconSearch size={36} />
              </span>
              <div>
                <b>طابِق</b>
                <p>نقوم بمطابقة العناصر مع أصحابها.</p>
              </div>
            </li>
            <li>
              <span>
                <IconHandshake size={36} />
              </span>
              <div>
                <b>أَعِد</b>
                <p>نعيد الأشياء إلى أصحابها بأمان وسهولة.</p>
              </div>
            </li>
          </ol>
        </article>

        <article className="portal-card">
          <div className="portal-card-head">
            <h2>تصفح حسب التصنيف</h2>
            <Link href="/search">عرض الكل</Link>
          </div>
          <div className="portal-cats">
            {browseCats.map((cat) => (
              <Link key={cat.value} href={`/search?category=${cat.value}`}>
                {cat.icon}
                {cat.label}
              </Link>
            ))}
          </div>
          <Link href="/search" className="portal-more">
            جميع التصنيفات
            <IconChevron size={16} />
          </Link>
        </article>

        <article className="portal-card">
          <div className="portal-card-head">
            <h2>أحدث المفقودات التي تم العثور عليها</h2>
            <Link href="/search?type=found">عرض الكل</Link>
          </div>
          {latestFound.length === 0 ? (
            <p className="portal-empty">لا توجد موجودات بعد. كن أول من يبلّغ.</p>
          ) : (
            <ul className="portal-latest">
              {latestFound.map((item, index) => {
                const src = media.get(item.id);
                const fresh = index === 0;
                return (
                  <li key={item.id}>
                    <Link href={`/items/found/${item.id}`}>
                      <span className="portal-thumb">
                        {src ? (
                          <MediaImage
                            src={src}
                            alt=""
                            width={56}
                            height={56}
                            fallback={<IconBag size={22} />}
                          />
                        ) : (
                          <IconBag size={22} />
                        )}
                      </span>
                      <span>
                        <b>{item.title}</b>
                        <small>
                          {categoryLabels[item.category] ?? item.category}
                          {" — "}
                          {formatRelativeAr(item.createdAt)}
                        </small>
                      </span>
                      {fresh && <em>جديد</em>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/search?type=found" className="portal-more">
            تصفح جميع المفقودات
            <IconChevron size={16} />
          </Link>
        </article>
      </section>

      <section className="portal-split">
        <section className="portal-partners" id="about">
          <h2>في خدمة عتق ومحافظة شبوة</h2>
          <p>
            واصل منصة لإدارة المفقودات والمعثورات وربطها بأصحابها عبر نقاط أمانة معتمدة.
          </p>
          <Link href="/about" className="portal-more" style={{ display: "inline-flex", marginTop: 10 }}>
            اقرأ عن الخدمة
            <IconChevron size={16} />
          </Link>
        </section>
        <article className="portal-cta">
          <div>
            <h2>هل فقدت شيئاً؟</h2>
            <p>أبلِغ الآن وساعدنا في إعادته إلى صاحبه.</p>
            <Link href={reportHref} className="btn btn-white btn-sm">
              الإبلاغ عن مفقود
              <IconChevron size={16} />
            </Link>
          </div>
          <IconHandshake size={72} />
        </article>
      </section>
    </>
  );
}
