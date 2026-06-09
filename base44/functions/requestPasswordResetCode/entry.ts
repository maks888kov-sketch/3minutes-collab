import { createClientFromRequest } from "npm:@base44/sdk@0.8.30";

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return Response.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });

    // Не раскрываем, есть ли аккаунт
    if (!users.length) {
      return Response.json({ message: "If account exists, code was sent" });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const pending = await base44.asServiceRole.entities.PasswordResetCode.filter({
      email: normalizedEmail,
      used: false,
    });

    for (const record of pending) {
      await base44.asServiceRole.entities.PasswordResetCode.update(record.id, { used: true });
    }

    await base44.asServiceRole.entities.PasswordResetCode.create({
      email: normalizedEmail,
      code,
      expires_at: expiresAt,
      used: false,
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: normalizedEmail,
      subject: "Код для сброса пароля — 3Minutes",
      body:
        `Ваш код для сброса пароля в 3Minutes: ${code}\n\n` +
        `Откройте приложение → «Забыли пароль?» → введите этот код и новый пароль.\n` +
        `Код действует 15 минут.\n\n` +
        `Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.`,
      from_name: "3Minutes",
    });

    return Response.json({ message: "Code sent" });
  } catch (error) {
    console.error("requestPasswordResetCode failed:", error);
    return Response.json({ error: error?.message || "Failed to send code" }, { status: 500 });
  }
});
