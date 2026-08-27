import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

function requestOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || host.startsWith("0.0.0.0")) return env.BETTER_AUTH_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  await auth.api.signOut({ headers: await headers() });
  return NextResponse.redirect(new URL("/login", requestOrigin(req)), 303);
}
