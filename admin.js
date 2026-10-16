const STORAGE_KEY = "forsa_products";
let allData = { categories: [], products: [] };
let editId = null;

// ========== LOAD DATA (ياخد من Firebase الأول) ==========
async function loadData() {
  // ===== 1) جرب Firebase الأول =====
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
        // حدّث localStorage بالنسخة الصح
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        console.log("✅ تم تحميل البيانات من Firebase (الصور محدّثة)");
        
        renderTable();
        populateCategories();
        updateStats();
        return;
      }
    } catch (e) {
      console.warn("Firebase فشل، هنستخدم localStorage:", e);
    }
  }
  
  // ===== 2) Fallback على localStorage =====
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    allData = JSON.parse(saved);
    console.log("⚠️ تم تحميل البيانات من localStorage");
  } else {
    allData = {
      categories: [
        { id: "earbuds", name: "إيربودز", icon: "🎧" },
        { id: "watches", name: "ساعات سمارت", icon: "⌚" },
        { id: "headphones", name: "هيدفونات", icon: "🎵" },
        { id: "speakers", name: "سبيكرات", icon: "🔊" },
        { id: "chargers", name: "شواحن", icon: "🔌" },
        { id: "cables", name: "كابلات", icon: "🔗" },
        { id: "mobile", name: "إكسسوارات موبايل", icon: "📱" },
        { id: "gaming", name: "جيمنج", icon: "🎮" }
      ],
      products: []
    };
    try {
      const res = await fetch("products.json");
      if (res.ok) allData = await res.json();
    } catch (e) {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  }
  renderTable();
  populateCategories();
  updateStats();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

// ========== STATS ==========
function updateStats() {
  document.getElementById("stat-products").textContent = allData.products.length;
  document.getElementById("stat-categories").textContent = allData.categories.length;
  document.getElementById("stat-offers").textContent = allData.products.filter(p => p.oldPrice && p.oldPrice > p.price).length;
}

// ========== RENDER TABLE ==========
function renderTable(filter = "") {
  const tbody = document.getElementById("admin-products-body");
  let products = allData.products;
  if (filter) {
    const q = filter.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q));
  }

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--gray); padding: 40px;">لا توجد منتجات</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, i) => {
    const cat = allData.categories.find(c => c.id === p.category);
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${p.image ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:8px;" />` : (p.icon || "📦")} ${p.name}</td>
        <td>${cat ? cat.name : "-"}</td>
        <td style="color: var(--lime); font-weight: 700;">${p.price} جنيه</td>
        <td style="color: var(--gray); text-decoration: line-through;">${p.oldPrice && p.oldPrice > p.price ? p.oldPrice + " جنيه" : "-"}</td>
        <td>${p.badge || "-"}</td>
        <td>
          <button class="btn-blue" onclick="editProduct(${p.id})" style="padding:8px 12px; font-size:13px;">✏️ تعديل</button>
          <button class="btn-red" onclick="deleteProduct(${p.id})" style="padding:8px 12px; font-size:13px;">🗑️ حذف</button>
        </td>
      </tr>
    `;
  }).join("");
}

function filterTable() {
  renderTable(document.getElementById("admin-search").value);
}

function populateCategories() {
  const select = document.getElementById("p-category");
  select.innerHTML = allData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

// ========== OPEN MODAL ==========
function openProductModal(product = null) {
  editId = product ? product.id : null;
  document.getElementById("modal-title").textContent = product ? "تعديل منتج" : "إضافة منتج";
  document.getElementById("p-id").value = product ? product.id : "";
  document.getElementById("p-name").value = product ? product.name : "";
  document.getElementById("p-category").value = product ? product.category : (allData.categories[0]?.id || "");
  document.getElementById("p-price").value = product ? product.price : "";
  document.getElementById("p-oldprice").value = product && product.oldPrice ? product.oldPrice : "";
  document.getElementById("p-icon").value = product ? product.icon || "" : "";
  document.getElementById("p-image").value = product ? product.image || "" : "";
  document.getElementById("p-images").value = product && product.images ? product.images.join("\n") : "";
  document.getElementById("p-badge").value = product ? product.badge || "" : "";
  document.getElementById("p-description").value = product ? product.description || "" : "";
  document.getElementById("p-longdescription").value = product ? product.longDescription || "" : "";
  document.getElementById("p-features").value = product && product.features ? product.features.join("\n") : "";
  document.getElementById("p-rating").value = product && product.rating ? product.rating : 4.5;
  document.getElementById("p-reviews").value = product && product.reviewsCount ? product.reviewsCount : 0;
  document.getElementById("p-sku").value = product ? product.sku || "" : "";
  document.getElementById("p-instock").checked = product ? (product.inStock !== false) : true;
  document.getElementById("product-modal").classList.add("active");
}

function closeProductModal(e) {
  if (!e || e.target.id === "product-modal") {
    document.getElementById("product-modal").classList.remove("active");
  }
}

// ========== SAVE PRODUCT ==========
function saveProduct(e) {
  e.preventDefault();
  const oldPrice = parseFloat(document.getElementById("p-oldprice").value) || 0;
  const price = parseFloat(document.getElementById("p-price").value);

  const imagesText = document.getElementById("p-images").value.trim();
  const images = imagesText ? imagesText.split("\n").map(s => s.trim()).filter(Boolean) : [];

  const featuresText = document.getElementById("p-features").value.trim();
  const features = featuresText ? featuresText.split("\n").map(s => s.trim()).filter(Boolean) : [];

  const mainImage = document.getElementById("p-image").value.trim();
  if (images.length === 0 && mainImage) images.push(mainImage);

  const product = {
    id: editId || Date.now(),
    name: document.getElementById("p-name").value,
    category: document.getElementById("p-category").value,
    price: price,
    oldPrice: oldPrice > price ? oldPrice : 0,
    icon: document.getElementById("p-icon").value,
    image: mainImage,
    images: images,
    badge: document.getElementById("p-badge").value,
    description: document.getElementById("p-description").value,
    longDescription: document.getElementById("p-longdescription").value,
    features: features,
    rating: parseFloat(document.getElementById("p-rating").value) || 4.5,
    reviewsCount: parseInt(document.getElementById("p-reviews").value) || 0,
    sku: document.getElementById("p-sku").value,
    inStock: document.getElementById("p-instock").checked
  };

  if (editId) {
    const idx = allData.products.findIndex(p => p.id === editId);
    allData.products[idx] = product;
    showToast("✅ تم تعديل المنتج");
  } else {
    allData.products.push(product);
    showToast("✅ تم إضافة المنتج");
  }

  saveData();
  renderTable();
  updateStats();
  closeProductModal();
}

// ========== EDIT ==========
function editProduct(id) {
  const product = allData.products.find(p => p.id === id);
  if (product) openProductModal(product);
}

// ========== DELETE ==========
function deleteProduct(id) {
  if (!confirm("هل أنت متأكد من حذف المنتج؟")) return;
  allData.products = allData.products.filter(p => p.id !== id);
  saveData();
  renderTable();
  updateStats();
  showToast("🗑️ تم حذف المنتج");
}

// ========== EXPORT (من Firebase مباشرة) ==========
async function exportData() {
  showToast("⏳ جاري جلب البيانات من Firebase...");
  
  try {
    // ===== جيب البيانات الحقيقية من Firebase =====
    if (typeof initFirebase === "function" && initFirebase()) {
      const [fbProducts, fbCategories] = await Promise.all([
        fbGetProducts(),
        fbGetCategories()
      ]);
      
      if (fbProducts && fbCategories) {
        allData = {
          products: fbProducts,
          categories: fbCategories
        };
        // حدّث localStorage بالنسخة الصح
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        console.log("✅ تم تحديث localStorage من Firebase");
      }
    }
    
    // ===== صدّر البيانات المحدثة =====
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forsa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast("✅ تم تصدير البيانات (من Firebase)");
  } catch (e) {
    console.error("Error exporting:", e);
    showToast("❌ فشل التصدير", true);
  }
}

// ========== IMPORT (مع رفع على Firebase) ==========
function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const importedData = JSON.parse(ev.target.result);
        
        // تحقق إن الملف فيه البيانات الصحيحة
        if (!importedData.products || !importedData.categories) {
          showToast("❌ الملف مش فيه البيانات المطلوبة", true);
          return;
        }
        
        // حدّث allData و localStorage
        allData = importedData;
        saveData();
        renderTable();
        populateCategories();
        updateStats();
        
        // ===== اسأل المستخدم يرفع على Firebase =====
        if (confirm("✅ تم استيراد البيانات محليًا.\n\n⚠️ مهم: عايز ترفعها على Firebase عشان تظهر في الموقع؟\n\n(اضغط OK للرفع على Firebase)")) {
          await uploadToFirebase();
        } else {
          showToast("⚠️ تم الاستيراد (محليًا) — لم يتم الرفع على Firebase", true);
        }
      } catch (err) {
        console.error("Import error:", err);
        showToast("❌ ملف غير صالح", true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetData() {
  if (!confirm("هل أنت متأكد من إعادة التعيين للبيانات الافتراضية؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ========== TOAST ==========
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

// ========== UPLOAD TO FIREBASE (SAFE) ==========
async function uploadToFirebase() {
  if (typeof initFirebase !== "function" || !initFirebase()) {
    showToast("❌ Firebase مش متاح", true);
    return;
  }

  if (!confirm("⚠️ تحذير:\n\nالرفع هيستبدل كل البيانات على Firebase بالبيانات اللي عندك.\n\nهل أنت متأكد؟")) return;

  showToast("⏳ جاري التحقق من البيانات...");

  try {
    // ===== 1) جيب آخر نسخة من Firebase =====
    const [fbProducts, fbCategories] = await Promise.all([
      fbGetProducts(),
      fbGetCategories()
    ]);

    // ===== 2) ادمج البيانات (Firebase أولاً في الأقسام) =====
    let mergedProducts = allData.products || [];
    let mergedCategories = allData.categories || [];

    // لو Firebase فيه منتجات، استخدمها
    if (fbProducts && fbProducts.length > 0) {
      mergedProducts = fbProducts;
      console.log("✅ استخدام المنتجات من Firebase");
    }

    // لو Firebase فيه أقسام، استخدمها (عشان الصور محفوظة)
    if (fbCategories && fbCategories.length > 0) {
      mergedCategories = fbCategories;
      console.log("✅ استخدام الأقسام من Firebase (الصور محفوظة)");
    }

    // ===== 3) لو الأقسام عند العميل فيها صور أكثر، استخدمها =====
    const localCatsWithImages = (allData.categories || []).filter(c =>
      c.icon && (c.icon.startsWith("http") || c.icon.startsWith("/") || c.icon.startsWith("data:image"))
    );

    if (localCatsWithImages.length > 0) {
      // دمج: خد من Firebase، بس لو العميل عنده صورة محدّثة، خدها
      const merged = mergedCategories.map(fbCat => {
        const localCat = (allData.categories || []).find(c => c.id === fbCat.id);
        if (localCat && localCat.icon &&
            (localCat.icon.startsWith("http") || localCat.icon.startsWith("/") || localCat.icon.startsWith("data:image"))) {
          return { ...fbCat, ...localCat };
        }
        return fbCat;
      });
      mergedCategories = merged;
      console.log("✅ تم دمج الأقسام (الصور محدّثة)");
    }

    // ===== 4) حدّث allData =====
    allData = {
      products: mergedProducts,
      categories: mergedCategories
    };

    // حدّث localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

    // ===== 5) رفع على Firebase =====
    showToast("⏳ جاري الرفع...");
    const success = await fbUploadAll(allData);

    if (success) {
      showToast("✅ تم رفع البيانات على Firebase بأمان");
      console.log("✅ Firebase محدّث:", {
        products: allData.products.length,
        categories: allData.categories.length
      });
    } else {
      showToast("❌ فشل الرفع", true);
    }

  } catch (e) {
    console.error("❌ Error uploading:", e);
    showToast("❌ حصل خطأ: " + e.message, true);
  }
}

// ========== SWITCH ADMIN TAB ==========
function switchAdminTab(tab) {
  // إخفاء كل الـ Sections
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add("hidden"));
  
  // إزالة الـ active من كل الـ tabs
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.remove("active"));
  
  // إخفاء كل الأزرار
  document.querySelectorAll('.admin-actions').forEach(a => a.classList.add("hidden"));

  // إظهار الـ Section المطلوب
  const section = document.getElementById("section-" + tab);
  if (section) section.classList.remove("hidden");

  // تفعيل الـ Tab
  const tabBtn = document.getElementById("tab-" + tab);
  if (tabBtn) tabBtn.classList.add("active");

  // إظهار الأزرار المناسبة
  const actions = document.getElementById(tab + "-actions");
  if (actions) actions.classList.remove("hidden");

  // تحديث عنوان الصفحة
  const pageTitle = document.getElementById("page-title");
  const titles = {
    products: "إدارة المنتجات",
    orders: "إدارة الطلبات",
    coupons: "إدارة الكوبونات",
    categories: "إدارة الأقسام"
  };
  if (pageTitle && titles[tab]) pageTitle.textContent = titles[tab];

  // تحميل البيانات المناسبة
  if (tab === "orders" && typeof loadOrders === "function") {
    loadOrders();
  } else if (tab === "coupons" && typeof loadCoupons === "function") {
    loadCoupons();
  } else if (tab === "categories" && typeof loadCategories === "function") {
    loadCategories();
  }
}

// ========== INIT ==========
loadData();