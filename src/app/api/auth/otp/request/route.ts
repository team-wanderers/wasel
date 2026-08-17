import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import {
  generateOtpCode,
  hashOtpCode,
  otpExpiresAt,
  otpProvider,
} from "@/lib/otp";

const schema = z.object({
  phone: z
    .string()
    .regex(/^(\+967|00967|0)?7[0-9]{8}$/, "رقم هاتف يمني غير صحيح"),
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

  const { phone } = parsed.data;
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = otpExpiresAt();

  await db.insert(otpCodes).values({
    phone,
    codeHash,
    purpose: "login",
    expiresAt,
  });

  await otpProvider.send(phone, code);

  return NextResponse.json({ ok: true });
}
