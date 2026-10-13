// ========== CONFIG ==========
const WHATSAPP_NUMBER = "201556687455";
const SHIPPING = 40;
const STORAGE_KEY = "forsa_products";
const FAV_KEY = "forsa_favorites";
const CART_KEY = "forsa_cart";

const PAYMENT_INFO = {
  instapay: "01061863235",
  vodafone: "01061863235"
};

let allData = { categories: [], products: [] };
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let favorites = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
let currentProduct = null;
let currentQty = 1;
let urlParams = new URLSearchParams(window.location.search);
let productId = urlParams.get("id");

// ========== LOAD DATA ==========
async function loadData() {
  // 1) حاول تجيب من Firebase الأول
  if (typeof initFirebase === "function" && initFirebase()) {
    try {
      const [fbProducts, fbCategories] = await Promise.all([
        fbGetProducts(),
        fbGetCategories()
      ]);

      if (fbProducts && fbProducts.length > 0) {
        allData = {
          products: fbProducts,
          categories: fbCategories || []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      }
    } catch (e) {
      console.warn("Firebase فشل، هنستخدم localStorage:", e);
    }
  }

  // 2) لو Firebase مش متاح، استخدم localStorage
  if (!allData.products || allData.products.length === 0) {
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
  }

  // 3) ابحث عن المنتج
  currentProduct = allData.products.find(p => String(p.id) === String(productId));

  if (!currentProduct) {
    document.getElementById("product-detail").innerHTML = `
      <div class="not-found">
        <h2>⚠️ المنتج غير موجود</h2>
        <p>يبدو أن الرابط غير صحيح أو المنتج تم حذفه.</p>
        <a href="shop.html" class="btn-primary">تصفح كل المنتجات</a>
      </div>
    `;
    return;
  }

  renderProduct();
  renderBreadcrumbs();
  renderRelated();
}

// ========== BREADCRUMBS ==========
function renderBreadcrumbs() {
  const cat = allData.categories.find(c => c.id === currentProduct.category);
  if (cat) {
    document.getElementById("breadcrumb-cat").textContent = cat.name;
    document.getElementById("breadcrumb-cat").href = `shop.html?cat=${cat.id}`;
  }
  document.getElementById("breadcrumb-name").textContent = currentProduct.name;
  document.title = `${currentProduct.name} | FORSA`;
}

// ========== RENDER PRODUCT ==========
function renderProduct() {
  const p = currentProduct;
  const cat = allData.categories.find(c => c.id === p.category);
  const isFav = favorites.includes(p.id);

  let images = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
  const hasImages = images.length > 0;
  const mainImage = hasImages ? images[0] : "";

  const rating = p.rating || 4.5;
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let starsHtml = "";
  for (let i = 0; i < fullStars; i++) starsHtml += "★";
  if (halfStar) starsHtml += "⯨";
  for (let i = 0; i < emptyStars; i++) starsHtml += "☆";

  const features = p.features && p.features.length > 0 ? p.features : [];
  const inStock = p.inStock !== false;

  const html = `
    <div class="product-gallery fade-up">
      <div class="gallery-main" id="gallery-main">
        ${hasImages
          ? `<img src="${mainImage}" alt="${p.name}" id="main-image" />`
          : `<div class="gallery-placeholder">${p.icon || "📦"}</div>`}
        ${p.badge ? `<span class="gallery-badge">${p.badge}</span>` : ""}
        <button class="gallery-fav ${isFav ? "active" : ""}" onclick="toggleFav(${p.id})" title="مفضلة">
          ${isFav ? "❤️" : "🤍"}
        </button>
      </div>
      ${hasImages && images.length > 1 ? `
        <div class="gallery-thumbs">
          ${images.map((img, i) => `
            <div class="gallery-thumb ${i === 0 ? "active" : ""}" onclick="changeImage('${img}', this)">
              <img src="${img}" alt="${p.name} ${i + 1}" />
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>

    <div class="product-details fade-up">
      <div class="product-details-cat">${cat ? cat.name : ""}</div>
      <h1 class="product-details-title">${p.name}</h1>

      <div class="product-details-rating">
        <span class="stars">${starsHtml}</span>
        <span class="rating-num">${rating}</span>
        <span class="reviews-count">(${p.reviewsCount || 0} تقييم)</span>
      </div>

      <div class="product-details-price">
        <span class="price-current">${p.price} جنيه</span>
        ${p.oldPrice && p.oldPrice > p.price ? `
          <span class="price-old">${p.oldPrice} جنيه</span>
          <span class="price-discount">وفّر ${p.oldPrice - p.price} جنيه</span>
        ` : ""}
      </div>

      ${p.description ? `<p class="product-details-desc">${p.description}</p>` : ""}

      ${features.length > 0 ? `
        <div class="product-features">
          <h3>✨ المميزات</h3>
          <ul>
            ${features.map(f => `<li>${f}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      <div class="product-stock ${inStock ? "in-stock" : "out-of-stock"}">
        ${inStock ? "✅ متوفر في المخزون" : "❌ غير متوفر حاليًا"}
      </div>

      ${p.sku ? `<div class="product-sku">كود المنتج: <strong>${p.sku}</strong></div>` : ""}

      <div class="product-qty-section">
        <label>الكمية:</label>
        <div class="qty-control">
          <button onclick="changeQty(-1)">−</button>
          <input type="number" id="qty-input" value="1" min="1" onchange="updateQty(this.value)" />
          <button onclick="changeQty(1)">+</button>
        </div>
      </div>

      <div class="product-actions-detail">
        <button class="add-btn" onclick="addToCartDetail()" ${!inStock ? "disabled" : ""}>
          🛒 أضف للسلة
        </button>
        <button class="order-now-btn" onclick="orderNowDetail()" ${!inStock ? "disabled" : ""}>
          ⚡ اطلب الآن
        </button>
      </div>

      <div class="product-extra-info">
        <div class="extra-item">
          <span class="extra-icon">🚚</span>
          <div>
            <strong>شحن سريع</strong>
            <small>40 جنيه لكل المحافظات</small>
          </div>
        </div>
        <div class="extra-item">
          <span class="extra-icon">🛡️</span>
          <div>
            <strong>ضمان الاستبدال</strong>
            <small>خلال 14 يوم</small>
          </div>
        </div>
        <div class="extra-item">
          <span class="extra-icon">💬</span>
          <div>
            <strong>دعم فني</strong>
            <small>متاح 24/7</small>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("product-detail").innerHTML = html;
  document.querySelectorAll(".fade-up").forEach(el => {
    setTimeout(() => el.classList.add("visible"), 100);
  });
}

// ========== GALLERY ==========
function changeImage(src, thumbEl) {
  const mainImg = document.getElementById("main-image");
  if (mainImg) mainImg.src = src;
  document.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
  if (thumbEl) thumbEl.classList.add("active");
}

// ========== QUANTITY ==========
function changeQty(delta) {
  currentQty = Math.max(1, currentQty + delta);
  document.getElementById("qty-input").value = currentQty;
}

function updateQty(val) {
  currentQty = Math.max(1, parseInt(val) || 1);
  document.getElementById("qty-input").value = currentQty;
}

// ========== ADD TO CART ==========
function addToCartDetail() {
  if (!currentProduct) return;
  const existing = cart.find(item => item.id === currentProduct.id);
  if (existing) existing.qty += currentQty;
  else cart.push({ ...currentProduct, qty: currentQty });
  updateCart();
  showToast(`✅ تم إضافة ${currentQty} × ${currentProduct.name} للسلة`);
}

function orderNowDetail() {
  if (!currentProduct) return;
  const existing = cart.find(item => item.id === currentProduct.id);
  if (existing) existing.qty += currentQty;
  else cart.push({ ...currentProduct, qty: currentQty });
  updateCart();
  const cartEl = document.getElementById("cart");
  if (cartEl && !cartEl.classList.contains("open")) toggleCart();
  showToast(`⚡ ${currentProduct.name} جاهز للطلب`);
}

// ========== FAVORITES ==========
function toggleFav(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast("💔 تم إزالة المنتج من المفضلة");
  } else {
    favorites.push(id);
    showToast("❤️ تم إضافة المنتج للمفضلة");
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  const favBtn = document.querySelector(".gallery-fav");
  if (favBtn) {
    const isFav = favorites.includes(id);
    favBtn.classList.toggle("active", isFav);
    favBtn.textContent = isFav ? "❤️" : "🤍";
  }
}

function showFavorites() {
  if (favorites.length === 0) {
    showToast("لا توجد منتجات في المفضلة");
    return;
  }
  window.location.href = "shop.html";
}

// ========== CART ==========
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
}

function closeCheckout(e, force = false) {
  if (force || (e && e.target.id === "modal-overlay")) {
    const modal = document.getElementById("modal-overlay");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// ========== PAYMENT ==========
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
    return;
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
  } else {
    console.warn("⚠️ فشل حفظ الطلب في Firebase");
  }
}

// ========== SEND WHATSAPP ==========
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
    cod: "الدفع عند الاستلام",
    instapay: "انستاباي",
    vodafone: "فودافون كاش"
  };

  let itemsText = "";
  let subtotal = 0;
  cart.forEach((item, i) => {
    itemsText += `${i + 1}. ${item.name} × ${item.qty} = ${item.price * item.qty} جنيه\n`;
    subtotal += item.price * item.qty;
  });
  const total = subtotal + SHIPPING;

  const message =
`*مرحبًا FORSA*
عايز أأكد طلبي:

*الاسم:* ${name}
*الموبايل:* ${phone}
*العنوان:* ${address} - ${city}
${notes ? "*ملاحظات:* " + notes + "\n" : ""}
*الطلب:*
${itemsText}
*الإجمالي:* ${subtotal} جنيه
*الشحن:* ${SHIPPING} جنيه
*الإجمالي النهائي:* ${total} جنيه

*طريقة الدفع:* ${paymentNames[payment]}

من فضلك أكد الطلب 🙏`;

  saveOrderToFirebase({
    name, phone, address, city, notes, payment,
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: item.image || "",
      icon: item.icon || "📦"
    })),
    subtotal,
    shipping: SHIPPING,
    total,
    paymentMethod: paymentNames[payment]
  });

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  document.getElementById("checkout-form").reset();

  const codInput = document.querySelector('input[name="payment"][value="cod"]');
  if (codInput) codInput.checked = true;
  updatePaymentInfo();

  closeCheckout(null, true);
  cart = [];
  localStorage.removeItem(CART_KEY);
  updateCart();
  toggleCart();
  showToast("✅ تم إرسال طلبك على واتساب");
}

// ========== RELATED ==========
function renderRelated() {
  const carousel = document.getElementById("related-carousel");
  if (!carousel || !currentProduct) return;

  let related = allData.products.filter(p =>
    p.category === currentProduct.category && p.id !== currentProduct.id
  );

  if (related.length === 0) {
    related = allData.products.filter(p => p.id !== currentProduct.id).slice(0, 6);
  }

  if (related.length === 0) {
    carousel.innerHTML = '<p class="empty-products">لا توجد منتجات مشابهة</p>';
    return;
  }

  carousel.innerHTML = related.slice(0, 8).map(p => {
    const cat = allData.categories.find(c => c.id === p.category);
    const isFav = favorites.includes(p.id);
    return `
      <div class="carousel-item">
        <div class="product-card">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
          <button class="fav-btn ${isFav ? "active" : ""}" onclick="toggleFavRelated(event, ${p.id})" title="مفضلة">
            ${isFav ? "❤️" : "🤍"}
          </button>
          <a href="product.html?id=${p.id}" class="product-img-link">
            <div class="product-img">
              ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />` : (p.icon || "📦")}
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
              <button class="add-btn" onclick="addToCartRelated(event, ${p.id})">🛒 أضف للسلة</button>
              <button class="order-now-btn" onclick="orderNowRelated(event, ${p.id})">⚡ اطلب الآن</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".carousel-item .fade-up").forEach(el => {
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

function scrollRelated(dir) {
  const c = document.getElementById("related-carousel");
  if (!c) return;
  const amount = c.querySelector(".carousel-item")?.offsetWidth + 20 || 300;
  c.scrollBy({ left: dir * amount * 2, behavior: "smooth" });
}

function addToCartRelated(e, id) {
  e.preventDefault();
  const product = allData.products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  updateCart();
  showToast(`✅ تم إضافة ${product.name} للسلة`);
}

function orderNowRelated(e, id) {
  e.preventDefault();
  const product = allData.products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  updateCart();
  const cartEl = document.getElementById("cart");
  if (cartEl && !cartEl.classList.contains("open")) toggleCart();
  showToast(`⚡ ${product.name} جاهز للطلب`);
}

function toggleFavRelated(e, id) {
  e.preventDefault();
  e.stopPropagation();
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast("💔 تم إزالة المنتج من المفضلة");
  } else {
    favorites.push(id);
    showToast("❤️ تم إضافة المنتج للمفضلة");
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  renderRelated();
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