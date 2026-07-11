import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { uid, email, name } = (await req.json()) as {
      uid?: string;
      email?: string;
      name?: string;
    };

    if (!uid || !email) {
      return NextResponse.json(
        { error: "UID and Email are required." },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const requestedAt = new Date().toISOString();

    // 1. Save to Firestore under accessRequests collection
    const docRef = adminDb.collection("accessRequests").doc(uid);
    await docRef.set({
      uid,
      email,
      name: name || "Unknown User",
      status: "pending",
      token,
      requestedAt,
    });

    // 2. Generate URLs for approval and denial
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const approveUrl = `${baseUrl}/api/auth/action?action=approve&uid=${uid}&token=${token}`;
    const denyUrl = `${baseUrl}/api/auth/action?action=deny&uid=${uid}&token=${token}`;

    // 3. Build email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HuntMode Access Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 30px;
    }
    .user-card {
      background-color: #1f2937;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .user-detail {
      margin-bottom: 12px;
      font-size: 15px;
      line-height: 1.5;
    }
    .user-detail strong {
      color: #9ca3af;
      display: inline-block;
      width: 100px;
    }
    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 30px;
    }
    .btn {
      flex: 1;
      text-align: center;
      padding: 14px 20px;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      font-size: 15px;
      display: inline-block;
    }
    .btn-approve {
      background-color: #10b981;
      color: #ffffff;
    }
    .btn-deny {
      background-color: #ef4444;
      color: #ffffff;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #1f2937;
      background-color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HuntMode Access Request</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; line-height: 1.6; margin-top: 0; color: #f3f4f6;">Hello Marc,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">A new user has requested access to HuntMode. Please review their credentials below:</p>
      
      <div class="user-card">
        <div class="user-detail"><strong>Name:</strong> ${name || "Unknown User"}</div>
        <div class="user-detail"><strong>Email:</strong> ${email}</div>
        <div class="user-detail"><strong>UID:</strong> ${uid}</div>
        <div class="user-detail"><strong>Time:</strong> ${new Date(requestedAt).toLocaleString()}</div>
      </div>
      
      <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-bottom: 24px;">
        Click one of the buttons below to approve or deny this login request immediately:
      </p>
      
      <div class="actions">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" width="50%" style="padding-right: 8px;">
              <a href="${approveUrl}" class="btn btn-approve" style="display: block;">Approve Access</a>
            </td>
            <td align="center" width="50%" style="padding-left: 8px;">
              <a href="${denyUrl}" class="btn btn-deny" style="display: block;">Deny Access</a>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div class="footer">
      This is an automated security notification from your HuntMode Command Center.
    </div>
  </div>
</body>
</html>
`;

    // 4. Log the URLs prominently in the console for easy developer testing
    console.log(`
┌────────────────────────────────────────────────────────┐
│             HUNTMODE ACCESS REQUEST RECEIVED           │
├────────────────────────────────────────────────────────┤
│ User: ${name || "Unknown"} (${email})
│ UID:  ${uid}
├────────────────────────────────────────────────────────┤
│ APPROVE ACCESS URL:                                    │
│ ${approveUrl}                                          │
│                                                        │
│ DENY ACCESS URL:                                       │
│ ${denyUrl}                                             │
└────────────────────────────────────────────────────────┘
`);

    // 5. Send alert email if RESEND_API_KEY is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "marcsherwood@gmail.com";
    const resendFrom = process.env.RESEND_FROM || "HuntMode <noreply@signup.fuzzynacho.org>";

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFrom,
            to: adminEmail,
            subject: `[HuntMode] Access Request: ${email}`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("[request-access] Resend error:", emailRes.status, errText);
        } else {
          console.log(`[request-access] Alert email sent to ${adminEmail}`);
        }
      } catch (emailErr) {
        console.error("[request-access] Failed to send alert email:", emailErr);
      }
    } else {
      console.log("[request-access] No RESEND_API_KEY — logged to console only. Run ./setup-resend.sh to enable email alerts.");
    }

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    console.error("Error in request-access API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
