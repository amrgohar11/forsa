// ========== CONFIG ==========
const SHIPPING = 40;
const STORAGE_KEY = "forsa_products";
const FAV_KEY = "forsa_favorites";
const CART_KEY = "forsa_cart";

const PAYMENT_INFO = {
  instapay: "01061863235",
  vodafone: "01061863235"
};

// ========== COUPON STATE ==========
let appliedCoupon = null;

let allData = { categories: [], products: [] };
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let favorites = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
let currentProduct = null;
let currentQty = 1;
let urlParams = new URLSearchParams(window.location.search);
let productId = urlParams.get("id");

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
  // ✅ استنى شوية عشان نضمن إن script.js حمل البيانات
  await new Promise(resolve => setTimeout(resolve, 300));

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
  updateMetaTags();
  renderRelated();
  loadReviews();
}

// ========== UPDATE META TAGS FOR SEO ==========
function updateMetaTags() {
  const p = currentProduct;
  if (!p) return;

  const baseUrl = "https://forsa-store.vercel.app";
  const productUrl = `${baseUrl}/product.html?id=${p.id}`;
  const productTitle = `${p.name} | FORSA`;
  const productDesc = p.description
    ? p.description.substring(0, 160)
    : `اشترِ ${p.name} من FORSA بأفضل سعر. شحن 40 جنيه لكل المحافظات.`;

  let productImage = `${baseUrl}/assets/logo.png`;
  if (p.image) {
    productImage = p.image.startsWith("http") ? p.image : `${baseUrl}/${p.image}`;
  } else if (p.images && p.images.length > 0) {
    const img = p.images[0];
    productImage = img.startsWith("http") ? img : `${baseUrl}/${img}`;
  }

  document.title = productTitle;
  const metaTitle = document.getElementById("meta-title");
  if (metaTitle) metaTitle.setAttribute("content", productTitle);
  const ogTitle = document.getElementById("og-title");
  if (ogTitle) ogTitle.setAttribute("content", productTitle);
  const twTitle = document.getElementById("twitter-title");
  if (twTitle) twTitle.setAttribute("content", productTitle);

  const metaDesc = document.getElementById("meta-description");
  if (metaDesc) metaDesc.setAttribute("content", productDesc);
  const ogDesc = document.getElementById("og-description");
  if (ogDesc) ogDesc.setAttribute("content", productDesc);
  const twDesc = document.getElementById("twitter-description");
  if (twDesc) twDesc.setAttribute("content", productDesc);

  const canonical = document.getElementById("canonical-link");
  if (canonical) canonical.setAttribute("href", productUrl);
  const ogUrl = document.getElementById("og-url");
  if (ogUrl) ogUrl.setAttribute("content", productUrl);
  const twUrl = document.getElementById("twitter-url");
  if (twUrl) twUrl.setAttribute("content", productUrl);

  const ogImg = document.getElementById("og-image");
  if (ogImg) ogImg.setAttribute("content", productImage);
  const twImg = document.getElementById("twitter-image");
  if (twImg) twImg.setAttribute("content", productImage);

  updateProductSchema(p, productUrl, productImage, productDesc);
}

// ========== PRODUCT SCHEMA.ORG ==========
function updateProductSchema(p, url, image, desc) {
  const existing = document.getElementById("product-schema");
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "description": desc,
    "image": image,
    "url": url,
    "sku": p.sku || p.id,
    "brand": { "@type": "Brand", "name": "FORSA" },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "EGP",
      "price": p.price,
      "availability": p.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": "FORSA" }
    }
  };

  if (p.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": p.rating,
      "reviewCount": p.reviewsCount || 1
    };
  }

  const script = document.createElement("script");
  script.id = "product-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
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
        <button class="gallery-fav ${isFav ? "active" : ""}" onclick="toggleFav(${p.id}, event)" title="مفضلة">
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
        <button class="add-btn" onclick="addToCartDetail(event)" ${!inStock ? "disabled" : ""}>
          🛒 أضف للسلة
        </button>
        <button class="order-now-btn" onclick="orderNowDetail(event)" ${!inStock ? "disabled" : ""}>
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
  observeFadeUp();

  if (typeof fbq !== "undefined") {
    fbq('track', 'ViewContent', {
      content_name: p.name,
      content_ids: [p.id],
      content_type: 'product',
      value: p.price,
      currency: 'EGP'
    });
  }
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
function addToCartDetail(event) {
  if (!currentProduct) return;
  const existing = cart.find(item => item.id === currentProduct.id);
  if (existing) existing.qty += currentQty;
  else cart.push({ ...currentProduct, qty: currentQty });
  updateCart();
  showToast(`✅ تم إضافة ${currentQty} × ${currentProduct.name} للسلة`);

  if (typeof flyToCart === "function" && event && event.target) {
    const img = document.getElementById("main-image") || 
                document.querySelector(".gallery-placeholder");
    if (img) flyToCart(img);
  }

  if (typeof fbq !== "undefined") {
    fbq('track', 'AddToCart', {
      content_name: currentProduct.name,
      content_ids: [currentProduct.id],
      content_type: 'product',
      value: currentProduct.price * currentQty,
      currency: 'EGP'
    });
  }
}

function orderNowDetail(event) {
  if (!currentProduct) return;
  const existing = cart.find(item => item.id === currentProduct.id);
  if (existing) existing.qty += currentQty;
  else cart.push({ ...currentProduct, qty: currentQty });
  updateCart();
  const cartEl = document.getElementById("cart");
  if (cartEl && !cartEl.classList.contains("open")) toggleCart();
  showToast(`⚡ ${currentProduct.name} جاهز للطلب`);

  if (typeof flyToCart === "function" && event && event.target) {
    const img = document.getElementById("main-image") || 
                document.querySelector(".gallery-placeholder");
    if (img) flyToCart(img);
  }

  if (typeof fbq !== "undefined") {
    fbq('track', 'AddToCart', {
      content_name: currentProduct.name,
      content_ids: [currentProduct.id],
      content_type: 'product',
      value: currentProduct.price * currentQty,
      currency: 'EGP'
    });
  }
}

// ========== FAVORITES ==========
function toggleFav(id, event) {
  if (typeof heartBurst === "function" && event && event.target) {
    heartBurst(event.target);
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
  console.log("🔥 الزرار اتداس! هنبدأ نحفظ الطلب...");

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

  // ✅ ولّد رقم الطلب
  const orderNumber = Math.floor(100000 + Math.random() * 900000);
  const savedCoupon = appliedCoupon;

  // ✅ احفظ الطلب وافحص النتيجة
  const savedOrderId = await saveOrderToFirebase({
    orderNumber,
    name, phone, address, city, notes, payment,
    items: orderItems,
    subtotal,
    shipping: SHIPPING,
    total,
    discount: discount,
    couponCode: savedCoupon ? savedCoupon.code : null,
    paymentMethod: paymentNames[payment]
  });

  // 🚨 لو الحفظ فشل، قف هنا واعرض رسالة
  if (!savedOrderId) {
    showToast("تعذر تسجيل الطلب. بياناتك لم تُحفظ، حاول مرة تانية.", true);
    return;
  }

  if (typeof fbq !== "undefined") {
    const numItems = cart.reduce((s, i) => s + i.qty, 0);
    fbq('track', 'Purchase', {
      value: total,
      currency: 'EGP',
      num_items: numItems
    });
  }

  if (savedCoupon && typeof fbIncrementCouponUsage === "function") {
    try {
      await fbIncrementCouponUsage(savedCoupon.code);
      console.log("✅ تم زيادة عدّاد الكوبون:", savedCoupon.code);
    } catch (err) {
      console.error("❌ فشل زيادة عدّاد الكوبون:", err);
    }
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

  const orderForConfirmation = {
    orderNumber: orderNumber,
    createdAt: Date.now(),
    items: orderItems,
    subtotal: subtotal,
    shipping: SHIPPING,
    discount: discount,
    total: total,
    couponCode: savedCoupon ? savedCoupon.code : null,
    name: name,
    phone: phone,
    address: address,
    city: city
  };

  localStorage.setItem('forsa_last_order', JSON.stringify(orderForConfirmation));

  if (typeof sendOrderConfirmation === "function") {
    console.log("📤 جاري إرسال تأكيد الطلب عبر Template...");
    sendOrderConfirmation(phone, orderForConfirmation)
      .then(result => console.log("✅ WhatsApp result:", result))
      .catch(err => console.error("❌ WhatsApp error:", err));
  } else if (typeof sendWhatsAppMessage === "function") {
    const confirmationMsg = buildOrderConfirmationMessage(orderForConfirmation);
    console.log("📤 Fallback: إرسال رسالة نصية...");
    sendWhatsAppMessage(phone, confirmationMsg).catch(console.warn);
  }

  appliedCoupon = null;
  localStorage.removeItem("forsa_coupon");

  // ✅ استنى 5 ثواني عشان نضمن إن الحفظ والواتساب يخلصوا
  setTimeout(() => {
    window.location.replace('order-confirmation.html');
  }, 5000);
}

// ========== REVIEWS ==========
let currentRating = 5;

async function loadReviews() {
  if (typeof initFirebase !== "function" || !initFirebase()) {
    console.warn("Firebase مش متاح - مش هنحمل التقييمات");
    return;
  }

  const reviews = await fbGetReviewsByProduct(currentProduct.id) || [];
  renderReviews(reviews);
}

function renderReviews(reviews) {
  const summaryEl = document.getElementById("reviews-summary");
  const listEl = document.getElementById("reviews-list");

  if (!summaryEl || !listEl) return;

  if (reviews.length === 0) {
    summaryEl.innerHTML = "";
    listEl.innerHTML = `
      <div class="reviews-empty">
        <div class="empty-icon">⭐</div>
        <h3>مفيش تقييمات لسه</h3>
        <p>كن أول من يقيّم المنتج ده</p>
      </div>
    `;
    return;
  }

  const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const avgRating = (totalRating / reviews.length).toFixed(1);

  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const rating = Math.round(r.rating || 0);
    if (starCounts[rating] !== undefined) starCounts[rating]++;
  });

  summaryEl.innerHTML = `
    <div class="reviews-summary-rating">
      <div class="big-rating">${avgRating}</div>
      <div class="big-stars">${"★".repeat(Math.round(avgRating))}${"☆".repeat(5 - Math.round(avgRating))}</div>
      <div class="total-reviews">${reviews.length} تقييم</div>
    </div>
    <div class="reviews-summary-bars">
      ${[5, 4, 3, 2, 1].map(star => {
        const count = starCounts[star];
        const percentage = (count / reviews.length) * 100;
        return `
          <div class="rating-bar-row">
            <span class="rating-label">${star} ★</span>
            <div class="rating-bar">
              <div class="rating-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="rating-count">${count}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;

  listEl.innerHTML = reviews.map(r => {
    const date = r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleDateString("ar-EG")
      : "";
    const stars = "★".repeat(r.rating || 5) + "☆".repeat(5 - (r.rating || 5));
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-author">${r.name || "عميل"}</div>
          <div class="review-date">${date}</div>
        </div>
        <div class="review-stars">${stars}</div>
        ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ""}
      </div>
    `;
  }).join("");
}

function openReviewModal() {
  document.getElementById("review-modal-overlay").classList.add("active");
  document.body.style.overflow = "hidden";
  setRating(5);
}

function closeReviewModal(e, force = false) {
  if (force || (e && e.target.id === "review-modal-overlay")) {
    document.getElementById("review-modal-overlay").classList.remove("active");
    document.body.style.overflow = "";
    document.getElementById("review-form").reset();
  }
}

function setRating(value) {
  currentRating = value;
  document.getElementById("review-rating").value = value;
  document.querySelectorAll(".star-input").forEach(star => {
    const starValue = parseInt(star.dataset.value);
    star.classList.toggle("active", starValue <= value);
  });
}

async function submitReview(e) {
  e.preventDefault();

  const name = document.getElementById("review-name").value.trim();
  const rating = parseInt(document.getElementById("review-rating").value) || 5;
  const comment = document.getElementById("review-comment").value.trim();

  if (!name) {
    showToast("⚠️ اكتب اسمك", true);
    return;
  }

  if (typeof initFirebase !== "function" || !initFirebase()) {
    showToast("❌ حصلت مشكلة، جرب تاني", true);
    return;
  }

  const review = {
    productId: currentProduct.id,
    name: name,
    rating: rating,
    comment: comment,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const reviewId = await fbAddReview(review);

  if (reviewId) {
    showToast("✅ تم إرسال تقييمك، شكرًا!");
    closeReviewModal(null, true);
    loadReviews();
  } else {
    showToast("❌ فشل إرسال التقييم", true);
  }
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

  observeFadeUp();
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

  if (typeof flyToCart === "function" && e.target) {
    const card = e.target.closest(".product-card");
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

  if (typeof flyToCart === "function" && e.target) {
    const card = e.target.closest(".product-card");
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

function toggleFavRelated(e, id) {
  e.preventDefault();
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

    // ===== احصل على رقم الموبايل لو موجود =====
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