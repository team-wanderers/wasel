import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "./env";
import { sendOtpEmail } from "./mail";

export const auth = betterAuth({
  appName: "واصل",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.SESSION_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"],
        required: true,
        defaultValue: "user",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: (options) => {
        if (options.model === "user" || options.model === "users") {
          return false;
        }
        return crypto.randomUUID();
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      storeOTP: "hashed",
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp }) {
        await sendOtpEmail(email, otp);
      },
    }),
    nextCookies(),
  ],
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
};

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    phone: session.user.phone ?? null,
    role: session.user.role ?? "user",
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard?error=unauthorized_admin");
  return user;
}
