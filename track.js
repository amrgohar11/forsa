// ============================================
// FORSA - Track Order Page
// تتبع الطلب برقم الطلب
// ============================================

// ========== TRACK ORDER ==========
async function trackOrder() {
  const input = document.getElementById("track-input");
  const btn = document.getElementById("track-btn");
  const resultDiv = document.getElementById("track-result");

  if (!input || !resultDiv) return;

  const query = input.value.trim();

  if (!query) {
    resultDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>اكتب رقم الطلب</h3>
        <p>مثال: 604680</p>
      </div>
    `;
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ جاري البحث...";
  }

  resultDiv.innerHTML = `
    <div class="empty-state">
      <div class="loader-inner" style="margin: 0 auto 16px;"></div>
      <p>جاري البحث عن الطلب...</p>
    </div>
  `;

  try {
    if (typeof initFirebase !== "function" || !initFirebase()) {
      throw new Error("Firebase مش متاح");
    }

    const db = firebase.firestore();
    let order = null;

    // ===== بحث بـ orderNumber =====
    const orderNum = parseInt(query.replace(/\D/g, ""));

    if (!isNaN(orderNum)) {
      const snapshot = await db.collection("orders")
        .where("orderNumber", "==", orderNum)
        .limit(1)
        .get();

      snapshot.forEach(doc => {
        order = { id: doc.id, ...doc.data() };
      });

      // ===== لو مش لاقي بـ orderNumber، جرب بـ id =====
      if (!order) {
        try {
          const docRef = await db.collection("orders").doc(query).get();
          if (docRef.exists) {
            order = { id: docRef.id, ...docRef.data() };
          }
        } catch (e) {
          // مش مشكلة، هنكمل
        }
      }
    }

    // ===== لو مفيش طلب =====
    if (!order) {
      resultDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>مفيش طلب بالرقم ده</h3>
          <p>اتأكد من رقم الطلب وحاول تاني</p>
          <a href="orders.html" class="btn-secondary" style="display:inline-block; margin-top:16px; padding:12px 24px; text-decoration:none;">
            📦 اعرض كل طلباتي
          </a>
        </div>
      `;
      return;
    }

    // ===== اعرض الطلب =====
    renderOrderTracking(order, resultDiv);

  } catch (e) {
    console.error("Error tracking order:", e);
    resultDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3>حصلت مشكلة</h3>
        <p>جرب تاني بعد شوية</p>
      </div>
    `;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🔍 تتبع الطلب";
    }
  }
}

// ========== RENDER ORDER TRACKING ==========
function renderOrderTracking(order, container) {
  const status = order.status || "جديد";
  const orderNum = order.orderNumber || order.id.slice(-6);

  // ===== Progress Steps =====
  const steps = [
    { key: "جديد",      label: "تم الاستلام",   icon: "📥", desc: "طلبك وصلنا" },
    { key: "تم الشحن",  label: "تم الشحن",     icon: "🚚", desc: "في الطريق ليك" },
    { key: "تم التسليم", label: "تم التسليم",  icon: "✅", desc: "استلمت طلبك" }
  ];

  const statusIndex = {
    "جديد": 0,
    "تم الشحن": 1,
    "تم التسليم": 2,
    "ملغي": -1
  }[status] ?? 0;

  const isCancelled = status === "ملغي";

  // ===== Progress HTML =====
  let progressHtml = "";

  if (isCancelled) {
    progressHtml = `
      <div class="track-cancelled">
        <div class="track-cancelled-icon">❌</div>
        <h3>الطلب ملغي</h3>
        <p>لو ده مش صح، كلمنا فوراً على واتساب</p>
      </div>
    `;
  } else {
    progressHtml = `
      <div class="track-progress">
        ${steps.map((step, i) => {
          const isDone = i <= statusIndex;
          const isCurrent = i === statusIndex;
          return `
            <div class="track-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
              <div class="track-step-circle">
                ${isDone ? step.icon : (i + 1)}
              </div>
              <div class="track-step-label">${step.label}</div>
              <div class="track-step-desc">${step.desc}</div>
            </div>
            ${i < steps.length - 1 ? `<div class="track-line ${i < statusIndex ? 'done' : ''}"></div>` : ""}
          `;
        }).join("")}
      </div>
    `;
  }

  // ===== Date =====
  const date = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString("ar-EG", {
        dateStyle: "long",
        timeStyle: "short"
      })
    : "-";

  // ===== Items =====
  const itemsHtml = (order.items || []).map(item => `
    <div class="track-item">
      <div class="track-item-img">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.parentElement.innerHTML='${item.icon || '📦'}'" />`
          : (item.icon || "📦")}
      </div>
      <div class="track-item-info">
        <h4>${item.name}</h4>
        <p>${item.price} ج × ${item.qty}</p>
      </div>
      <div class="track-item-price">${item.price * item.qty} ج</div>
    </div>
  `).join("");

  // ===== Status Badge =====
  const statusClass = {
    "جديد": "new",
    "تم الشحن": "shipped",
    "تم التسليم": "delivered",
    "ملغي": "cancelled"
  }[status] || "new";

  // ===== WhatsApp Message =====
  const waMessage = encodeURIComponent(
    `مرحباً، عايز أستفسر عن طلبي رقم #${orderNum}`
  );

  // ===== Render =====
  container.innerHTML = `
    <div class="track-order-card">

      <!-- Header -->
      <div class="track-order-header">
        <div>
          <div class="track-order-id">#${orderNum}</div>
          <div class="track-order-date">📅 ${date}</div>
        </div>
        <span class="order-status ${statusClass}">${status}</span>
      </div>

      <!-- Progress -->
      ${progressHtml}

      <!-- Items -->
      <div class="track-section">
        <h3 class="track-section-title">🛒 تفاصيل الطلب</h3>
        <div class="track-items">
          ${itemsHtml}
        </div>
      </div>

      <!-- Address -->
      <div class="track-section">
        <h3 class="track-section-title">📍 عنوان التوصيل</h3>
        <div class="track-address">
          <div class="track-address-row">
            <strong>👤 الاسم:</strong>
            <span>${order.name || "-"}</span>
          </div>
          <div class="track-address-row">
            <strong>📞 الموبايل:</strong>
            <span>${order.phone || "-"}</span>
          </div>
          <div class="track-address-row">
            <strong>🏠 العنوان:</strong>
            <span>${order.address || "-"}</span>
          </div>
          <div class="track-address-row">
            <strong>🏙️ المحافظة:</strong>
            <span>${order.city || "-"}</span>
          </div>
        </div>
      </div>

      <!-- Total -->
      <div class="track-section">
        <h3 class="track-section-title">💰 ملخص الدفع</h3>
        <div class="track-totals">
          <div class="track-total-row">
            <span>الإجمالي:</span>
            <span>${order.subtotal || 0} ج</span>
          </div>
          <div class="track-total-row">
            <span>الشحن:</span>
            <span>${order.shipping || 0} ج</span>
          </div>
          ${order.discount > 0 ? `
            <div class="track-total-row discount">
              <span>🎟️ الخصم:</span>
              <span>-${order.discount} ج</span>
            </div>
          ` : ""}
          <div class="track-total-row final">
            <span>الإجمالي النهائي:</span>
            <span>${order.total || 0} ج</span>
          </div>
          <div class="track-payment-method">
            ${order.paymentMethod || "-"}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="track-actions">
        <a href="https://wa.me/201556687455?text=${waMessage}" target="_blank" class="track-btn track-btn-wa">
          💬 كلمنا على واتساب
        </a>
        <a href="orders.html" class="track-btn track-btn-secondary">
          📦 كل طلباتي
        </a>
      </div>

    </div>
  `;
}

// ========== AUTO-LOAD FROM URL ==========
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id") || urlParams.get("order");

  const input = document.getElementById("track-input");

  if (input && orderId) {
    input.value = orderId;
    // استنى شوية عشان Firebase يتهيأ
    setTimeout(() => trackOrder(), 300);
  }
});

// ========== ENTER KEY ==========
window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("track-input");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        trackOrder();
      }
    });
  }
});