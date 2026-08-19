import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default("dev-secret-change-in-production-32chars"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("واصل <noreply@localhost>"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ?? 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
});
