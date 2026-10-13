// ========== ORDERS PAGE ==========
const WHATSAPP_NUMBER = "201556687455";

// ========== SEARCH ORDERS ==========
async function searchOrders() {
  const phoneInput = document.getElementById("phone-search");
  const phone = phoneInput.value.trim();
  const resultEl = document.getElementById("orders-result");
  const btn = document.getElementById("search-btn");

  // تحقق من الرقم
  if (!phone || phone.length < 11) {
    showEmptyState("⚠️ اكتب رقم موبايل صحيح (11 رقم)");
    return;
  }

  // Firebase
  if (typeof initFirebase !== "function" || !initFirebase()) {
    showEmptyState("❌ حصلت مشكلة، جرب تاني");
    return;
  }

  // تحميل
  btn.disabled = true;
  btn.innerHTML = "⏳ جاري البحث...";
  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <h3>جاري البحث...</h3>
    </div>
  `;

  try {
    // جلب الطلبات من Firebase
    const orders = await fbGetOrdersByPhone(phone) || [];

    if (orders.length === 0) {
      showEmptyState("📭 مفيش طلبات بالرقم ده");
      return;
    }

    // ترتيب حسب التاريخ (الأحدث الأول)
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || 0;
      const dateB = b.createdAt?.toDate?.() || 0;
      return dateB - dateA;
    });

    renderOrders(orders);

  } catch (err) {
    console.error(err);
    showEmptyState("❌ حصلت مشكلة، جرب تاني");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "🔍 اعرض طلباتي";
  }
}

// ========== RENDER ORDERS ==========
function renderOrders(orders) {
  const resultEl = document.getElementById("orders-result");

  const html = `
    <div style="text-align:center; margin-bottom:24px; color: var(--gray);">
      <span style="color:var(--lime); font-weight:900; font-size:20px;">${orders.length}</span> طلب
    </div>
    <div class="orders-list">
      ${orders.map((order, index) => renderOrderCard(order, index)).join("")}
    </div>
  `;

  resultEl.innerHTML = html;

  // تشغيل fade-up للعناصر الجديدة
  setTimeout(() => {
    resultEl.querySelectorAll(".order-card").forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), i * 100);
    });
  }, 50);
}

// ========== RENDER SINGLE ORDER ==========
function renderOrderCard(order, index) {
  const date = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
    : "-";

  const statusClass = {
    "جديد": "new",
    "تم الشحن": "shipped",
    "تم التسليم": "delivered",
    "ملغي": "cancelled"
  }[order.status] || "new";

  const itemsHtml = (order.items || []).map(item => `
    <div class="order-item">
      <div class="order-item-img">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : (item.icon || "📦")}
      </div>
      <div class="order-item-info">
        <h4>${item.name}</h4>
        <p>${item.price} ج × ${item.qty}</p>
      </div>
      <div class="order-item-price">${item.price * item.qty} ج</div>
    </div>
  `).join("");

  return `
    <div class="order-card fade-up">
      <div class="order-card-header">
        <div>
          <div class="order-id">طلب #${String(index + 1).padStart(3, "0")}</div>
          <div class="order-date">📅 ${date}</div>
        </div>
        <span class="order-status ${statusClass}">${order.status || "جديد"}</span>
      </div>

      <div class="order-items">
        ${itemsHtml}
      </div>

      <div class="order-total-row">
        <span class="order-total-label">الإجمالي النهائي:</span>
        <span class="order-total-value">${order.total || 0} ج</span>
      </div>
      <div class="order-payment">
        💳 ${order.paymentMethod || "-"}
      </div>
    </div>
  `;
}

// ========== EMPTY STATE ==========
function showEmptyState(message) {
  const resultEl = document.getElementById("orders-result");
  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>${message}</h3>
      <p>لو عندك أي استفسار، كلمنا على واتساب.</p>
      <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" class="btn-primary" style="display:inline-flex;">
        💬 تواصل معانا
      </a>
    </div>
  `;
}

// ========== ENTER KEY ==========
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("phone-search");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchOrders();
    });
  }
});