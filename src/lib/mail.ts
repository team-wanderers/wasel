import nodemailer from "nodemailer";
import { env } from "./env";

function transporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export async function sendOtpEmail(to: string, otp: string) {
  const subject = "رمز الدخول إلى واصل";
  const text = `رمز التحقق: ${otp}\nصالح لمدة 10 دقائق.`;

  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is required in production");
    }
    console.log(`[OTP] ${to} ${otp}`);
    return;
  }

  await transporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
  });
}
