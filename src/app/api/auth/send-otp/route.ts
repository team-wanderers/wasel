import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.email !== "string" || typeof body.mode !== "string") {
    return NextResponse.json(
      { ok: false, error: "INVALID_REQUEST", message: "بيانات الطلب غير مكتملة" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  const mode = body.mode as "login" | "register";

  if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_EMAIL", message: "البريد الإلكتروني غير صالح" },
      { status: 400 }
    );
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (mode === "login" && !existingUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "USER_NOT_FOUND",
        message: "هذا البريد الإلكتروني غير مسجل، يرجى إنشاء حساب جديد",
      },
      { status: 404 }
    );
  }

  if (mode === "register" && existingUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "USER_ALREADY_EXISTS",
        message: "هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
