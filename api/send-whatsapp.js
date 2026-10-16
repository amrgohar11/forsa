// ============================================
// FORSA - WhatsApp Cloud API Sender
// Vercel Serverless Function
// ============================================

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get env variables
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const API_VERSION = process.env.WHATSAPP_API_VERSION || "v18.0";

  if (!TOKEN || !PHONE_ID) {
    return res.status(500).json({ 
      error: "WhatsApp credentials not configured" 
    });
  }

  try {
    // Parse body
    const { to, message, template, params } = req.body || {};

    if (!to) {
      return res.status(400).json({ error: "Missing 'to' phone number" });
    }

    // Format phone (Egypt format)
    const cleanPhone = String(to).replace(/\D/g, "");
    let intlPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      intlPhone = "20" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("20")) {
      intlPhone = "20" + cleanPhone;
    }

    // Build payload
    let payload;

    if (template) {
      // ===== Template message (business-initiated) =====
      let components = [];
      if (params && params.length > 0) {
        components = [{
          type: "body",
          parameters: params.map(p => ({
            type: "text",
            text: String(p)
          }))
        }];
      }

      // Language: ar for custom templates, en_US for hello_world
      const templateLang = template === "hello_world" ? "en_US" : "ar";

      payload = {
        messaging_product: "whatsapp",
        to: intlPhone,
        type: "template",
        template: {
          name: template,
          language: { code: templateLang },
          components: components
        }
      };
    } else if (message) {
      // ===== Text message (only within 24h window) =====
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: intlPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      };
    } else {
      // ===== Fallback to hello_world =====
      payload = {
        messaging_product: "whatsapp",
        to: intlPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" }
        }
      };
    }

    // Send to WhatsApp API
    const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || "WhatsApp API error",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.messages?.[0]?.id,
      to: intlPhone
    });

  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}