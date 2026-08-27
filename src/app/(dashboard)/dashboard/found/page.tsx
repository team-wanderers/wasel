import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { foundItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { categoryLabels, formatRelativeAr, statusLabels } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import ItemCard from "@/components/ItemCard";

export default async function FoundItemsPage() {
  const user = await requireUser();

  const items = await db
    .select({
      id: foundItems.id,
      title: foundItems.title,
      description: foundItems.description,
      category: foundItems.category,
      status: foundItems.status,
      foundAt: foundItems.foundAt,
      createdAt: foundItems.createdAt,
    })
    .from(foundItems)
    .where(eq(foundItems.userId, user.id))
    .orderBy(desc(foundItems.createdAt));

  const media = await getFirstMediaMap(items.map((item) => item.id), "found");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ما وجدته</h1>
        <Link href="/dashboard/found/new" className="portal-btn portal-btn-solid">
          إضافة
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="portal-card portal-empty">
          <p>لم تُضف أي غرض وجدته حتى الآن</p>
          <Link href="/dashboard/found/new" className="portal-btn portal-btn-solid">
            أبلغ عن موجود
          </Link>
        </div>
      ) : (
        <div className="portal-card">
        <div className="stack-list">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              href={`/items/found/${item.id}`}
              title={item.title}
              subtitle={`${statusLabels[item.status] ?? item.status} · ${categoryLabels[item.category] ?? item.category}`}
              meta={formatRelativeAr(item.foundAt ?? item.createdAt)}
              imageSrc={media.get(item.id)}
            />
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
