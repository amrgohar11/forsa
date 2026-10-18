// ============================================
// FORSA - WhatsApp Client (WAHA)
// ============================================

// ===== إعدادات WAHA =====
const WAHA_API_URL = "https://waha-production-d9a5.up.railway.app"; // ← رابطك من Railway
const WAHA_API_KEY = "wak_Y7YT0G3YZC1LJWGS"; // ← الـ API Key بتاعك

// ===== إرسال رسالة عبر WAHA =====
async function sendWhatsAppMessage(phone, message, template, params) {
  if (!phone) {
    return { success: false, error: "Missing phone" };
  }

  if (!message) {
    return { success: false, error: "Missing message" };
  }

  try {
    // تنسيق رقم الموبايل لـ WAHA (لازم ينتهي بـ @c.us)
    const chatId = `${phone.replace(/\D/g, "")}@c.us`;

    const response = await fetch(`${WAHA_API_URL}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY
      },
      body: JSON.stringify({
        session: "default",
        chatId: chatId,
        text: message
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ WhatsApp sent via WAHA:", data.id);
      return { success: true, messageId: data.id };
    } else {
      console.warn("⚠️ WAHA failed:", data);
      return { success: false, error: data.message || "Unknown error" };
    }
  } catch (error) {
    console.error("❌ WAHA network error:", error);
    return { success: false, error: error.message };
  }
}

// ===== إرسال تأكيد الطلب =====
async function sendOrderConfirmation(phone, order) {
  const itemsText = (order.items || [])
    .map(item => `• ${item.name} × ${item.qty} = ${item.price * item.qty} ج`)
    .join("\n");

  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;

  const message =
`🛒 *طلبك على FORSA تم بنجاح!*

أهلاً ${order.name} 👋

طلبك رقم *#${order.orderNumber}* وصلنا.

*📦 تفاصيل الطلب:*
${itemsText}

💰 *الإجمالي:* ${order.subtotal} ج
🚚 *الشحن:* ${order.shipping} ج
🧾 *الإجمالي النهائي:* ${order.total} ج

📍 *العنوان:* ${order.address} - ${order.city}

🔗 تتبع طلبك من هنا:
${trackUrl}

—
FORSA - لُقطة تستاهلها 🎯`;

  return sendWhatsAppMessage(phone, message);
}

// ===== إرسال إشعار الشحن =====
async function sendOrderShipped(phone, order) {
  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;
  const deliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });

  const message =
`🚚 *طلبك رقم #${order.orderNumber} في الطريق!*

أهلاً ${order.name} 👋

طلبك اتبعت مع المندوب، وهتستلمه خلال 1-2 يوم إن شاء الله.

📅 *التسليم المتوقع:* ${deliveryDate}

🔗 تتبع طلبك من هنا:
${trackUrl}

—
FORSA - لُقطة تستاهلها 🎯`;

  return sendWhatsAppMessage(phone, message);
}

// ===== إرسال إشعار التسليم =====
async function sendOrderDelivered(phone, order) {
  const message =
`✅ *مبروك يا ${order.name}! استلمت طلبك رقم #${order.orderNumber}*

نتمنى تكون مبسوط بالطلب. لو عندك أي استفسار، إحنا موجودين على واتساب.

شكراً لثقتك في FORSA 💚

—
FORSA - لُقطة تستاهلها 🎯`;

  return sendWhatsAppMessage(phone, message);
}

// ===== بناء رسالة تأكيد الطلب (نص عادي - fallback) =====
function buildOrderConfirmationMessage(order) {
  const itemsText = (order.items || [])
    .map(item => `• ${item.name} × ${item.qty} = ${item.price * item.qty} ج`)
    .join("\n");

  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;

  return `🛒 *طلبك على FORSA تم بنجاح!*

أهلاً ${order.name} 👋

شكراً لثقتك فينا! طلبك رقم *#${order.orderNumber}* وصلنا.

*📦 تفاصيل الطلب:*
${itemsText}

💰 *الإجمالي:* ${order.subtotal} ج
🚚 *الشحن:* ${order.shipping} ج
${order.discount > 0 ? `🎟️ *الخصم:* -${order.discount} ج\n` : ""}🧾 *الإجمالي النهائي:* ${order.total} ج

📍 *العنوان:* ${order.address}
🏙️ *المحافظة:* ${order.city}

⏱️ *التوصيل المتوقع:* 2-4 أيام عمل

🔗 تتبع طلبك من هنا:
${trackUrl}

أي استفسار؟ رد على الرسالة 💬

—
FORSA - لُقطة تستاهلها 🎯`;
}

// ===== بناء رسالة تغيير الحالة (نص عادي - fallback) =====
function buildStatusUpdateMessage(order, newStatus) {
  const statusConfig = {
    "جديد": { emoji: "🆕", msg: "طلبك وصلنا وجاري تجهيزه 📦" },
    "تم الشحن": { emoji: "🚚", msg: "طلبك اتبعت مع المندوب! هتستلمه خلال 1-2 يوم" },
    "تم التسليم": { emoji: "✅", msg: "مبروك! استلمت طلبك 🎉 نتمنى تكون مبسوط بيه" },
    "ملغي": { emoji: "❌", msg: "طلبك اتلغى. لو ده مش صح، كلمنا فورًا" }
  };

  const config = statusConfig[newStatus] || {
    emoji: "📢",
    msg: `حالة طلبك اتغيرت لـ ${newStatus}`
  };

  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;

  return `${config.emoji} *تحديث طلبك #${order.orderNumber}*

أهلاً ${order.name} 👋

${config.msg}

*💰 الإجمالي:* ${order.total} ج
📍 *العنوان:* ${order.address}

🔗 تتبع طلبك:
${trackUrl}

—
FORSA - لُقطة تستاهلها 🎯`;
}