import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
        }
      );
    }

    const { id } = await params;

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "الإشعار غير موجود" },
        {
          status: 404,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
        }
      );
    }

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard/notifications", "page");
    revalidatePath("/dashboard");

    return NextResponse.json(
      { success: true, notification: updated },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[NOTIFICATION_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الإشعار" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  }
}
