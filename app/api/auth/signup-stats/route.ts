import { NextRequest, NextResponse } from "next/server";
import { formatAdminError } from "@/lib/firebase-admin";
import { getSignupStats } from "@/lib/signup-stats";
import { verifyAdmin } from "@/lib/verify-admin";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const stats = await getSignupStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[signup-stats] GET error:", error);
    return NextResponse.json({ error: formatAdminError(error) }, { status: 500 });
  }
}
