import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { foundItems, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

const createSchema = z.object({
  title: z.string().min(3, "العنوان مطلوب"),
  description: z.string().min(10, "الوصف مطلوب"),
  category: z.enum(["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"]),
  foundAt: z.string().datetime({ offset: true }).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  secretDetails: z.string().optional().nullable(),
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

  const { title, description, category, foundAt, lat, lng, secretDetails } = parsed.data;

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

  await db.insert(auditLogs).values({
    actorId: session.id, action: "create",
    entityType: "found_item", entityId: item.id, meta: { title },
  });

  return NextResponse.json(item, { status: 201 });
}
