export type SendResendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendResendEmailResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendResendEmail(
  input: SendResendEmailInput
): Promise<SendResendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || "HuntMode <noreply@signup.fuzzynacho.org>";

  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return { ok: false, error: `Resend error ${emailRes.status}: ${errText}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}
