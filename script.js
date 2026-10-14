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

let allData = { categories: [], products: [] };
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let favorites = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
let currentTab = "new";

// ========== LOADER ==========
window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (loader) loader.classList.add("hidden");
  }, 500);
});

// ========== OBSERVER FOR FADE-UP ==========
function observeFadeUp() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll(".fade-up:not(.visible)").forEach(el => observer.observe(el));
}

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

        renderCategories();
        renderProducts();
        observeFadeUp();
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
  renderCategories();
  renderProducts();
  observeFadeUp();
}

// ========== CATEGORIES ==========
function renderCategories() {
  const grid = document.getElementById("cat-grid");
  if (!grid) return;
  grid.innerHTML = allData.categories.map(c => `
    <div class="cat-card fade-up" onclick="goToCategory('${c.id}')">
      <span class="cat-icon">${c.icon}</span>
      ${c.name}
    </div>
  `).join("");
}

function goToCategory(catId) {
  window.location.href = `shop.html?cat=${catId}`;
}

// ========== PRODUCTS ==========
function renderProducts(tab = currentTab) {
  const carousel = document.getElementById("products-carousel");
  if (!carousel) return;

  let products = [...allData.products];
  if (tab === "best") {
    products = products.filter(p => p.badge === "الأكثر مبيعًا" || p.badge === "عرض");
    if (products.length === 0) products = allData.products;
  } else {
    products = products.reverse();
  }

  if (products.length === 0) {
    carousel.innerHTML = '<p class="empty-products">لا توجد منتجات</p>';
    return;
  }

  carousel.innerHTML = products.map(p => {
    const cat = allData.categories.find(c => c.id === p.category);
    const isFav = favorites.includes(p.id);
    return `
      <div class="carousel-item">
        <div class="product-card">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
          <button class="fav-btn ${isFav ? "active" : ""}" onclick="toggleFav(event, ${p.id})" title="مفضلة">
            ${isFav ? "❤️" : "🤍"}
          </button>
          <a href="product.html?id=${p.id}" class="product-img-link">
            <div class="product-img">
              ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='${p.icon || "📦"}'" />` : (p.icon || "📦")}
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
      </div>
    `;
  }).join("");

  observeFadeUp();
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  renderProducts(tab);
}

// ========== CAROUSEL ==========
function scrollCarousel(dir) {
  const c = document.getElementById("products-carousel");
  if (!c) return;
  const amount = c.querySelector(".carousel-item")?.offsetWidth + 20 || 300;
  c.scrollBy({ left: dir * amount * 2, behavior: "smooth" });
}

// ========== FAVORITES ==========
function toggleFav(e, id) {
  e.stopPropagation();
  
  // ===== Heart Burst Animation =====
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
  renderProducts();
}

function showFavorites() {
  if (favorites.length === 0) {
    showToast("لا توجد منتجات في المفضلة");
    return;
  }
  showToast(`❤️ لديك ${favorites.length} منتج في المفضلة`);
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

  // ===== Fly to Cart Animation =====
  if (typeof flyToCart === "function" && event && event.target) {
    const card = event.target.closest(".product-card");
    const img = card ? card.querySelector(".product-img img") || card.querySelector(".product-img") : null;
    if (img) flyToCart(img);
  }

  // ===== Meta Pixel: AddToCart =====
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

  // ===== Fly to Cart Animation =====
  if (typeof flyToCart === "function" && event && event.target) {
    const card = event.target.closest(".product-card");
    const img = card ? card.querySelector(".product-img img") || card.querySelector(".product-img") : null;
    if (img) flyToCart(img);
  }

  // ===== Meta Pixel: AddToCart =====
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
  if (totalEl) totalEl.textContent = subtotal + SHIPPING;

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

  // ===== Meta Pixel: InitiateCheckout =====
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
function sendWhatsApp(e) {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const city = document.getElementById("city").value;
  const notes = document.getElementById("notes").value;
  const paymentInput = document.querySelector('input[name="payment"]:checked');
  const payment = paymentInput ? paymentInput.value : "cod";

  const paymentNames = {
    cod: "💵 الدفع عند الاستلام",
    instapay: "⚡ انستاباي",
    vodafone: "📱 فودافون كاش"
  };

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.qty;
  });
  const total = subtotal + SHIPPING;

  // ===== احفظ نسخة من المنتجات =====
  const orderItems = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    qty: item.qty,
    image: item.image || "",
    icon: item.icon || "📦"
  }));

  // ===== Meta Pixel: Purchase =====
  if (typeof fbq !== "undefined") {
    const numItems = cart.reduce((s, i) => s + i.qty, 0);
    fbq('track', 'Purchase', {
      value: total,
      currency: 'EGP',
      num_items: numItems
    });
  }

  saveOrderToFirebase({
    name, phone, address, city, notes, payment,
    items: orderItems,
    subtotal,
    shipping: SHIPPING,
    total,
    paymentMethod: paymentNames[payment]
  });

  document.getElementById("checkout-form").reset();

  const codInput = document.querySelector('input[name="payment"][value="cod"]');
  if (codInput) codInput.checked = true;
  updatePaymentInfo();

  closeCheckout(null, true);
  cart = [];
  localStorage.removeItem(CART_KEY);
  updateCart();
  toggleCart();

  // ===== حفظ بيانات الطلب للعرض في صفحة التأكيد =====
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

  // حفظ في localStorage
  localStorage.setItem('forsa_last_order', JSON.stringify(orderForConfirmation));

  // تحويل على صفحة التأكيد
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

// ========== INIT ==========
loadData();
updateCart();