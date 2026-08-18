/**
 * Auth Library
 * ------------
 * - إدارة الجلسات عبر PostgreSQL (لا JWT)
 * - Guards: requireUser / requireAdmin
 * - Cookie: session=<raw_token>; HttpOnly; SameSite=Lax
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { env } from "./env";

// ── Types ──────────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  role: "user" | "admin";
};

// ── Constants ──────────────────────────────────────────────────────────────

const COOKIE_NAME = "session";
const SESSION_DURATION_DAYS = 30;

// ── Token Helpers ──────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export function sessionExpiresAt(): Date {
  return new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
}

// ── Session Management ─────────────────────────────────────────────────────

/** ينشئ جلسة جديدة في قاعدة البيانات ويضع الـ cookie */
export async function createSession(userId: string): Promise<void> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = sessionExpiresAt();

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/** يجلب المستخدم من الجلسة الحالية (null إذا لم تكن موجودة/منتهية) */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
    )
    .limit(1);

  return result[0] ?? null;
}

/** يحذف الجلسة من قاعدة البيانات ويُزيل الـ cookie */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  cookieStore.delete(COOKIE_NAME);
}

// ── Route Guards ───────────────────────────────────────────────────────────

/** يتحقق من وجود مستخدم مسجَّل — يُعيد redirect إلى /login عند الفشل */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** يتحقق من كون المستخدم admin — يُعيد redirect عند الفشل */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
