// ========== ADMIN ORDERS ==========
let allOrders = [];
let filteredOrders = [];

// ⚠️ ملاحظة: switchAdminTab اتشالت من هنا لأنها موجودة في admin.js
// (كانت بتلغى النسخة الجديدة اللي فيها categories)

// ========== LOAD ORDERS ==========
async function loadOrders() {
  if (typeof initFirebase !== "function" || !initFirebase()) {
    console.warn("Firebase مش متاح");
    showToast("❌ Firebase مش متاح", true);
    return;
  }

  const tbody = document.getElementById("admin-orders-body");
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--gray); padding: 40px;">⏳ جاري التحميل...</td></tr>`;

  allOrders = (await fbGetOrders()) || [];
  filteredOrders = [...allOrders];

  renderOrders();
}

// ========== RENDER ORDERS ==========
function renderOrders() {
  const tbody = document.getElementById("admin-orders-body");
  const empty = document.getElementById("orders-empty");
  if (!tbody) return;

  // Stats
  const totalEl = document.getElementById("stat-orders-total");
  const newEl = document.getElementById("stat-orders-new");
  const revenueEl = document.getElementById("stat-orders-revenue");

  if (totalEl) totalEl.textContent = allOrders.length;
  if (newEl) newEl.textContent = allOrders.filter(o => o.status === "جديد").length;
  if (revenueEl) {
    const revenue = allOrders
      .filter(o => o.status !== "ملغي")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    revenueEl.textContent = revenue.toLocaleString("ar-EG");
  }

  if (filteredOrders.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  tbody.innerHTML = filteredOrders.map((order, i) => {
    const date = order.createdAt?.toDate
      ? order.createdAt.toDate().toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
      : "-";

    const itemsText = (order.items || []).map(item => `${item.name} × ${item.qty}`).join(" ، ");

    const statusClass = {
      "جديد": "new",
      "تم الشحن": "shipped",
      "تم التسليم": "delivered",
      "ملغي": "cancelled"
    }[order.status] || "new";

    return `
      <tr>
        <td>${i + 1}</td>
        <td><div class="order-date">${date}</div></td>
        <td>
          <div class="order-customer">${order.name || "-"}</div>
          <div class="order-phone">📞 ${order.phone || "-"}</div>
        </td>
        <td>
          <div class="order-row-details">${itemsText || "-"}</div>
        </td>
        <td><span class="order-total">${order.total || 0} ج</span></td>
        <td><div class="order-row-details">${order.paymentMethod || "-"}</div></td>
        <td><span class="order-status ${statusClass}">${order.status || "جديد"}</span></td>
        <td>
          <div class="order-actions">
            <select class="status-select" onchange="changeOrderStatus('${order.id}', this.value)">
              <option value="جديد" ${order.status === "جديد" ? "selected" : ""}>جديد</option>
              <option value="تم الشحن" ${order.status === "تم الشحن" ? "selected" : ""}>تم الشحن</option>
              <option value="تم التسليم" ${order.status === "تم التسليم" ? "selected" : ""}>تم التسليم</option>
              <option value="ملغي" ${order.status === "ملغي" ? "selected" : ""}>ملغي</option>
            </select>
            <button class="btn-gray" onclick="viewOrder('${order.id}')" style="padding: 6px 10px; font-size: 12px;">👁️</button>
            <button class="btn-red" onclick="deleteOrder('${order.id}')" style="padding: 6px 10px; font-size: 12px;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ========== FILTER ORDERS ==========
function filterOrders() {
  const input = document.getElementById("orders-search");
  if (!input) return;
  const q = input.value.toLowerCase().trim();

  if (!q) {
    filteredOrders = [...allOrders];
  } else {
    filteredOrders = allOrders.filter(o =>
      (o.name || "").toLowerCase().includes(q) ||
      (o.phone || "").includes(q)
    );
  }
  renderOrders();
}

// ========== CHANGE STATUS ==========
async function changeOrderStatus(id, status) {
  const success = await fbUpdateOrderStatus(id, status);
  if (success) {
    const order = allOrders.find(o => o.id === id);
    if (order) order.status = status;
    showToast(`✅ تم تحديث الحالة: ${status}`);
    renderOrders();
  } else {
    showToast("❌ فشل تحديث الحالة", true);
  }
}

// ========== DELETE ORDER ==========
async function deleteOrder(id) {
  if (!confirm("هل أنت متأكد من حذف الطلب؟")) return;
  const success = await fbDeleteOrder(id);
  if (success) {
    allOrders = allOrders.filter(o => o.id !== id);
    filteredOrders = filteredOrders.filter(o => o.id !== id);
    renderOrders();
    showToast("🗑️ تم حذف الطلب");
  } else {
    showToast("❌ فشل الحذف", true);
  }
}

// ========== VIEW ORDER DETAILS ==========
function viewOrder(id) {
  const order = allOrders.find(o => o.id === id);
  if (!order) return;

  const itemsHtml = (order.items || []).map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:700;">${item.name}</div>
        <div style="color:var(--gray); font-size:13px;">${item.price} ج × ${item.qty}</div>
      </div>
      <div style="color:var(--lime); font-weight:800;">${item.price * item.qty} ج</div>
    </div>
  `).join("");

  document.getElementById("order-details").innerHTML = `
    <div style="display:grid; gap:12px; margin-bottom:20px;">
      <div><strong>👤 الاسم:</strong> ${order.name || "-"}</div>
      <div><strong>📞 الموبايل:</strong> ${order.phone || "-"}</div>
      <div><strong>📍 العنوان:</strong> ${order.address || "-"} - ${order.city || "-"}</div>
      ${order.notes ? `<div><strong>📝 ملاحظات:</strong> ${order.notes}</div>` : ""}
      <div><strong>💳 طريقة الدفع:</strong> ${order.paymentMethod || "-"}</div>
      <div><strong>📊 الحالة:</strong> ${order.status || "جديد"}</div>
      <div><strong>📅 التاريخ:</strong> ${
        order.createdAt?.toDate
          ? order.createdAt.toDate().toLocaleString("ar-EG")
          : "-"
      }</div>
    </div>
    <h3 style="margin-bottom:10px; color:var(--lime);">🛒 المنتجات</h3>
    ${itemsHtml}
    <div style="margin-top:16px; padding-top:16px; border-top:2px solid var(--border);">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; color: var(--gray-light);">
        <span>الإجمالي:</span>
        <span>${order.subtotal || 0} ج</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; color: var(--gray-light);">
        <span>الشحن:</span>
        <span>${order.shipping || 0} ج</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:900; color:var(--lime); padding-top:10px; border-top:1px solid var(--border); margin-top:10px;">
        <span>الإجمالي النهائي:</span>
        <span>${order.total || 0} ج</span>
      </div>
    </div>
    <div style="margin-top:20px; text-align:center;">
      <button class="btn-gray" onclick="closeOrderModal(null, true)" style="padding: 12px 30px;">إغلاق</button>
    </div>
  `;

  document.getElementById("order-modal").classList.add("active");
}

function closeOrderModal(e, force = false) {
  if (force || (e && e.target.id === "order-modal")) {
    const modal = document.getElementById("order-modal");
    if (modal) modal.classList.remove("active");
  }
}

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