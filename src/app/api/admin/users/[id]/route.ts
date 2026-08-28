import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const roleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.id) {
      return NextResponse.json(
        { error: "لا يمكنك تعديل صلاحيات حسابك الخاص" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" },
        { status: 422 }
      );
    }

    const { role } = parsed.data;

    const [existing] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (existing.role === role) {
      return NextResponse.json({ error: "الدور المحدد هو نفس الدور الحالي" }, { status: 422 });
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    await db.insert(auditLogs).values({
      actorId: session.id,
      action: "change_user_role",
      entityType: "user",
      entityId: id,
      meta: {
        targetName: existing.name,
        targetEmail: existing.email,
        previousRole: existing.role,
        newRole: role,
        adminName: session.name,
        adminEmail: session.email,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[ADMIN_USER_ROLE_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل دور المستخدم" }, { status: 500 });
  }
}
