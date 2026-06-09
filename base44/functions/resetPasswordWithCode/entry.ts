import { createClientFromRequest } from "npm:@base44/sdk@0.8.30";

async function setUserPassword(req, appId, user, email, code, newPassword) {
  const apiUrl = req.headers.get("Base44-Api-Url") || "https://base44.app";
  const serviceAuth = req.headers.get("Base44-Service-Authorization");

  if (!serviceAuth) {
    throw new Error("Service authorization missing");
  }

  const headers = {
    "Content-Type": "application/json",
    "X-App-Id": appId,
    Authorization: serviceAuth,
  };

  const attempts = [
    {
      url: `${apiUrl}/api/apps/${appId}/auth/reset-password`,
      body: { email, otp_code: code, new_password: newPassword },
    },
    {
      url: `${apiUrl}/api/apps/${appId}/auth/change-password`,
      body: { user_id: user.id, new_password: newPassword, skip_current_password: true },
    },
    {
      url: `${apiUrl}/api/apps/${appId}/auth/change-password`,
      body: { user_id: user.id, new_password: newPassword },
    },
    {
      url: `${apiUrl}/api/apps/${appId}/entities/User/${user.id}`,
      body: { password: newPassword },
      method: "PUT",
    },
  ];

  let lastError = "Could not set password";

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: attempt.method || "POST",
        headers,
        body: JSON.stringify(attempt.body),
      });

      if (response.ok) {
        return;
      }

      const data = await response.json().catch(() => ({}));
      lastError =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.detail === "string" && data.detail) ||
        JSON.stringify(data?.detail || data) ||
        lastError;
    } catch (err) {
      lastError = err?.message || lastError;
    }
  }

  throw new Error(lastError);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const appId = req.headers.get("Base44-App-Id");
    const { email, code, newPassword } = await req.json();

    if (!email?.trim() || !code?.trim() || !newPassword) {
      return Response.json({ error: "Email, code and new password required" }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 422 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = String(code).trim();

    const records = await base44.asServiceRole.entities.PasswordResetCode.filter({
      email: normalizedEmail,
      code: normalizedCode,
      used: false,
    });

    const record = records[0];
    if (!record) {
      return Response.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await base44.asServiceRole.entities.PasswordResetCode.update(record.id, { used: true });
      return Response.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const user = users[0];
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    await setUserPassword(req, appId, user, normalizedEmail, normalizedCode, newPassword);

    await base44.asServiceRole.entities.PasswordResetCode.update(record.id, { used: true });

    return Response.json({ message: "Password updated" });
  } catch (error) {
    console.error("resetPasswordWithCode failed:", error);
    return Response.json({ error: error?.message || "Failed to reset password" }, { status: 500 });
  }
});
