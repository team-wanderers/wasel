import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { foundItems, itemMedia, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { runMatchingEngine } from "@/lib/matching";
import { eq, desc } from "drizzle-orm";

const createSchema = z.object({
  title: z.string().min(3, "العنوان مطلوب"),
  description: z.string().min(10, "الوصف مطلوب"),
  category: z.enum(["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"]),
  foundAt: z.string().datetime({ offset: true }).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  secretDetails: z.string().optional().nullable(),
  images: z.array(
    z.object({
      path: z.string(),
      mime: z.string().optional(),
    }).or(z.string())
  ).optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  const items = await db
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
    })
    .from(foundItems)
    .where(eq(foundItems.userId, session.id))
    .orderBy(desc(foundItems.createdAt));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 422 });
  }

  const { title, description, category, foundAt, lat, lng, secretDetails, images } = parsed.data;

  const [item] = await db
    .insert(foundItems)
    .values({
      userId: session.id,
      title, description, category,
      foundAt: foundAt ? new Date(foundAt) : null,
      lat: lat ?? null, lng: lng ?? null,
      secretDetails: secretDetails ?? null,
    })
    .returning();

  // إدراج الصور المرتبطة بالبلاغ في جدول itemMedia
  if (images && images.length > 0) {
    for (const img of images) {
      const imgPath = typeof img === "string" ? img : img.path;
      const imgMime = typeof img === "object" && img.mime ? img.mime : "image/jpeg";
      if (imgPath && imgPath.trim().length > 0) {
        const cleanPath = imgPath.startsWith("/") ? imgPath.slice(1) : imgPath;
        await db.insert(itemMedia).values({
          foundItemId: item.id,
          path: cleanPath,
          mime: imgMime,
        });
      }
    }
  }

  await db.insert(auditLogs).values({
    actorId: session.id, action: "create",
    entityType: "found_item", entityId: item.id, meta: { title },
  });

  // تشغيل محرك المطابقة تلقائياً في الخلفية
  runMatchingEngine().catch((err) => console.error("[AUTO_MATCH_FOUND_ERROR]", err));

  return NextResponse.json(item, { status: 201 });
}
