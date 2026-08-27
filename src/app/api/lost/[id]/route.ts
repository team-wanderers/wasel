import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lostItems, itemMedia, auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.enum(["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"]).optional(),
  status: z.enum(["open", "matched", "claimed", "recovered", "closed"]).optional(),
  lostAt: z.string().datetime({ offset: true }).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  secretDetails: z.string().optional().nullable(),
  images: z.array(
    z.union([
      z.string(),
      z.object({
        path: z.string(),
        mime: z.string().optional(),
        id: z.string().optional(),
      }),
    ])
  ).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  const [item] = await db
    .select()
    .from(lostItems)
    .where(and(eq(lostItems.id, id), eq(lostItems.userId, session.id)))
    .limit(1);

  if (!item) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const media = await db
    .select({
      id: itemMedia.id,
      path: itemMedia.path,
      mime: itemMedia.mime,
    })
    .from(itemMedia)
    .where(eq(itemMedia.lostItemId, id));

  return NextResponse.json({
    ...item,
    images: media,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 422 });
  }

  const [existing] = await db
    .select({ id: lostItems.id, status: lostItems.status })
    .from(lostItems)
    .where(and(eq(lostItems.id, id), eq(lostItems.userId, session.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (existing.status !== "open" && session.role !== "admin") {
    return NextResponse.json(
      { error: "لا يمكن تعديل البلاغ لأنه غير متاح للتعديل (مغلق أو مكتمل)." },
      { status: 403 }
    );
  }

  const { images, ...fieldsToUpdate } = parsed.data;
  const updateData: Record<string, unknown> = {
    ...fieldsToUpdate,
    updatedAt: new Date(),
  };
  if (fieldsToUpdate.lostAt) updateData.lostAt = new Date(fieldsToUpdate.lostAt);

  const [updated] = await db
    .update(lostItems)
    .set(updateData)
    .where(eq(lostItems.id, id))
    .returning();

  // مزامنة وتحديث الوسائط إذا تم تمريرها
  if (images !== undefined) {
    await db.delete(itemMedia).where(eq(itemMedia.lostItemId, id));
    if (images && images.length > 0) {
      for (const img of images) {
        const imgPath = typeof img === "string" ? img : img.path;
        const imgMime = typeof img === "object" && img.mime ? img.mime : "image/jpeg";
        if (imgPath && imgPath.trim().length > 0) {
          const cleanPath = imgPath.startsWith("/") ? imgPath.slice(1) : imgPath;
          await db.insert(itemMedia).values({
            lostItemId: id,
            path: cleanPath,
            mime: imgMime,
          });
        }
      }
    }
  }

  await db.insert(auditLogs).values({
    actorId: session.id,
    action: "update",
    entityType: "lost_item",
    entityId: id,
    meta: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  const [existing] = await db
    .select({ id: lostItems.id, title: lostItems.title, status: lostItems.status })
    .from(lostItems)
    .where(and(eq(lostItems.id, id), eq(lostItems.userId, session.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (existing.status !== "open" && session.role !== "admin") {
    return NextResponse.json(
      { error: "لا يمكن حذف البلاغ لأنه غير متاح للحذف (مغلق أو مكتمل)." },
      { status: 403 }
    );
  }

  await db.delete(lostItems).where(eq(lostItems.id, id));

  await db.insert(auditLogs).values({
    actorId: session.id,
    action: "delete",
    entityType: "lost_item",
    entityId: id,
    meta: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}
