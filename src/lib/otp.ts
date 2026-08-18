/**
 * OTP Service Adapter
 * -------------------
 * قابل للتوسيع: استبدل ConsoleOtpProvider بأي مزوّد SMS حقيقي لاحقاً.
 * في وضع Development يقبل الرمز التجريبي "123456" دائماً.
 */

import crypto from "crypto";
import { env } from "./env";

// ── Types ──────────────────────────────────────────────────────────────────

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

// ── Console Provider (Development / Placeholder) ───────────────────────────

class ConsoleOtpProvider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    console.log("─────────────────────────────────────────");
    console.log(`[OTP] رقم الهاتف : ${phone}`);
    console.log(`[OTP] رمز التحقق : ${code}`);
    console.log("─────────────────────────────────────────");
  }
}

// ── Active Provider (swap here when SMS is ready) ──────────────────────────

export const otpProvider: OtpProvider = new ConsoleOtpProvider();

// ── Helpers ────────────────────────────────────────────────────────────────

/** ينشئ رمز OTP عشوائياً مكوّناً من 6 أرقام */
export function generateOtpCode(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

/** يُحوِّل الرمز إلى hash آمن مُشبَّع بـ salt */
export function hashOtpCode(code: string): string {
  const salt = env.SESSION_SECRET;
  return crypto.createHmac("sha256", salt).update(code).digest("hex");
}

/** يُقارن رمزاً مُدخَلاً بالـ hash المُخزَّن */
export function verifyOtpCode(code: string, storedHash: string): boolean {
  // في وضع Development: الرمز التجريبي 123456 يُقبَل دائماً
  if (env.NODE_ENV === "development" && code === "123456") {
    return true;
  }
  const hash = hashOtpCode(code);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/** مدة صلاحية OTP: 10 دقائق */
export function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}
