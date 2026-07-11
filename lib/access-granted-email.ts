export function buildAccessGrantedEmailHtml(input: {
  name: string;
  appUrl?: string;
}): string {
  const appUrl = input.appUrl || "https://www.fuzzynacho.org";
  const firstName = input.name.split(" ")[0] || input.name;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're in — HuntMode</title>
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
    }
    .content {
      padding: 36px 30px;
      line-height: 1.6;
      font-size: 15px;
      color: #d1d5db;
    }
    .btn {
      display: inline-block;
      margin-top: 24px;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 600;
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
      <h1>You're good to go</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>
        Your HuntMode account is approved. You can sign in now with Google and start tracking applications,
        tailoring your CV, and prepping for interviews.
      </p>
      <p>
        <a href="${appUrl}" class="btn">Open HuntMode</a>
      </p>
      <p style="margin-top: 28px; color: #9ca3af; font-size: 14px;">
        If you run into anything, just reply to this email.
      </p>
    </div>
    <div class="footer">
      HuntMode — your job search command center
    </div>
  </div>
</body>
</html>
`;
}
