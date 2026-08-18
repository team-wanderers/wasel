import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lostItems, auditLogs } from "@/db/schema";
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

  return NextResponse.json(item);
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
    .select({ id: lostItems.id })
    .from(lostItems)
    .where(and(eq(lostItems.id, id), eq(lostItems.userId, session.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  if (parsed.data.lostAt) updateData.lostAt = new Date(parsed.data.lostAt);

  const [updated] = await db
    .update(lostItems)
    .set(updateData)
    .where(eq(lostItems.id, id))
    .returning();

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
    .select({ id: lostItems.id, title: lostItems.title })
    .from(lostItems)
    .where(and(eq(lostItems.id, id), eq(lostItems.userId, session.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

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
