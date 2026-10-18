// ========== ORDERS PAGE — بحث برقم الطلب ==========
// ✅ تمت إزالة const WHATSAPP_NUMBER لمنع التعارض مع script.js

// ========== SEARCH ORDER BY NUMBER ==========
async function searchOrders() {
  const input = document.getElementById("phone-search");
  const btn = document.getElementById("search-btn");
  const resultEl = document.getElementById("orders-result");

  if (!input || !resultEl) return;

  const query = input.value.trim();

  // تحقق: فاضي
  if (!query) {
    showEmptyState("⚠️ اكتب رقم الطلب");
    return;
  }

  // تحقق: 6 أرقام بالظبط
  if (!/^\d{6}$/.test(query)) {
    showEmptyState("⚠️ رقم الطلب لازم يكون 6 أرقام");
    return;
  }

  // Firebase
  if (typeof initFirebase !== "function" || !initFirebase()) {
    showEmptyState("❌ حصلت مشكلة، جرب تاني");
    return;
  }

  // تحميل
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ جاري البحث...";
  }

  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="loader-inner" style="margin: 0 auto 16px;"></div>
      <h3>جاري البحث عن الطلب...</h3>
    </div>
  `;

  try {
    let order = null;

    // ===== جرب fbGetOrderByNumber أولاً =====
    if (typeof fbGetOrderByNumber === "function") {
      order = await fbGetOrderByNumber(query);
    }

    // ===== لو مش لاقي، جرب fbGetOrderById =====
    if (!order && typeof fbGetOrderById === "function") {
      order = await fbGetOrderById(query);
    }

    // ===== لو مش لاقي، جرب firestore مباشرة =====
    if (!order) {
      const db = firebase.firestore();
      const orderNum = parseInt(query);

      const snapshot = await db.collection("orders")
        .where("orderNumber", "==", orderNum)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        order = { id: doc.id, ...doc.data() };
      }
    }

    // ===== لو مش لاقي نهائي =====
    if (!order) {
      showEmptyState("📭 مفيش طلب بالرقم ده");
      return;
    }

    // ===== اعرض الطلب =====
    renderOrders([order]);

  } catch (err) {
    console.error("Error searching order:", err);
    showEmptyState("❌ حصلت مشكلة، جرب تاني");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "🔍 تتبع الطلب";
    }
  }
}

// ========== RENDER ORDERS ==========
function renderOrders(orders) {
  const resultEl = document.getElementById("orders-result");
  if (!resultEl) return;

  const html = `
    <div class="orders-list">
      ${orders.map((order, index) => renderOrderCard(order, index)).join("")}
    </div>
  `;

  resultEl.innerHTML = html;

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
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.parentElement.innerHTML='${item.icon || '📦'}'" />`
          : (item.icon || "📦")}
      </div>
      <div class="order-item-info">
        <h4>${item.name}</h4>
        <p>${item.price} ج × ${item.qty}</p>
      </div>
      <div class="order-item-price">${item.price * item.qty} ج</div>
    </div>
  `).join("");

  const orderNum = order.orderNumber || order.id.slice(-6);

  return `
    <div class="order-card fade-up">
      <div class="order-card-header">
        <div>
          <div class="order-id">#${orderNum}</div>
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

      <div style="margin-top:16px;">
        <a href="track.html?id=${orderNum}" class="btn-secondary" style="width:100%; display:block; text-align:center; padding:12px; text-decoration:none;">
          📍 تتبع الطلب مباشرة
        </a>
      </div>
    </div>
  `;
}

// ========== EMPTY STATE ==========
function showEmptyState(message) {
  const resultEl = document.getElementById("orders-result");
  if (!resultEl) return;
  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>${message}</h3>
      <p>لو عندك أي استفسار، كلمنا على واتساب.</p>
      <a href="https://wa.me/201556687455" target="_blank" class="btn-primary" style="display:inline-flex; margin-top:16px;">
        💬 تواصل معانا
      </a>
    </div>
  `;
}

// ========== AUTO-LOAD FROM URL + ENTER KEY ==========
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("phone-search");

  if (!input) return;

  // Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchOrders();
    }
  });

  // Auto-load من URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderParam = urlParams.get("id") || urlParams.get("order");

  if (orderParam) {
    input.value = orderParam;
    searchOrders();
  }
});

// ========== FADE-UP OBSERVER ==========
(function initFadeUp() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll(".fade-up").forEach(el => observer.observe(el));
})();