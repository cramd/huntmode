#!/usr/bin/env node
/**
 * Usage: node scripts/send-access-granted.mjs <email> [name]
 * Sends the HuntMode access-granted email via Resend.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const to = process.argv[2];
const name = process.argv[3] || "there";

if (!to) {
  console.error("Usage: node scripts/send-access-granted.mjs <email> [name]");
  process.exit(1);
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || "HuntMode <noreply@signup.fuzzynacho.org>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fuzzynacho.org";
const firstName = name.split(" ")[0] || name;

const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#0b0f19;color:#f3f4f6;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937">
<div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:22px">You're good to go</h1>
</div>
<div style="padding:28px;line-height:1.6;color:#d1d5db">
<p>Hi ${firstName},</p>
<p>Your HuntMode account is approved. You can sign in now with Google and start tracking applications, tailoring your CV, and prepping for interviews.</p>
<p><a href="${appUrl}" style="display:inline-block;margin-top:12px;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">Open HuntMode</a></p>
<p style="color:#9ca3af;font-size:14px;margin-top:24px">If you run into anything, just reply to this email.</p>
</div>
</div>
</body></html>`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${resendApiKey}`,
  },
  body: JSON.stringify({
    from: resendFrom,
    to,
    subject: "You're approved — HuntMode is ready for you",
    html,
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error("Failed:", res.status, text);
  process.exit(1);
}

console.log(`Access-granted email sent to ${to}`);
