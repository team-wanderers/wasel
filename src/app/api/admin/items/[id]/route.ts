import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { lostItems, foundItems, matches } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const moderateSchema = z.object({
  type: z.enum(["lost", "found"]),
  status: z.enum(["open", "matched", "claimed", "recovered", "closed"]),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" },
        { status: 422 }
      );
    }

    const { type, status, reason, notes } = parsed.data;

    if (type === "lost") {
      const [existing] = await db
        .select({ id: lostItems.id, title: lostItems.title, status: lostItems.status })
        .from(lostItems)
        .where(eq(lostItems.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json({ error: "البلاغ غير موجود" }, { status: 404 });
      }

      if (existing.status === "recovered") {
        return NextResponse.json(
          { error: "لا يمكن تعديل حالة بلاغ تم تسليمه واسترجاعه" },
          { status: 400 },
        );
      }

      const [updated] = await db
        .update(lostItems)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(lostItems.id, id))
        .returning();

      if (status === "closed") {
        await db
          .update(matches)
          .set({ status: "expired" })
          .where(
            and(
              eq(matches.lostItemId, id),
              or(eq(matches.status, "suggested"), eq(matches.status, "accepted"))
            )
          );
      }

      await logAudit({
        actorId: session.id,
        action: "moderate_status",
        entityType: "lost_item",
        entityId: id,
        meta: {
          itemTitle: existing.title,
          previousStatus: existing.status,
          newStatus: status,
          reason: reason?.trim() || "تعديل إشرافي بواسطة المشرف",
          notes: notes?.trim() || null,
          adminName: session.name,
          adminEmail: session.email,
        },
      });

      revalidatePath("/admin/items");
      revalidatePath("/admin/audit-logs");
      revalidatePath("/admin");

      return NextResponse.json({ success: true, item: updated });
    } else {
      const [existing] = await db
        .select({ id: foundItems.id, title: foundItems.title, status: foundItems.status })
        .from(foundItems)
        .where(eq(foundItems.id, id))
        .limit(1);

      if (!existing) {
        return NextResponse.json({ error: "البلاغ غير موجود" }, { status: 404 });
      }

      if (existing.status === "recovered") {
        return NextResponse.json(
          { error: "لا يمكن تعديل حالة بلاغ تم تسليمه واسترجاعه" },
          { status: 400 },
        );
      }

      const [updated] = await db
        .update(foundItems)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(foundItems.id, id))
        .returning();

      if (status === "closed") {
        await db
          .update(matches)
          .set({ status: "expired" })
          .where(
            and(
              eq(matches.foundItemId, id),
              or(eq(matches.status, "suggested"), eq(matches.status, "accepted"))
            )
          );
      }

      await logAudit({
        actorId: session.id,
        action: "moderate_status",
        entityType: "found_item",
        entityId: id,
        meta: {
          itemTitle: existing.title,
          previousStatus: existing.status,
          newStatus: status,
          reason: reason?.trim() || "تعديل إشرافي بواسطة المشرف",
          notes: notes?.trim() || null,
          adminName: session.name,
          adminEmail: session.email,
        },
      });

      revalidatePath("/admin/items");
      revalidatePath("/admin/audit-logs");
      revalidatePath("/admin");

      return NextResponse.json({ success: true, item: updated });
    }
  } catch (error) {
    console.error("[ADMIN_MODERATE_ITEM_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل حالة البلاغ" }, { status: 500 });
  }
}
