import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runMatchingEngine } from "@/lib/matching";

export async function POST() {
  await requireAdmin();

  const result = await runMatchingEngine();

  return NextResponse.json({
    ok: true,
    ...result,
    message: `تم: ${result.inserted} إضافة، ${result.updated} تحديث، ${result.skipped} تجاوز في ${result.durationMs}ms`,
  });
}
