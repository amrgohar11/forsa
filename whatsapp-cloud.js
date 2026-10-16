// ============================================
// FORSA - WhatsApp Cloud API Client
// ============================================

const WA_API_ENDPOINT = "/api/send-whatsapp";

// ===== إرسال رسالة عبر WhatsApp Cloud API =====
async function sendWhatsAppMessage(phone, message) {
  if (!phone || !message) {
    return { success: false, error: "Missing phone or message" };
  }

  try {
    const response = await fetch(WA_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: phone,
        message: message
      })
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

// ===== بناء رسالة تأكيد الطلب =====
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

// ===== بناء رسالة تغيير الحالة =====
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