import { notFound } from "next/navigation";
import { db } from "@/db";
import { lostItems, foundItems, itemMedia, matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import MapViewer from "@/components/MapViewer";
import ClaimSection from "@/components/ClaimSection";

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

  let counterpartId: string | null = null;
  if (session && !isOwner(session.id, item.userId)) {
    const [match] = await db
      .select({ lostItemId: matches.lostItemId, foundItemId: matches.foundItemId })
      .from(matches)
      .where(
        type === "lost"
          ? eq(matches.lostItemId, id)
          : eq(matches.foundItemId, id),
      )
      .limit(1);
    if (match) {
      counterpartId = type === "lost" ? match.foundItemId : match.lostItemId;
    }
  }

  const dateLabel = type === "lost" ? "تاريخ الفقدان" : "تاريخ الإيجاد";
  const dateValue = type === "lost" ? item.lostAt : item.foundAt;
  const statusInfo = statusLabels[item.status] ?? { label: item.status, className: "" };
  const owner = isOwner(session?.id ?? "", item.userId);

  return (
    <div className="container" style={{ maxWidth: "800px", padding: "var(--space-8) var(--space-4)" }}>
      <nav style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        <Link href="/search" style={{ color: "var(--color-primary)" }}>البحث</Link>
        {" › "}
        <span>{type === "lost" ? "مفقود" : "معثور عليه"}</span>
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
                {type === "lost" ? "مفقود" : "معثور عليه"}
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

        {item.status === "claimed" && (
          <div style={{ marginBottom: "var(--space-6)", padding: "var(--space-4)", background: "hsl(38,90%,94%)", border: "1px solid hsl(38,90%,75%)", borderRadius: "var(--radius-md)", color: "hsl(30,80%,25%)", fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
            تم إثبات ملكية هذا الغرض وهو قيد إجراءات التسليم والاسترداد. لا يمكن تقديم مطالبات جديدة عليه حالياً.
          </div>
        )}

        {(item.status === "recovered" || item.status === "closed") && (
          <div style={{ marginBottom: "var(--space-6)", padding: "var(--space-4)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            تم تسليم واسترجاع هذا الغرض وإغلاق البلاغ بنجاح.
          </div>
        )}

        {!owner && session && item.status === "open" && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text-secondary)" }}>
              {type === "found" ? "هل هذا الغرض ملكك؟" : "هل عثرت على هذا الغرض؟"}
            </h2>
            <ClaimSection itemType={type} itemId={id} counterpartId={counterpartId} />
          </div>
        )}

        {!session && item.status === "open" && (
          <div style={{ marginBottom: "var(--space-6)", padding: "var(--space-4)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              {type === "found"
                ? "هل هذا الغرض ملكك؟ سجّل دخولك لتقديم إثبات الملكية والتواصل مع الملتقط."
                : "هل عثرت على هذا الغرض؟ سجّل دخولك لتقديم البلاغ والتواصل مع صاحبه."}
            </span>
            <Link href="/login" className="btn btn-primary btn-sm">
              تسجيل الدخول
            </Link>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-6)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          {owner ? (
            <Link href={`/dashboard/${type}/${item.id}/edit`} className="btn btn-outline">
              تعديل البلاغ
            </Link>
          ) : item.status === "claimed" ? (
            <span className="badge" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--font-size-sm)", background: "hsl(38,90%,92%)", color: "hsl(30,80%,30%)" }}>
              قيد إجراءات الاسترداد
            </span>
          ) : item.status === "recovered" || item.status === "closed" ? (
            <span className="badge" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--font-size-sm)", background: "var(--color-success-light)", color: "hsl(142,60%,25%)" }}>
              مسترجع ومغلق
            </span>
          ) : item.status !== "open" ? (
            <span className="badge" style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--font-size-sm)" }}>
              هذا البلاغ لم يعد متاحاً
            </span>
          ) : null}
          <Link href="/search" className="btn btn-ghost">
            ← العودة للبحث
          </Link>
        </div>
      </div>
    </div>
  );
}

function isOwner(sessionId: string, itemUserId: string): boolean {
  return !!sessionId && sessionId === itemUserId;
}
