// ============================================
// FORSA - WhatsApp Cloud API Client
// ============================================

const WA_API_ENDPOINT = "/api/send-whatsapp";

// ===== إرسال رسالة عبر WhatsApp Cloud API =====
async function sendWhatsAppMessage(phone, message, template, params) {
  if (!phone) {
    return { success: false, error: "Missing phone" };
  }

  if (!template && !message) {
    return { success: false, error: "Missing message or template" };
  }

  try {
    const body = {
      to: phone
    };

    if (template) {
      body.template = template;
      body.params = params || [];
    } else {
      body.message = message;
    }

    const response = await fetch(WA_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ WhatsApp sent:", data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      console.warn("⚠️ WhatsApp failed:", data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error("❌ WhatsApp network error:", error);
    return { success: false, error: error.message };
  }
}

// ===== إرسال تأكيد الطلب عبر Template =====
async function sendOrderConfirmation(phone, order) {
  const itemsText = (order.items || [])
    .map(item => `${item.name} × ${item.qty}`)
    .join(", ");

  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;

  return sendWhatsAppMessage(phone, null, "order_confirmation", [
    order.name || "عميل",
    String(order.orderNumber || ""),
    itemsText || "منتجات",
    String(order.subtotal || 0),
    String(order.shipping || 0),
    String(order.total || 0),
    order.address || "-",
    order.city || "-",
    trackUrl
  ]);
}

// ===== إرسال إشعار الشحن عبر Template =====
async function sendOrderShipped(phone, order) {
  const trackUrl = `https://forsa-store.vercel.app/track.html?id=${order.orderNumber}`;
  const deliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });

  return sendWhatsAppMessage(phone, null, "order_shipped", [
    order.name || "عميل",
    String(order.orderNumber || ""),
    deliveryDate,
    trackUrl
  ]);
}

// ===== إرسال إشعار التسليم عبر Template =====
async function sendOrderDelivered(phone, order) {
  return sendWhatsAppMessage(phone, null, "order_delivered", [
    order.name || "عميل",
    String(order.orderNumber || "")
  ]);
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