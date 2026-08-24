import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import {
  foundItems,
  itemMedia,
  lostItems,
  matches,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import MapViewer from "@/components/MapViewer";
import ClaimSection from "@/components/ClaimSection";

const categoryLabels: Record<string, string> = {
  documents: "وثائق",
  electronics: "إلكترونيات",
  keys: "مفاتيح",
  bags: "حقائب",
  jewelry: "مجوهرات",
  pets: "حيوانات",
  other: "أخرى",
};

const statusLabels: Record<
  string,
  { label: string; className: string }
> = {
  open: {
    label: "مفتوح",
    className: "badge-open",
  },
  matched: {
    label: "مطابَق",
    className: "badge-matched",
  },
  claimed: {
    label: "مطالَب به",
    className: "badge-claimed",
  },
  recovered: {
    label: "مُسترجَع",
    className: "badge-recovered",
  },
  closed: {
    label: "مغلق",
    className: "badge-closed",
  },
};

type ItemType = "lost" | "found";

type ItemData = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  lat: number | null;
  lng: number | null;
  lostAt: Date | null;
  foundAt: Date | null;
  createdAt: Date;
  userId: string;
  images: {
    id: string;
    path: string;
    mime: string;
  }[];
};

async function getItemById(
  type: ItemType,
  id: string,
): Promise<ItemData | null> {
  if (type === "lost") {
    const [item] = await db
      .select({
        id: lostItems.id,
        title: lostItems.title,
        description: lostItems.description,
        category: lostItems.category,
        status: lostItems.status,
        lat: lostItems.lat,
        lng: lostItems.lng,
        lostAt: lostItems.lostAt,
        createdAt: lostItems.createdAt,
        userId: lostItems.userId,
      })
      .from(lostItems)
      .where(eq(lostItems.id, id))
      .limit(1);

    if (!item) return null;

    const images = await db
      .select({
        id: itemMedia.id,
        path: itemMedia.path,
        mime: itemMedia.mime,
      })
      .from(itemMedia)
      .where(eq(itemMedia.lostItemId, id));

    return {
      ...item,
      lostAt: item.lostAt ?? null,
      foundAt: null,
      images,
    };
  }

  const [item] = await db
    .select({
      id: foundItems.id,
      title: foundItems.title,
      description: foundItems.description,
      category: foundItems.category,
      status: foundItems.status,
      lat: foundItems.lat,
      lng: foundItems.lng,
      foundAt: foundItems.foundAt,
      createdAt: foundItems.createdAt,
      userId: foundItems.userId,
    })
    .from(foundItems)
    .where(eq(foundItems.id, id))
    .limit(1);

  if (!item) return null;

  const images = await db
    .select({
      id: itemMedia.id,
      path: itemMedia.path,
      mime: itemMedia.mime,
    })
    .from(itemMedia)
    .where(eq(itemMedia.foundItemId, id));

  return {
    ...item,
    foundAt: item.foundAt ?? null,
    lostAt: null,
    images,
  };
}

async function getCounterpartId(
  type: ItemType,
  itemId: string,
) {
  const [match] = await db
    .select({
      lostItemId: matches.lostItemId,
      foundItemId: matches.foundItemId,
    })
    .from(matches)
    .where(
      type === "lost"
        ? eq(matches.lostItemId, itemId)
        : eq(matches.foundItemId, itemId),
    )
    .limit(1);

  if (!match) return null;

  return type === "lost"
    ? match.foundItemId
    : match.lostItemId;
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type: rawType, id } = await params;

  if (rawType !== "lost" && rawType !== "found") {
    notFound();
  }

  const type = rawType as ItemType;
  const [session, item] = await Promise.all([
    getSession(),
    getItemById(type, id),
  ]);

  if (!item) {
    notFound();
  }

  const owner = Boolean(session?.id && session.id === item.userId);

  const counterpartId =
    session && !owner
      ? await getCounterpartId(type, id)
      : null;

  const dateLabel = type === "lost" ? "تاريخ الفقدان" : "تاريخ الإيجاد";
  const dateValue = type === "lost" ? item.lostAt : item.foundAt;

  const statusInfo =
    statusLabels[item.status] ?? {
      label: item.status,
      className: "badge-closed",
    };

  const typeLabel = type === "lost" ? "مفقود" : "معثور عليه";
  const actionTitle =
    type === "found"
      ? "هل هذا الغرض ملكك؟"
      : "هل عثرت على هذا الغرض؟";

  return (
    <main dir="rtl">
      <div
        className="container"
        style={{
          maxWidth: "1100px",
          paddingBlock: "var(--space-8)",
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="مسار الصفحة"
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-6)",
          }}
        >
          <Link
            href="/search"
            style={{ color: "var(--color-primary)" }}
          >
            البحث
          </Link>

          <span style={{ marginInline: "0.5rem" }}>←</span>

          <span>{typeLabel}</span>

          <span style={{ marginInline: "0.5rem" }}>←</span>

          <span>{item.title}</span>
        </nav>

        {/* Header */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "0.5rem 0.9rem",
              borderRadius: "999px",
              background:
                type === "found"
                  ? "var(--color-success-light)"
                  : "var(--color-danger-light)",
              color:
                type === "found"
                  ? "var(--color-success)"
                  : "var(--color-danger)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 700,
              marginBottom: "var(--space-4)",
            }}
          >
            📦 تفاصيل البلاغ
          </span>

          <h1
            style={{
              fontSize: "clamp(1.9rem, 4vw, 2.8rem)",
              fontWeight: 700,
              marginBottom: "var(--space-3)",
            }}
          >
            تفاصيل الغرض
          </h1>

          <p
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: 1.9,
              maxWidth: "720px",
            }}
          >
            راجع المعلومات التالية للتأكد من تفاصيل الغرض قبل اتخاذ
            أي إجراء.
          </p>
        </section>

        {/* Main content */}
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
              display: "grid",
              gridTemplateColumns:
                "minmax(280px, 0.85fr) minmax(0, 1.5fr)",
            }}
          >
            {/* Gallery */}
            <div
              style={{
                background: "var(--color-bg)",
                padding: "var(--space-6)",
                borderLeft: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  marginBottom: "var(--space-4)",
                  fontWeight: 700,
                }}
              >
                صور الغرض
              </div>

              {item.images.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "var(--space-3)",
                  }}
                >
                  {item.images.map((image) => {
                    const src = image.path.startsWith("/")
                      ? image.path
                      : `/${image.path}`;

                    return (
                      <a
                        key={image.id}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          aspectRatio: "1 / 1",
                          overflow: "hidden",
                          borderRadius: "var(--radius-lg)",
                          border:
                            "1px solid var(--color-border)",
                          background:
                            "var(--color-surface)",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt="صورة الغرض"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: "320px",
                    border: "2px dashed var(--color-border)",
                    borderRadius: "var(--radius-xl)",
                    background:
                      "var(--color-surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "var(--space-6)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "4rem",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    📷
                  </div>

                  <strong
                    style={{
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    لا توجد صور لهذا الغرض
                  </strong>

                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      lineHeight: 1.7,
                    }}
                  >
                    لم يتم إرفاق صور بهذا البلاغ.
                  </span>
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ padding: "var(--space-8)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-4)",
                  flexWrap: "wrap",
                  marginBottom: "var(--space-6)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-2)",
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <span
                      className={
                        type === "lost"
                          ? "badge badge-rejected"
                          : "badge badge-recovered"
                      }
                    >
                      {typeLabel}
                    </span>

                    <span className={`badge ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>

                    <span
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {categoryLabels[item.category] ??
                        item.category}
                    </span>
                  </div>

                  <h2
                    style={{
                      fontSize: "clamp(1.6rem, 3vw, 2.3rem)",
                      fontWeight: 700,
                    }}
                  >
                    {item.title}
                  </h2>
                </div>
              </div>

              {/* Info cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "var(--space-3)",
                  marginBottom: "var(--space-6)",
                }}
              >
                <div
                  style={{
                    background: "var(--color-bg)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    نوع الغرض
                  </p>

                  <p style={{ fontWeight: 700 }}>
                    {categoryLabels[item.category] ??
                      item.category}
                  </p>
                </div>

                <div
                  style={{
                    background: "var(--color-bg)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    {dateLabel}
                  </p>

                  <p style={{ fontWeight: 700 }}>
                    {dateValue
                      ? new Date(
                          dateValue,
                        ).toLocaleDateString("ar-YE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "غير محدد"}
                  </p>
                </div>

                <div
                  style={{
                    background: "var(--color-bg)",
                    border:
                      "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    تاريخ النشر
                  </p>

                  <p style={{ fontWeight: 700 }}>
                    {new Date(
                      item.createdAt,
                    ).toLocaleDateString("ar-YE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div
                style={{
                  border:
                    "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-5)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-muted)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  وصف الغرض
                </p>

                <p
                  style={{
                    lineHeight: 1.9,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {item.description}
                </p>
              </div>

              {/* Privacy */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  background: "var(--color-warning-light)",
                  border:
                    "1px solid var(--color-warning)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-5)",
                }}
              >
                <div style={{ fontSize: "1.3rem" }}>
                  🔒
                </div>

                <div>
                  <h3
                    style={{
                      fontWeight: 700,
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    معلومات محمية
                  </h3>

                  <p
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.8,
                    }}
                  >
                    بعض التفاصيل الخاصة بصاحب الغرض أو بيانات
                    التحقق لا تظهر للعامة، وتُستخدم فقط للتحقق من
                    المطالبة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section
          className="card"
          style={{ marginBottom: "var(--space-6)" }}
        >
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 700,
              marginBottom: "var(--space-4)",
            }}
          >
            الموقع التقريبي
          </h2>

          <MapViewer
            lat={item.lat ?? 14.5372}
            lng={item.lng ?? 46.8319}
            zoom={item.lat != null && item.lng != null ? 15 : 13}
          />

          {item.lat == null || item.lng == null ? (
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                marginTop: "var(--space-2)",
              }}
            >
              لم يتم تحديد إحداثيات دقيقة لهذا البلاغ — يتم عرض
              الموقع العام لمدينة عتق / شبوة.
            </p>
          ) : null}
        </section>

        {/* Status messages */}
        {item.status === "claimed" && (
          <div
            className="alert"
            style={{
              marginBottom: "var(--space-6)",
              background: "var(--color-warning-light)",
              borderColor: "var(--color-warning)",
              color: "hsl(30,80%,25%)",
            }}
          >
            تم إثبات ملكية هذا الغرض وهو قيد إجراءات التسليم
            والاسترداد. لا يمكن تقديم مطالبات جديدة عليه حاليًا.
          </div>
        )}

        {(item.status === "recovered" ||
          item.status === "closed") && (
          <div
            className="alert"
            style={{
              marginBottom: "var(--space-6)",
              background: "var(--color-neutral-light)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            تم تسليم واسترجاع هذا الغرض وإغلاق البلاغ بنجاح.
          </div>
        )}

        {/* Claim */}
        {!owner && session && item.status === "open" && (
          <section
            className="card"
            style={{
              marginBottom: "var(--space-6)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                padding: "0.4rem 0.8rem",
                borderRadius: "999px",
                background:
                  "var(--color-primary-light)",
                color: "var(--color-primary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 700,
                marginBottom: "var(--space-3)",
              }}
            >
              🔐 إثبات الملكية
            </span>

            <h2
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: 700,
                marginBottom: "var(--space-2)",
              }}
            >
              {actionTitle}
            </h2>

            <p
              style={{
                color: "var(--color-text-secondary)",
                lineHeight: 1.8,
                marginBottom: "var(--space-5)",
              }}
            >
              قدّم تفاصيل سرية تعرفها فقط عن الغرض حتى يتمكن النظام
              من التحقق من المطالبة.
            </p>

            <ClaimSection
              itemType={type}
              itemId={id}
              counterpartId={counterpartId}
            />
          </section>
        )}

        {/* Login CTA */}
        {!session && item.status === "open" && (
          <section
            className="card"
            style={{
              marginBottom: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-4)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: 700,
                    marginBottom: "var(--space-2)",
                  }}
                >
                  تريد تقديم مطالبة؟
                </h2>

                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  سجّل دخولك أولًا لتقديم إثبات الملكية أو متابعة
                  إجراءات البلاغ.
                </p>
              </div>

              <Link
                href="/login"
                className="btn btn-primary"
              >
                تسجيل الدخول
              </Link>
            </div>
          </section>
        )}

        {/* Actions */}
        <section
          style={{
            borderTop:
              "1px solid var(--color-border)",
            paddingTop: "var(--space-6)",
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {owner && item.status === "open" && (
            <Link
              href={`/dashboard/${type}/${item.id}/edit`}
              className="btn btn-outline"
            >
              تعديل البلاغ
            </Link>
          )}

          {item.status === "claimed" && (
            <span
              className="badge badge-claimed"
              style={{
                padding:
                  "var(--space-2) var(--space-4)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              قيد إجراءات الاسترداد
            </span>
          )}

          {(item.status === "recovered" ||
            item.status === "closed") && (
            <span
              className="badge badge-recovered"
              style={{
                padding:
                  "var(--space-2) var(--space-4)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              مسترجع ومغلق
            </span>
          )}

          {item.status !== "open" &&
          item.status !== "claimed" &&
          item.status !== "recovered" &&
          item.status !== "closed" ? (
            <span className="badge">
              هذا البلاغ لم يعد متاحًا
            </span>
          ) : null}

          <Link
            href="/search"
            className="btn btn-ghost"
          >
            ← العودة للبحث
          </Link>
        </section>
      </div>
    </main>
  );
}