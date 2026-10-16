// ============================================
// ===== CATEGORIES MANAGEMENT ================
// ============================================

let allCategories = [];

// ===== تحميل الأقسام =====
async function loadCategories() {
  const tbody = document.getElementById("admin-categories-body");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">⏳ جاري التحميل...</td></tr>';

  try {
    if (typeof initFirebase !== "function" || !initFirebase()) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--red);">❌ Firebase مش متاح</td></tr>';
      return;
    }

    const snapshot = await firebase.firestore().collection("categories").get();
    allCategories = [];
    snapshot.forEach(doc => {
      allCategories.push({ id: doc.id, ...doc.data() });
    });

    renderCategoriesTable();
    updateCategoriesStats();

  } catch (e) {
    console.error("Error loading categories:", e);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--red);">❌ فشل تحميل الأقسام</td></tr>';
  }
}

// ===== عرض جدول الأقسام =====
function renderCategoriesTable() {
  const tbody = document.getElementById("admin-categories-body");
  if (!tbody) return;

  if (allCategories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">لا توجد أقسام — اضغط "إضافة قسم"</td></tr>';
    return;
  }

  tbody.innerHTML = allCategories.map((c, i) => {
    const isImageUrl = c.icon && (
      c.icon.startsWith("http://") ||
      c.icon.startsWith("https://") ||
      c.icon.startsWith("/") ||
      c.icon.startsWith("data:image")
    );

    const iconHtml = isImageUrl
      ? `<img src="${c.icon}" alt="${c.name}" style="width:44px; height:44px; object-fit:contain; border-radius:8px; background:var(--black); padding:4px;" onerror="this.outerHTML='<span style=\\'font-size:28px;\\'>📦</span>'" />`
      : `<span style="font-size:28px;">${c.icon || "📦"}</span>`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            ${iconHtml}
            <div>
              <div style="font-weight:800;">${c.name}</div>
              <div style="font-size:11px; color:var(--gray); font-family:'Montserrat', monospace;">${c.id}</div>
            </div>
          </div>
        </td>
        <td>${c.id}</td>
        <td>
          ${isImageUrl 
            ? '<span class="coupon-status active">🖼️ صورة</span>' 
            : '<span class="coupon-status inactive">😀 إيموجي</span>'}
        </td>
        <td>
          <div class="order-actions">
            <button class="btn-blue" onclick="editCategory('${c.id}')" style="padding:8px 12px; font-size:12px;">✏️</button>
            <button class="btn-red" onclick="deleteCategory('${c.id}', '${c.name}')" style="padding:8px 12px; font-size:12px;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ===== تحديث الإحصائيات =====
function updateCategoriesStats() {
  const statTotal = document.getElementById("stat-categories-total");
  const statImages = document.getElementById("stat-categories-images");
  const statEmojis = document.getElementById("stat-categories-emojis");

  if (statTotal) statTotal.textContent = allCategories.length;

  const imageCount = allCategories.filter(c => 
    c.icon && (c.icon.startsWith("http") || c.icon.startsWith("/") || c.icon.startsWith("data:image"))
  ).length;

  if (statImages) statImages.textContent = imageCount;
  if (statEmojis) statEmojis.textContent = allCategories.length - imageCount;
}

// ===== فلترة الأقسام =====
function filterCategories() {
  const input = document.getElementById("categories-search");
  if (!input) return;
  const query = input.value.toLowerCase().trim();
  const tbody = document.getElementById("admin-categories-body");
  if (!tbody) return;

  const filtered = allCategories.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.id.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">لا توجد نتائج مطابقة</td></tr>';
    return;
  }

  // أعِد استخدام دالة العرض
  const originalCategories = allCategories;
  allCategories = filtered;
  renderCategoriesTable();
  allCategories = originalCategories;
}

// ===== فتح Modal إضافة قسم =====
function openCategoryModal() {
  const modal = document.getElementById("category-modal");
  const title = document.getElementById("category-modal-title");
  const form = document.getElementById("category-form");

  if (form) form.reset();
  document.getElementById("cat-id").value = "";
  document.getElementById("cat-id").disabled = false;

  if (title) title.textContent = "إضافة قسم";
  if (modal) modal.classList.add("active");
}

// ===== فتح Modal تعديل قسم =====
function editCategory(id) {
  const category = allCategories.find(c => c.id === id);
  if (!category) return;

  const modal = document.getElementById("category-modal");
  const title = document.getElementById("category-modal-title");

  document.getElementById("cat-id").value = id;
  document.getElementById("cat-id").disabled = true;
  document.getElementById("cat-name").value = category.name || "";
  document.getElementById("cat-icon").value = category.icon || "";

  if (title) title.textContent = "تعديل القسم";
  if (modal) modal.classList.add("active");
}

// ===== إغلاق Modal =====
function closeCategoryModal(e, force = false) {
  if (force || (e && e.target.id === "category-modal")) {
    const modal = document.getElementById("category-modal");
    if (modal) modal.classList.remove("active");
  }
}

// ===== حفظ القسم =====
async function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById("cat-id").value.trim().toLowerCase();
  const name = document.getElementById("cat-name").value.trim();
  const icon = document.getElementById("cat-icon").value.trim();

  if (!id || !name) {
    if (typeof showToast === "function") showToast("⚠️ اكتب id والاسم", true);
    return;
  }

  // تأكد إن الـ id بالإنجليزي والرموز المسموحة بس
  if (!/^[a-z0-9-]+$/.test(id)) {
    if (typeof showToast === "function") showToast("⚠️ الـ ID لازم يكون بحروف إنجليزية صغيرة وأرقام وشرطات بس", true);
    return;
  }

  const data = { name, icon: icon || "📦" };
  const isEdit = document.getElementById("cat-id").disabled;

  try {
    let success;
    if (isEdit) {
      success = await fbUpdateCategory(id, data);
    } else {
      success = await fbAddCategory(id, data);
    }

    if (success) {
      if (typeof showToast === "function") {
        showToast(isEdit ? "✅ تم تعديل القسم" : "✅ تم إضافة القسم");
      }
      closeCategoryModal(null, true);
      await loadCategories();
    } else {
      if (typeof showToast === "function") showToast("❌ فشل الحفظ", true);
    }
  } catch (err) {
    console.error("Error saving category:", err);
    if (typeof showToast === "function") showToast("❌ حصلت مشكلة", true);
  }
}

// ===== حذف قسم =====
async function deleteCategory(id, name) {
  if (!confirm(`متأكد إنك عايز تحذف قسم "${name}"؟\n\n⚠️ المنتجات المرتبطة بالقسم ده هتفضل موجودة لكن مش هتظهر في القسم ده.`)) {
    return;
  }

  try {
    const success = await fbDeleteCategory(id);
    if (success) {
      if (typeof showToast === "function") showToast("🗑️ تم حذف القسم");
      await loadCategories();
    } else {
      if (typeof showToast === "function") showToast("❌ فشل الحذف", true);
    }
  } catch (err) {
    console.error("Error deleting category:", err);
    if (typeof showToast === "function") showToast("❌ حصلت مشكلة", true);
  }
}

// ===== معاينة الأيقونة مباشرة في الـ Modal =====
function previewCategoryIcon() {
  const input = document.getElementById("cat-icon");
  const preview = document.getElementById("cat-icon-preview");
  if (!input || !preview) return;

  const val = input.value.trim();
  if (!val) {
    preview.innerHTML = '<span style="font-size:32px;">📦</span>';
    return;
  }

  const isImageUrl = val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/") || val.startsWith("data:image");
  if (isImageUrl) {
    preview.innerHTML = `<img src="${val}" alt="preview" style="width:48px; height:48px; object-fit:contain; border-radius:8px; background:var(--black); padding:4px;" onerror="this.outerHTML='<span style=\\'font-size:32px;\\'>⚠️</span>'" />`;
  } else {
    preview.innerHTML = `<span style="font-size:32px;">${val}</span>`;
  }
}