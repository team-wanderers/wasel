import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lostItems, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

const createSchema = z.object({
  title: z.string().min(3, "العنوان مطلوب (3 أحرف على الأقل)"),
  description: z.string().min(10, "الوصف مطلوب (10 أحرف على الأقل)"),
  category: z.enum(["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"]),
  lostAt: z.string().datetime({ offset: true }).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  secretDetails: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  const items = await db
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
    })
    .from(lostItems)
    .where(eq(lostItems.userId, session.id))
    .orderBy(desc(lostItems.createdAt));

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

  const { title, description, category, lostAt, lat, lng, secretDetails } = parsed.data;

  const [item] = await db
    .insert(lostItems)
    .values({
      userId: session.id,
      title,
      description,
      category,
      lostAt: lostAt ? new Date(lostAt) : null,
      lat: lat ?? null,
      lng: lng ?? null,
      secretDetails: secretDetails ?? null,
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: session.id,
    action: "create",
    entityType: "lost_item",
    entityId: item.id,
    meta: { title },
  });

  return NextResponse.json(item, { status: 201 });
}
