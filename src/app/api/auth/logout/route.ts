import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await auth.api.signOut({ headers: await headers() });
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
