import { notFound } from "next/navigation";
import { db } from "@/db";
import { lostItems, foundItems, itemMedia } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import MapViewer from "@/components/MapViewer";

const categoryLabels: Record<string, string> = {
  documents: "وثائق", electronics: "إلكترونيات", keys: "مفاتيح",
  bags: "حقائب", jewelry: "مجوهرات", pets: "حيوانات", other: "أخرى",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  open:      { label: "مفتوح",      className: "badge-open" },
  matched:   { label: "مطابَق",     className: "badge-matched" },
  claimed:   { label: "مطالَب به",  className: "badge-claimed" },
  recovered: { label: "مُسترجَع",   className: "badge-matched" },
  closed:    { label: "مغلق",       className: "badge-claimed" },
};

type Params = { params: Promise<{ type: string; id: string }> };

export default async function ItemDetailPage({ params }: Params) {
  const { type, id } = await params;

  if (type !== "lost" && type !== "found") notFound();

  const session = await getSession();

  let item: {
    id: string; title: string; description: string; category: string;
    status: string; lat: number | null; lng: number | null;
    lostAt?: Date | null; foundAt?: Date | null; createdAt: Date; userId: string;
  } | undefined;

  let media: { id: string; path: string; mime: string }[] = [];

  if (type === "lost") {
    const [row] = await db
      .select({
        id: lostItems.id, title: lostItems.title, description: lostItems.description,
        category: lostItems.category, status: lostItems.status,
        lat: lostItems.lat, lng: lostItems.lng,
        lostAt: lostItems.lostAt, createdAt: lostItems.createdAt, userId: lostItems.userId,
      })
      .from(lostItems)
      .where(eq(lostItems.id, id))
      .limit(1);
    if (!row) notFound();
    item = { ...row, foundAt: null };

    media = await db
      .select({ id: itemMedia.id, path: itemMedia.path, mime: itemMedia.mime })
      .from(itemMedia)
      .where(eq(itemMedia.lostItemId, id));
  } else {
    const [row] = await db
      .select({
        id: foundItems.id, title: foundItems.title, description: foundItems.description,
        category: foundItems.category, status: foundItems.status,
        lat: foundItems.lat, lng: foundItems.lng,
        foundAt: foundItems.foundAt, createdAt: foundItems.createdAt, userId: foundItems.userId,
      })
      .from(foundItems)
      .where(eq(foundItems.id, id))
      .limit(1);
    if (!row) notFound();
    item = { ...row, lostAt: null };

    media = await db
      .select({ id: itemMedia.id, path: itemMedia.path, mime: itemMedia.mime })
      .from(itemMedia)
      .where(eq(itemMedia.foundItemId, id));
  }

  const dateLabel = type === "lost" ? "تاريخ الفقدان" : "تاريخ الإيجاد";
  const dateValue = type === "lost" ? item.lostAt : item.foundAt;
  const statusInfo = statusLabels[item.status] ?? { label: item.status, className: "" };
  const isOwner = session?.id === item.userId;

  return (
    <div className="container" style={{ maxWidth: "800px", padding: "var(--space-8) var(--space-4)" }}>
      <nav style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        <Link href="/search" style={{ color: "var(--color-primary)" }}>البحث</Link>
        {" › "}
        <span>{type === "lost" ? "مفقود" : "موجود"}</span>
        {" › "}
        <span>{item.title}</span>
      </nav>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div>
            <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
              <span
                className={`badge ${statusInfo.className}`}
                style={{
                  background: type === "lost" ? "var(--color-danger-light)" : "var(--color-success-light)",
                  color: type === "lost" ? "hsl(0,65%,35%)" : "hsl(142,60%,25%)",
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                }}
              >
                {type === "lost" ? "مفقود" : "موجود"}
              </span>
              <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", alignSelf: "center" }}>
                {categoryLabels[item.category] ?? item.category}
              </span>
            </div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>{item.title}</h1>
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text-secondary)" }}>
            الوصف
          </h2>
          <p style={{ lineHeight: 1.8, color: "var(--color-text-primary)" }}>{item.description}</p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", marginBottom: "var(--space-6)", padding: "var(--space-4)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>{dateLabel}</div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
              {dateValue ? new Date(dateValue).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" }) : "غير محدد"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>تاريخ النشر</div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
              {new Date(item.createdAt).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        {media.length > 0 && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text-secondary)" }}>
              الصور
            </h2>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {media.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={`/${m.path}`}
                  alt="صورة الغرض"
                  style={{
                    width: "150px", height: "150px", objectFit: "cover",
                    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {item.lat && item.lng && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text-secondary)" }}>
              الموقع التقريبي
            </h2>
            <MapViewer lat={item.lat} lng={item.lng} />
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-6)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          {isOwner ? (
            <Link href={`/dashboard/${type}/${item.id}/edit`} className="btn btn-outline">
              تعديل البلاغ
            </Link>
          ) : item.status === "open" ? (
            session ? (
              <Link href={`/dashboard/matches`} className="btn btn-primary">
                {type === "lost" ? "هذا ملكي — إثبات الملكية" : "وجدت صاحب هذا الغرض"}
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary">
                سجّل دخولك للتواصل مع صاحب البلاغ
              </Link>
            )
          ) : (
            <span className="badge" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--font-size-sm)" }}>
              هذا البلاغ لم يعد متاحاً
            </span>
          )}
          <Link href="/search" className="btn btn-ghost">
            ← العودة للبحث
          </Link>
        </div>
      </div>
    </div>
  );
}