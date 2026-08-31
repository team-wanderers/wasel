import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, isNull, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, session.id), isNull(notifications.readAt))
      : eq(notifications.userId, session.id);

    const list = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // حساب عدد الإشعارات غير المقروءة
    const [unreadRes] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, session.id), isNull(notifications.readAt)));

    const unreadCount = Number(unreadRes?.count ?? 0);

    return NextResponse.json(
      {
        notifications: list,
        unreadCount,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإشعارات" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  }
}
