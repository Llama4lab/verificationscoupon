exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return { statusCode: 500, body: "Configuration manquante" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "JSON invalide" };
  }

  const { message, recaptchaToken } = body;

  if (!message) {
    return { statusCode: 422, body: JSON.stringify({ ok: false, description: "Message manquant" }) };
  }

  // Vérification reCAPTCHA côté serveur
  if (recaptchaToken) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      const verifyRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`,
        { method: "POST" }
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return {
          statusCode: 403,
          body: JSON.stringify({ ok: false, description: "reCAPTCHA invalide" }),
        };
      }
    }
  }

  // Envoi du message vers Telegram
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const telegramRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
    }),
  });

  const result = await telegramRes.json();

  if (!telegramRes.ok) {
    return {
      statusCode: 502,
      body: JSON.stringify({ ok: false, description: result.description || "Erreur Telegram" }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};