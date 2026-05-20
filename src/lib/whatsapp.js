/**
 * WhatsApp Cloud API helper — the official Meta API.
 *
 * Unlike whatsapp-web.js (which automates WhatsApp Web in a browser), the
 * Cloud API works over webhooks: Meta sends you incoming messages, and you
 * send replies with a normal HTTPS request. No browser, no QR code.
 */

const API_VERSION = "v21.0";

/**
 * Send a text message through the WhatsApp Cloud API.
 *
 * @param {string} phoneNumberId  the sender number's id (from Meta)
 * @param {string} to             recipient's phone number, digits only
 * @param {string} text           message body
 */
export async function sendWhatsAppMessage(phoneNumberId, to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    throw new Error("WHATSAPP_TOKEN is not set in .env");
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
  return res.json();
}
