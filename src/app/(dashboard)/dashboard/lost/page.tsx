import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { lostItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { categoryLabels, formatRelativeAr, statusLabels } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import ItemCard from "@/components/ItemCard";

export default async function LostItemsPage() {
  const user = await requireUser();

  const items = await db
    .select({
      id: lostItems.id,
      title: lostItems.title,
      description: lostItems.description,
      category: lostItems.category,
      status: lostItems.status,
      lostAt: lostItems.lostAt,
      createdAt: lostItems.createdAt,
    })
    .from(lostItems)
    .where(eq(lostItems.userId, user.id))
    .orderBy(desc(lostItems.createdAt));

  const media = await getFirstMediaMap(items.map((item) => item.id), "lost");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">مفقوداتي</h1>
        <Link href="/dashboard/lost/new" className="portal-btn portal-btn-solid">
          إضافة
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="portal-card portal-empty">
          <p>لا توجد بلاغات مفقودات حتى الآن</p>
          <Link href="/dashboard/lost/new" className="portal-btn portal-btn-solid">
            أبلغ عن مفقود
          </Link>
        </div>
      ) : (
        <div className="portal-card">
        <div className="stack-list">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              href={`/items/lost/${item.id}`}
              title={item.title}
              subtitle={`${statusLabels[item.status] ?? item.status} · ${categoryLabels[item.category] ?? item.category}`}
              meta={formatRelativeAr(item.lostAt ?? item.createdAt)}
              imageSrc={media.get(item.id)}
            />
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
