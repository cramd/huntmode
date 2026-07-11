import { NextRequest, NextResponse } from "next/server";
import { registerAccessUser } from "@/lib/register-access";
import { verifyAuthToken } from "@/lib/verify-auth-token";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      uid?: string;
      email?: string;
      name?: string;
    };

    const { uid, email, name } = body;
    if (!uid || !email) {
      return NextResponse.json(
        { error: "UID and email are required." },
        { status: 400 }
      );
    }

    const decoded = await verifyAuthToken(req, uid);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await registerAccessUser({ uid, email, name });

    if (!result.ok) {
      return NextResponse.json(
        {
          status: "rate_limited",
          error: `Sign-ups are limited to ${result.limit} per hour. Try again later.`,
          retryAfterSeconds: result.retryAfterSeconds,
          limit: result.limit,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      created: result.created,
    });
  } catch (error) {
    console.error("[register] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
