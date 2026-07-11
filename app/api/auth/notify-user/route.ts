import { NextRequest, NextResponse } from "next/server";
import { adminDb, formatAdminError } from "@/lib/firebase-admin";
import { buildAccessGrantedEmailHtml } from "@/lib/access-granted-email";
import { sendResendEmail } from "@/lib/send-resend-email";
import { verifyAdmin } from "@/lib/verify-admin";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { email?: string; uid?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, uid, name } = body;
  if (!email && !uid) {
    return NextResponse.json({ error: "email or uid is required" }, { status: 400 });
  }

  try {
    let recipientEmail = email;
    let recipientName = name || "there";

    if (uid) {
      const docSnap = await adminDb.collection("accessRequests").doc(uid).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const data = docSnap.data()!;
      recipientEmail = recipientEmail || (typeof data.email === "string" ? data.email : "");
      recipientName =
        name || (typeof data.name === "string" ? data.name : recipientName);
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: "No email address for user" }, { status: 400 });
    }

    const host = req.headers.get("host") || "www.fuzzynacho.org";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const appUrl = `${protocol}://${host}`;

    const result = await sendResendEmail({
      to: recipientEmail,
      subject: "You're approved — HuntMode is ready for you",
      html: buildAccessGrantedEmailHtml({ name: recipientName, appUrl }),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`[notify-user] Access granted email sent to ${recipientEmail}`);
    return NextResponse.json({ success: true, email: recipientEmail });
  } catch (error) {
    console.error("[notify-user] POST error:", error);
    return NextResponse.json({ error: formatAdminError(error) }, { status: 500 });
  }
}
