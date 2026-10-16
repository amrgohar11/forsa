// ============================================
// ========== ADMIN COUPONS MANAGEMENT ========
// ============================================

let allCoupons = [];
let filteredCoupons = [];
let editCouponCode = null;

// ========== LOAD COUPONS ==========
async function loadCoupons() {
  if (typeof initFirebase !== "function" || !initFirebase()) {
    console.warn("Firebase مش متاح");
    showToast("❌ Firebase مش متاح", true);
    return;
  }

  const tbody = document.getElementById("admin-coupons-body");
  const empty = document.getElementById("coupons-empty");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--gray); padding: 40px;">⏳ جاري التحميل...</td></tr>`;

  allCoupons = (await fbGetCoupons()) || [];
  filteredCoupons = [...allCoupons];

  renderCoupons();
}

// ========== RENDER COUPONS ==========
function renderCoupons() {
  const tbody = document.getElementById("admin-coupons-body");
  const empty = document.getElementById("coupons-empty");
  if (!tbody) return;

  // Stats
  const totalEl = document.getElementById("stat-coupons-total");
  const activeEl = document.getElementById("stat-coupons-active");
  const usedEl = document.getElementById("stat-coupons-used");

  if (totalEl) totalEl.textContent = allCoupons.length;
  if (activeEl) activeEl.textContent = allCoupons.filter(c => c.active).length;
  if (usedEl) usedEl.textContent = allCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  // Empty state
  if (filteredCoupons.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  // Render rows
  tbody.innerHTML = filteredCoupons.map((c, i) => {
    const discountText = c.type === "percentage"
      ? `${c.value}%`
      : `${c.value} ج`;

    const minOrderText = c.minOrder > 0
      ? `${c.minOrder} ج`
      : "—";

    const maxDiscountText = c.type === "percentage" && c.maxDiscount > 0
      ? `${c.maxDiscount} ج`
      : "—";

    const usageText = c.usageLimit > 0
      ? `${c.usedCount || 0} / ${c.usageLimit}`
      : `${c.usedCount || 0} / ∞`;

    const statusClass = c.active ? "active" : "inactive";
    const statusText = c.active ? "✅ نشط" : "❌ موقوف";

    // ===== First Order Badge =====
    const firstOrderBadge = c.firstOrderOnly
      ? `<span class="coupon-status active" style="background: rgba(23, 105, 255, 0.15); color: var(--blue-light); border-color: rgba(23, 105, 255, 0.3); margin-top: 4px; display: block; font-size: 10px;">🎯 أول طلب</span>`
      : "";

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span class="coupon-code-badge">${c.code}</span>
          ${firstOrderBadge}
        </td>
        <td><span class="coupon-discount-badge">${discountText}</span></td>
        <td>${minOrderText}</td>
        <td>${maxDiscountText}</td>
        <td>${usageText}</td>
        <td><span class="coupon-status ${statusClass}">${statusText}</span></td>
        <td>
          <div class="order-actions">
            <button class="btn-blue" onclick="editCoupon('${c.code}')" style="padding: 6px 10px; font-size: 12px;">✏️</button>
            <button class="btn-gray" onclick="toggleCouponStatus('${c.code}', ${!c.active})" style="padding: 6px 10px; font-size: 12px;">${c.active ? "⏸️" : "▶️"}</button>
            <button class="btn-red" onclick="deleteCoupon('${c.code}')" style="padding: 6px 10px; font-size: 12px;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ========== FILTER COUPONS ==========
function filterCoupons() {
  const input = document.getElementById("coupons-search");
  if (!input) return;
  const q = input.value.toLowerCase().trim();

  if (!q) {
    filteredCoupons = [...allCoupons];
  } else {
    filteredCoupons = allCoupons.filter(c =>
      (c.code || "").toLowerCase().includes(q)
    );
  }
  renderCoupons();
}

// ========== OPEN MODAL ==========
function openCouponModal(coupon = null) {
  editCouponCode = coupon ? coupon.code : null;

  document.getElementById("coupon-modal-title").textContent = coupon ? "تعديل كوبون" : "إضافة كوبون";
  document.getElementById("c-code").value = coupon ? coupon.code : "";
  document.getElementById("c-code").disabled = !!coupon; // منع تعديل الكود
  document.getElementById("c-type").value = coupon ? coupon.type : "percentage";
  document.getElementById("c-value").value = coupon ? coupon.value : "";
  document.getElementById("c-minorder").value = coupon ? (coupon.minOrder || 0) : 0;
  document.getElementById("c-maxdiscount").value = coupon ? (coupon.maxDiscount || 0) : 0;
  document.getElementById("c-usagelimit").value = coupon ? (coupon.usageLimit || 0) : 0;
  document.getElementById("c-active").checked = coupon ? coupon.active : true;

  // ===== First Order Only =====
  const firstOrderEl = document.getElementById("c-firstorder");
  if (firstOrderEl) {
    firstOrderEl.checked = coupon ? (coupon.firstOrderOnly || false) : false;
  }

  document.getElementById("coupon-modal").classList.add("active");
}

function closeCouponModal(e) {
  if (!e || e.target.id === "coupon-modal") {
    document.getElementById("coupon-modal").classList.remove("active");
    document.getElementById("coupon-form").reset();
    document.getElementById("c-code").disabled = false;
    editCouponCode = null;
  }
}

// ========== SAVE COUPON ==========
async function saveCoupon(e) {
  e.preventDefault();

  const code = document.getElementById("c-code").value.trim().toUpperCase();
  const type = document.getElementById("c-type").value;
  const value = parseFloat(document.getElementById("c-value").value);
  const minOrder = parseFloat(document.getElementById("c-minorder").value) || 0;
  const maxDiscount = parseFloat(document.getElementById("c-maxdiscount").value) || 0;
  const usageLimit = parseInt(document.getElementById("c-usagelimit").value) || 0;
  const active = document.getElementById("c-active").checked;

  // ===== First Order Only =====
  const firstOrderEl = document.getElementById("c-firstorder");
  const firstOrderOnly = firstOrderEl ? firstOrderEl.checked : false;

  // Validation
  if (!code) {
    showToast("⚠️ اكتب كود الكوبون", true);
    return;
  }

  if (code.length < 3) {
    showToast("⚠️ الكود لازم يكون 3 حروف على الأقل", true);
    return;
  }

  if (!value || value <= 0) {
    showToast("⚠️ اكتب قيمة خصم صحيحة", true);
    return;
  }

  if (type === "percentage" && value > 100) {
    showToast("⚠️ النسبة المئوية مينفعش تزيد عن 100%", true);
    return;
  }

  // ===== تعطيل الزر =====
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ جاري الحفظ...";
  }

  // ===== حفظ =====
  const couponData = {
    code,
    type,
    value,
    minOrder,
    maxDiscount,
    usageLimit,
    active,
    firstOrderOnly: firstOrderOnly,
    usedCount: editCouponCode ? (allCoupons.find(c => c.code === editCouponCode)?.usedCount || 0) : 0
  };

  let success = false;

  if (editCouponCode) {
    // تعديل
    success = await fbUpdateCoupon(editCouponCode, couponData);
  } else {
    // إضافة
    success = await fbAddCoupon(code, couponData);
  }

  // ===== استرجاع الزر =====
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 حفظ";
  }

  if (success) {
    showToast(editCouponCode ? "✅ تم تعديل الكوبون" : "✅ تم إضافة الكوبون");
    closeCouponModal();
    loadCoupons();
  } else {
    showToast("❌ فشل الحفظ، جرب تاني", true);
  }
}

// ========== EDIT COUPON ==========
function editCoupon(code) {
  const coupon = allCoupons.find(c => c.code === code);
  if (coupon) openCouponModal(coupon);
}

// ========== TOGGLE STATUS ==========
async function toggleCouponStatus(code, newStatus) {
  const success = await fbUpdateCoupon(code, { active: newStatus });
  if (success) {
    showToast(newStatus ? "✅ تم تفعيل الكوبون" : "⏸️ تم إيقاف الكوبون");
    loadCoupons();
  } else {
    showToast("❌ فشل التحديث", true);
  }
}

// ========== DELETE COUPON ==========
async function deleteCoupon(code) {
  if (!confirm(`هل أنت متأكد من حذف كوبون "${code}"؟`)) return;

  const success = await fbDeleteCoupon(code);
  if (success) {
    showToast("🗑️ تم حذف الكوبون");
    loadCoupons();
  } else {
    showToast("❌ فشل الحذف", true);
  }
}

// ========== AUTO-LOAD WHEN TAB IS OPENED ==========
// (يتم استدعاؤها من switchAdminTab في admin-orders.js)