import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { verifyOtpCode } from "@/lib/otp";
import { createSession } from "@/lib/auth";

const schema = z.object({
  phone: z
    .string()
    .regex(/^(\+967|00967|0)?7[0-9]{8}$/, "رقم هاتف غير صحيح"),
  code: z.string().length(6, "الرمز يجب أن يكون 6 أرقام"),
  name: z.string().min(2, "الاسم مطلوب").optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 422 },
    );
  }

  const { phone, code, name } = parsed.data;
  const now = new Date();

  // ابحث عن آخر OTP صالح لهذا الرقم
  const [otpRecord] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, now),
      ),
    )
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!otpRecord) {
    return NextResponse.json(
      { error: "الرمز منتهي الصلاحية أو غير موجود، أعد الطلب" },
      { status: 401 },
    );
  }

  if (!verifyOtpCode(code, otpRecord.codeHash)) {
    return NextResponse.json({ error: "رمز التحقق غير صحيح" }, { status: 401 });
  }

  // استهلاك الرمز
  await db
    .update(otpCodes)
    .set({ consumedAt: now })
    .where(eq(otpCodes.id, otpRecord.id));

  // Upsert المستخدم
  const [user] = await db
    .insert(users)
    .values({
      phone,
      name: name ?? "مستخدم واصل",
      phoneVerifiedAt: now,
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: { phoneVerifiedAt: now },
    })
    .returning();

  // إنشاء الجلسة + cookie
  await createSession(user.id);

  return NextResponse.json({ ok: true, userId: user.id });
}
