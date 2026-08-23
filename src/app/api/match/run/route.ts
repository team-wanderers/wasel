import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runMatchingEngine } from "@/lib/matching";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const result = await runMatchingEngine();

  return NextResponse.json({
    ok: true,
    ...result,
    message: `تم فحص البلاغات: ${result.inserted} مطابقة جديدة، ${result.updated} تحديث في ${result.durationMs}ms`,
  });
}
