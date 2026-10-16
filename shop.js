// ========== CONFIG ==========
const WHATSAPP_NUMBER = "201556687455";
const SHIPPING = 40;
const STORAGE_KEY = "forsa_products";
const FAV_KEY = "forsa_favorites";
const CART_KEY = "forsa_cart";

// ========== PAYMENT NUMBERS ==========
const PAYMENT_INFO = {
  instapay: "01061863235",
  vodafone: "01061863235"
};

// ========== COUPON STATE (لازم يكون فوق) ==========
let appliedCoupon = null;

let allData = { categories: [], products: [] };
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let favorites = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
let urlParams = new URLSearchParams(window.location.search);

// ========== LOAD DATA ==========
async function loadData() {
  if (typeof initFirebase === "function" && initFirebase()) {
    try {
      const [fbProducts, fbCategories] = await Promise.all([
        fbGetProducts(),
        fbGetCategories()
      ]);

      if (fbProducts && fbProducts.length > 0) {
        fbProducts.sort((a, b) => {
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          return idB - idA;
        });

        allData = {
          products: fbProducts,
          categories: fbCategories || []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        populateCategories();
        applyFilters();
        return;
      }
    } catch (e) {
      console.warn("Firebase فشل، هنستخدم localStorage:", e);
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    allData = JSON.parse(saved);
  } else {
    try {
      const res = await fetch("products.json");
      allData = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch (e) {
      allData = { categories: [], products: [] };
    }
  }
  populateCategories();
  applyFilters();
}

function populateCategories() {
  const select = document.getElementById("shop-cat-filter");
  if (!select) return;
  select.innerHTML = '<option value="">كل الأقسام</option>' +
    allData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const catFromUrl = urlParams.get("cat");
  if (catFromUrl) select.value = catFromUrl;

  const searchFromUrl = urlParams.get("search");
  if (searchFromUrl) {
    document.getElementById("shop-search-input").value = searchFromUrl;
  }
}

// ========== FILTERS ==========
function applyFilters() {
  const searchInput = document.getElementById("shop-search-input");
  const catSelect = document.getElementById("shop-cat-filter");
  const sortSelect = document.getElementById("shop-sort-filter");
  if (!searchInput || !catSelect || !sortSelect) return;

  const search = searchInput.value.toLowerCase().trim();
  const cat = catSelect.value;
  const sort = sortSelect.value;

  let products = [...allData.products];

  if (cat) products = products.filter(p => p.category === cat);
  if (search) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.description && p.description.toLowerCase().includes(search))
    );
  }

  switch (sort) {
    case "price-asc": products.sort((a, b) => a.price - b.price); break;
    case "price-desc": products.sort((a, b) => b.price - a.price); break;
    case "offers": products = products.filter(p => p.oldPrice && p.oldPrice > p.price); break;
    case "new":
    default: products.sort((a, b) => b.id - a.id); break;
  }

  renderGrid(products);
}

// ========== RENDER GRID ==========
function renderGrid(products) {
  const grid = document.getElementById("shop-grid");
  const empty = document.getElementById("shop-empty");
  const count = document.getElementById("results-count");
  if (!grid || !empty || !count) return;

  count.textContent = products.length;

  if (products.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  grid.innerHTML = products.map(p => {
    const cat = allData.categories.find(c => c.id === p.category);
    const isFav = favorites.includes(p.id);
    return `
      <div class="product-card fade-up">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
        <button class="fav-btn ${isFav ? "active" : ""}" onclick="toggleFav(event, ${p.id})" title="مفضلة">
          ${isFav ? "❤️" : "🤍"}
        </button>
        <a href="product.html?id=${p.id}" class="product-img-link">
          <div class="product-img">
            ${p.image
              ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='${p.icon || "📦"}'" />`
              : (p.icon || "📦")}
          </div>
        </a>
        <div class="product-info">
          <div class="product-cat">${cat ? cat.name : ""}</div>
          <a href="product.html?id=${p.id}" class="product-title-link">
            <h3>${p.name}</h3>
          </a>
          <div class="product-price">
            <span class="price-current">${p.price} جنيه</span>
            ${p.oldPrice && p.oldPrice > p.price ? `<span class="price-old">${p.oldPrice} جنيه</span>` : ""}
          </div>
          <div class="product-actions">
            <button class="add-btn" onclick="addToCart(${p.id}, event)">🛒 أضف للسلة</button>
            <button class="order-now-btn" onclick="orderNow(${p.id}, event)">⚡ اطلب الآن</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".fade-up:not(.visible)").forEach(el => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    obs.observe(el);
  });
}

// ========== RESET ==========
function resetFilters() {
  document.getElementById("shop-search-input").value = "";
  document.getElementById("shop-cat-filter").value = "";
  document.getElementById("shop-sort-filter").value = "new";
  applyFilters();
}

// ========== FAVORITES ==========
function toggleFav(e, id) {
  e.stopPropagation();

  if (typeof heartBurst === "function" && e.target) {
    heartBurst(e.target);
  }

  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast("💔 تم إزالة المنتج من المفضلة");
  } else {
    favorites.push(id);
    showToast("❤️ تم إضافة المنتج للمفضلة");
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  applyFilters();
}

function showFavorites() {
  if (favorites.length === 0) {
    showToast("لا توجد منتجات في المفضلة");
    return;
  }
  const products = allData.products.filter(p => favorites.includes(p.id));
  renderGrid(products);
  document.getElementById("shop-search-input").value = "";
  document.getElementById("shop-cat-filter").value = "";
  document.getElementById("results-count").textContent = products.length;
  showToast(`❤️ ${products.length} منتج في المفضلة`);
  window.scrollTo({ top: 400, behavior: "smooth" });
}

// ========== CART ==========
function addToCart(id, event) {
  const product = allData.products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  updateCart();
  showToast(`✅ تم إضافة ${product.name} للسلة`);

  if (typeof flyToCart === "function" && event && event.target) {
    const card = event.target.closest(".product-card");
    const img = card ? card.querySelector(".product-img img") || card.querySelector(".product-img") : null;
    if (img) flyToCart(img);
  }

  if (typeof fbq !== "undefined") {
    fbq('track', 'AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'EGP'
    });
  }
}

function orderNow(id, event) {
  const product = allData.products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  updateCart();
  const cartEl = document.getElementById("cart");
  if (cartEl && !cartEl.classList.contains("open")) {
    toggleCart();
  }
  showToast(`⚡ ${product.name} جاهز للطلب`);

  if (typeof flyToCart === "function" && event && event.target) {
    const card = event.target.closest(".product-card");
    const img = card ? card.querySelector(".product-img img") || card.querySelector(".product-img") : null;
    if (img) flyToCart(img);
  }

  if (typeof fbq !== "undefined") {
    fbq('track', 'AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'EGP'
    });
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCart();
}

function updateCart() {
  const cartItems = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");

  if (!cartItems) return;

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  if (cartCount) cartCount.textContent = totalQty;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">🛒 السلة فاضية</p>';
    if (subtotalEl) subtotalEl.textContent = "0";
    if (totalEl) totalEl.textContent = SHIPPING;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.name} × ${item.qty}</h4>
        <p>${item.price * item.qty} جنيه</p>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${item.id})">✕</button>
    </div>
  `).join("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotalEl) subtotalEl.textContent = subtotal;

  // ===== Coupon Discount =====
  let discount = 0;
  const discountRow = document.getElementById("cart-discount-row");
  const discountEl = document.getElementById("cart-discount");

  if (appliedCoupon && appliedCoupon.discount > 0) {
    discount = appliedCoupon.discount;
    if (discountRow) discountRow.style.display = "flex";
    if (discountEl) discountEl.textContent = `-${discount} جنيه`;
  } else {
    if (discountRow) discountRow.style.display = "none";
  }

  const finalTotal = Math.max(0, subtotal + SHIPPING - discount);
  if (totalEl) totalEl.textContent = finalTotal;

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function toggleCart() {
  const cartEl = document.getElementById("cart");
  const overlay = document.getElementById("cart-overlay");
  if (!cartEl) return;
  cartEl.classList.toggle("open");
  if (overlay) overlay.classList.toggle("active");
  document.body.style.overflow = cartEl.classList.contains("open") ? "hidden" : "";
}

// ========== CHECKOUT ==========
function openCheckout() {
  if (cart.length === 0) return showToast("⚠️ السلة فاضية!", true);
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.classList.add("active");
  document.body.style.overflow = "hidden";

  if (typeof fbq !== "undefined") {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const numItems = cart.reduce((s, i) => s + i.qty, 0);
    fbq('track', 'InitiateCheckout', {
      value: subtotal,
      currency: 'EGP',
      num_items: numItems
    });
  }
}

function closeCheckout(e, force = false) {
  if (force || (e && e.target.id === "modal-overlay")) {
    const modal = document.getElementById("modal-overlay");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// ========== PAYMENT METHODS ==========
function updatePaymentInfo() {
  const selected = document.querySelector('input[name="payment"]:checked');
  if (!selected) return;
  const value = selected.value;
  const infoEl = document.getElementById("payment-info");
  if (!infoEl) return;

  const infos = {
    cod: "",
    instapay: `
      <strong>⚡ انستاباي</strong><br>
      حوّل المبلغ على الرقم ده:<br>
      <span class="payment-number">${PAYMENT_INFO.instapay}</span><br>
      <small>وابعتها سكرين شوت على واتساب بعد تأكيد الطلب.</small>
    `,
    vodafone: `
      <strong>📱 فودافون كاش</strong><br>
      حوّل المبلغ على الرقم ده:<br>
      <span class="payment-number">${PAYMENT_INFO.vodafone}</span><br>
      <small>وابعتها سكرين شوت على واتساب بعد تأكيد الطلب.</small>
    `
  };

  if (infos[value]) {
    infoEl.innerHTML = infos[value];
    infoEl.style.display = "block";
  } else {
    infoEl.style.display = "none";
  }
}

// ========== SAVE ORDER TO FIREBASE ==========
async function saveOrderToFirebase(orderData) {
  if (typeof initFirebase !== "function" || !initFirebase()) {
    console.warn("Firebase مش متاح، مش هنحفظ الطلب");
    return null;
  }

  const order = {
    ...orderData,
    status: "جديد",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const orderId = await fbAddOrder(order);

  if (orderId) {
    console.log("✅ تم حفظ الطلب في Firebase برقم:", orderId);
    sendAdminNotification(orderData);
    return orderId;
  } else {
    console.warn("⚠️ فشل حفظ الطلب في Firebase");
    return null;
  }
}

// ========== SEND ORDER ==========
async function sendWhatsApp(e) {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const city = document.getElementById("city").value;
  const notes = document.getElementById("notes").value;
  const paymentInput = document.querySelector('input[name="payment"]:checked');
  const payment = paymentInput ? paymentInput.value : "cod";

  const paymentNames = {
    cod: "الدفع عند الاستلام",
    instapay: "انستاباي",
    vodafone: "فودافون كاش"
  };

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.qty;
  });

  let discount = 0;
  if (appliedCoupon && appliedCoupon.discount > 0) {
    discount = appliedCoupon.discount;
  }

  const total = Math.max(0, subtotal + SHIPPING - discount);

  const orderItems = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
    image: item.image || "",
    icon: item.icon || "📦"
  }));

  if (typeof fbq !== "undefined") {
    const numItems = cart.reduce((s, i) => s + i.qty, 0);
    fbq('track', 'Purchase', {
      value: total,
      currency: 'EGP',
      num_items: numItems
    });
  }

  await saveOrderToFirebase({
    name, phone, address, city, notes, payment,
    items: orderItems,
    subtotal,
    shipping: SHIPPING,
    total,
    discount: discount,
    couponCode: appliedCoupon ? appliedCoupon.code : null,
    paymentMethod: paymentNames[payment]
  });

  if (appliedCoupon && typeof fbIncrementCouponUsage === "function") {
    await fbIncrementCouponUsage(appliedCoupon.code);
  }

  document.getElementById("checkout-form").reset();

  const codInput = document.querySelector('input[name="payment"][value="cod"]');
  if (codInput) codInput.checked = true;
  updatePaymentInfo();

  closeCheckout(null, true);
  cart = [];
  localStorage.removeItem(CART_KEY);
  updateCart();
  toggleCart();

  const orderNumber = Math.floor(100000 + Math.random() * 900000);
  const orderForConfirmation = {
    orderNumber: orderNumber,
    createdAt: Date.now(),
    items: orderItems,
    shipping: SHIPPING,
    name: name,
    phone: phone,
    address: address,
    city: city
  };

  localStorage.setItem('forsa_last_order', JSON.stringify(orderForConfirmation));

  appliedCoupon = null;
  localStorage.removeItem("forsa_coupon");

  window.location.href = 'order-confirmation.html';
}

// ========== LIVE SEARCH ==========
function openSearchModal() {
  const modal = document.getElementById("search-modal-overlay");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const input = document.getElementById("live-search-input");
      if (input) input.focus();
    }, 100);
    const resultsEl = document.getElementById("live-search-results");
    if (resultsEl && !resultsEl.innerHTML.trim()) {
      resultsEl.innerHTML = '<p class="search-hint">ابدأ الكتابة للبحث...</p>';
    }
  }
}

function closeSearchModal(e, force = false) {
  if (force || (e && e.target.id === "search-modal-overlay")) {
    const modal = document.getElementById("search-modal-overlay");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
    const input = document.getElementById("live-search-input");
    if (input) input.value = "";
    const resultsEl = document.getElementById("live-search-results");
    if (resultsEl) resultsEl.innerHTML = '<p class="search-hint">ابدأ الكتابة للبحث...</p>';
  }
}

function liveSearch() {
  const input = document.getElementById("live-search-input");
  const resultsEl = document.getElementById("live-search-results");
  if (!input || !resultsEl) return;

  const query = input.value.toLowerCase().trim();

  if (!query) {
    resultsEl.innerHTML = '<p class="search-hint">ابدأ الكتابة للبحث...</p>';
    return;
  }

  const results = allData.products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.description && p.description.toLowerCase().includes(query))
  );

  if (results.length === 0) {
    resultsEl.innerHTML = '<p class="search-empty">🔍 لا توجد نتائج مطابقة</p>';
    return;
  }

  resultsEl.innerHTML = results.slice(0, 8).map(p => `
    <a href="product.html?id=${p.id}" class="search-result-item">
      <div class="search-result-img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" />` : (p.icon || "📦")}
      </div>
      <div class="search-result-info">
        <h4>${p.name}</h4>
        <p>${p.price} جنيه</p>
      </div>
    </a>
  `).join("");
}

// ========== SEARCH (fallback) ==========
function openSearch() {
  openSearchModal();
}

// ========== UI ==========
function toggleMenu() {
  const nav = document.getElementById("mobile-nav");
  if (nav) nav.classList.toggle("open");
}

function showToast(msg, isError = false) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " error" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ========== SCROLL ==========
window.addEventListener("scroll", () => {
  const header = document.getElementById("header");
  if (!header) return;
  if (window.scrollY > 20) header.classList.add("scrolled");
  else header.classList.remove("scrolled");
});

// ============================================
// ========== COUPON SYSTEM ==================
// ============================================

async function applyCoupon() {
  const input = document.getElementById("coupon-input");
  const btn = document.getElementById("coupon-apply-btn");
  const messageEl = document.getElementById("coupon-message");

  if (!input || !messageEl) return;

  const code = input.value.trim().toUpperCase();

  if (!code) {
    showCouponMessage("⚠️ اكتب الكود الأول", "error");
    return;
  }

  if (cart.length === 0) {
    showCouponMessage("⚠️ السلة فاضية", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳";
  }

  messageEl.innerHTML = "";

  try {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    if (typeof fbValidateCoupon !== "function") {
      showCouponMessage("❌ حصلت مشكلة، جرب تاني", "error");
      return;
    }

    const phoneInput = document.getElementById("phone");
const customerPhone = phoneInput ? phoneInput.value.trim() : "";
const result = await fbValidateCoupon(code, subtotal, customerPhone);

    if (!result.valid) {
      showCouponMessage("❌ " + result.error, "error");
      return;
    }

    appliedCoupon = {
      code: code,
      discount: result.discount,
      coupon: result.coupon
    };

    showCouponMessage(`✅ تم تطبيق كود ${code} — وفّرت ${result.discount} جنيه!`, "success");
    showAppliedCoupon();
    updateCart();
    localStorage.setItem("forsa_coupon", JSON.stringify(appliedCoupon));

  } catch (e) {
    console.error("Error applying coupon:", e);
    showCouponMessage("❌ حصلت مشكلة، جرب تاني", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "تطبيق";
    }
  }
}

function removeCoupon() {
  appliedCoupon = null;
  localStorage.removeItem("forsa_coupon");

  const messageEl = document.getElementById("coupon-message");
  if (messageEl) messageEl.innerHTML = "";

  const appliedEl = document.getElementById("coupon-applied");
  if (appliedEl) appliedEl.style.display = "none";

  const inputWrap = document.getElementById("coupon-input-wrap");
  if (inputWrap) inputWrap.style.display = "flex";

  const input = document.getElementById("coupon-input");
  if (input) input.value = "";

  updateCart();

  if (typeof showToast === "function") {
    showToast("🎟️ تم إزالة الكوبون");
  }
}

function showCouponMessage(msg, type) {
  const messageEl = document.getElementById("coupon-message");
  if (!messageEl) return;
  messageEl.innerHTML = `<div class="coupon-message ${type}">${msg}</div>`;
}

function showAppliedCoupon() {
  const appliedEl = document.getElementById("coupon-applied");
  const codeEl = document.getElementById("coupon-applied-code");
  const discountEl = document.getElementById("coupon-applied-discount");
  const inputWrap = document.getElementById("coupon-input-wrap");
  const messageEl = document.getElementById("coupon-message");

  if (!appliedEl || !appliedCoupon) return;

  if (codeEl) codeEl.textContent = appliedCoupon.code;
  if (discountEl) discountEl.textContent = `-${appliedCoupon.discount} جنيه`;

  appliedEl.style.display = "block";
  if (inputWrap) inputWrap.style.display = "none";
  if (messageEl) messageEl.innerHTML = "";
}

function loadCouponFromStorage() {
  const saved = localStorage.getItem("forsa_coupon");
  if (saved) {
    try {
      appliedCoupon = JSON.parse(saved);
      showAppliedCoupon();
    } catch (e) {
      appliedCoupon = null;
    }
  }
}

// ========== INIT ==========
loadData();
updateCart();
loadCouponFromStorage();