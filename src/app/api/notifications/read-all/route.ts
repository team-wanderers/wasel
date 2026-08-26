import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
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

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, session.id), isNull(notifications.readAt)));

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard/notifications", "page");
    revalidatePath("/dashboard");

    return NextResponse.json(
      { success: true, message: "تم تحديد كافة الإشعارات كمقروءة" },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_READ_ALL_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الإشعارات" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  }
}
