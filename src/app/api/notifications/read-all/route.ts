import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, session.id), isNull(notifications.readAt)));

    return NextResponse.json({ success: true, message: "تم تحديد كافة الإشعارات كمقروءة" });
  } catch (error) {
    console.error("[NOTIFICATIONS_READ_ALL_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الإشعارات" }, { status: 500 });
  }
}
