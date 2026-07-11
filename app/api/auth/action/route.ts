import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  // HTML page template helper
  const renderPage = ({
    title,
    message,
    name,
    email,
    status,
    isError = false,
  }: {
    title: string;
    message: string;
    name: string;
    email: string;
    status: string;
    isError?: boolean;
  }) => {
    const isDeniedClass = status === "denied" || isError ? "denied" : "";
    const iconClass = status === "approved" && !isError ? "success-icon" : "error-icon";
    
    const iconSvg = status === "approved" && !isError
      ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    const statusLabel = isError ? "Error" : status === "approved" ? "Approved" : "Denied";
    const statusColor = isError ? "#ef4444" : status === "approved" ? "#10b981" : "#ef4444";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --background: #090b11;
      --card: rgba(17, 20, 28, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --success: #10b981;
      --destructive: #ef4444;
    }
    body {
      background-color: var(--background);
      color: var(--text);
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.1) 0px, transparent 50%);
    }
    .wrapper {
      padding: 20px;
      width: 100%;
      max-width: 480px;
      box-sizing: border-box;
    }
    .card {
      background: var(--card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 45px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary), var(--success));
    }
    .card.denied::before {
      background: linear-gradient(90deg, var(--primary), var(--destructive));
    }
    .icon-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .success-icon {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
    }
    .error-icon {
      background: rgba(239, 68, 68, 0.1);
      color: var(--destructive);
      box-shadow: 0 0 25px rgba(239, 68, 68, 0.25);
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 12px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-muted);
      margin: 0 0 28px 0;
    }
    .user-info {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 16px 20px;
      text-align: left;
      font-size: 14px;
      margin-bottom: 35px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: var(--text-muted);
    }
    .info-value {
      font-weight: 600;
      color: var(--text);
    }
    .close-btn {
      display: inline-block;
      background: var(--primary);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }
    .close-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
    }
    @keyframes scaleIn {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card ${isDeniedClass}">
      <div class="icon-container ${iconClass}">
        ${iconSvg}
      </div>
      <h1>${title}</h1>
      <p>${message}</p>
      <div class="user-info">
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value" style="color: ${statusColor}">${statusLabel}</span>
        </div>
      </div>
      <button onclick="window.close()" class="close-btn">Close Window</button>
    </div>
  </div>
</body>
</html>
    `;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  };

  // 1. Parameter validation
  if (!action || !uid || !token) {
    return renderPage({
      title: "Invalid Request",
      message: "Required parameters are missing from this URL.",
      name: "N/A",
      email: "N/A",
      status: "error",
      isError: true,
    });
  }

  if (action !== "approve" && action !== "deny") {
    return renderPage({
      title: "Invalid Action",
      message: "The requested action is not valid.",
      name: "N/A",
      email: "N/A",
      status: "error",
      isError: true,
    });
  }

  try {
    // 2. Fetch the request document
    const docRef = adminDb.collection("accessRequests").doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return renderPage({
        title: "Request Not Found",
        message: "This access request could not be located in our system.",
        name: "N/A",
        email: "N/A",
        status: "error",
        isError: true,
      });
    }

    const data = docSnap.data();

    // 3. Verify security token matches
    if (data?.token !== token) {
      return renderPage({
        title: "Unauthorized Action",
        message: "The security token provided does not match or is invalid.",
        name: data?.name || "Unknown",
        email: data?.email || "Unknown",
        status: "error",
        isError: true,
      });
    }

    // 4. Update the access status
    const newStatus = action === "approve" ? "approved" : "denied";
    await docRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return renderPage({
      title: action === "approve" ? "Access Approved" : "Access Denied",
      message:
        action === "approve"
          ? "Access request approved. The user is now permitted to sign in."
          : "Access request denied. The user will be blocked from accessing the app.",
      name: data?.name || "Unknown",
      email: data?.email || "Unknown",
      status: newStatus,
    });
  } catch (error) {
    console.error("Error updating access request status:", error);
    return renderPage({
      title: "Server Error",
      message: "An internal error occurred while processing the request.",
      name: "N/A",
      email: "N/A",
      status: "error",
      isError: true,
    });
  }
}
