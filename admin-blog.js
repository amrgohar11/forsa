// ============================================
// ===== BLOG MANAGEMENT ======================
// ============================================

let allBlogPosts = [];

// ===== تحميل المقالات =====
async function loadBlogPosts() {
  const tbody = document.getElementById("admin-blog-body");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">⏳ جاري التحميل...</td></tr>';

  try {
    if (typeof initFirebase !== "function" || !initFirebase()) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--red);">❌ Firebase مش متاح</td></tr>';
      return;
    }

    const snapshot = await firebase.firestore().collection("blog_posts")
      .orderBy("createdAt", "desc")
      .get();
    
    allBlogPosts = [];
    snapshot.forEach(doc => {
      allBlogPosts.push({ id: doc.id, ...doc.data() });
    });

    renderBlogTable();
    updateBlogStats();

  } catch (e) {
    console.error("Error loading blog posts:", e);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--red);">❌ فشل تحميل المقالات</td></tr>';
  }
}

// ===== عرض جدول المقالات =====
function renderBlogTable() {
  const tbody = document.getElementById("admin-blog-body");
  if (!tbody) return;

  if (allBlogPosts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">لا توجد مقالات — اضغط "إضافة مقال"</td></tr>';
    return;
  }

  tbody.innerHTML = allBlogPosts.map((p, i) => {
    const date = p.publishedAt?.toDate
      ? p.publishedAt.toDate().toLocaleDateString("ar-EG")
      : (p.createdAt?.toDate
        ? p.createdAt.toDate().toLocaleDateString("ar-EG")
        : "-");

    const statusBadge = p.published
      ? '<span class="coupon-status active">✅ منشور</span>'
      : '<span class="coupon-status inactive">📝 مسودة</span>';

    const coverHtml = p.coverImage
      ? `<img src="${p.coverImage}" style="width:60px; height:40px; object-fit:cover; border-radius:6px;" onerror="this.outerHTML='<span style=font-size:24px;>📄</span>'" />`
      : '<span style="font-size:24px;">📄</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${coverHtml}</td>
        <td>
          <div style="font-weight:800; margin-bottom:4px;">${p.title || "-"}</div>
          <div style="font-size:11px; color:var(--gray); font-family:'Montserrat', monospace;">${p.slug || "-"}</div>
        </td>
        <td>${p.category || "-"}</td>
        <td>${date}</td>
        <td><span style="color:var(--lime); font-weight:800;">${p.views || 0}</span></td>
        <td>${statusBadge}</td>
        <td>
          <div class="order-actions">
            <button class="btn-blue" onclick="editBlogPost('${p.id}')" style="padding:6px 10px; font-size:12px;">✏️</button>
            <button class="btn-gray" onclick="toggleBlogPublish('${p.id}', ${!p.published})" style="padding:6px 10px; font-size:12px;">${p.published ? "👁️" : "📤"}</button>
            <button class="btn-red" onclick="deleteBlogPost('${p.id}', '${(p.title || "").replace(/'/g, "\\'")}')" style="padding:6px 10px; font-size:12px;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ===== إحصائيات =====
function updateBlogStats() {
  const totalEl = document.getElementById("stat-blog-total");
  const publishedEl = document.getElementById("stat-blog-published");
  const viewsEl = document.getElementById("stat-blog-views");

  if (totalEl) totalEl.textContent = allBlogPosts.length;
  if (publishedEl) publishedEl.textContent = allBlogPosts.filter(p => p.published).length;
  if (viewsEl) {
    const totalViews = allBlogPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    viewsEl.textContent = totalViews.toLocaleString("ar-EG");
  }
}

// ===== فلترة =====
function filterBlogPosts() {
  const input = document.getElementById("blog-search");
  if (!input) return;
  const query = input.value.toLowerCase().trim();
  const tbody = document.getElementById("admin-blog-body");
  if (!tbody) return;

  if (!query) {
    renderBlogTable();
    return;
  }

  const filtered = allBlogPosts.filter(p =>
    (p.title || "").toLowerCase().includes(query) ||
    (p.slug || "").toLowerCase().includes(query) ||
    (p.category || "").toLowerCase().includes(query)
  );

  const originalPosts = allBlogPosts;
  allBlogPosts = filtered;
  renderBlogTable();
  allBlogPosts = originalPosts;
}

// ===== فتح Modal إضافة/تعديل =====
function openBlogModal(post = null) {
  const modal = document.getElementById("blog-modal");
  const title = document.getElementById("blog-modal-title");
  const form = document.getElementById("blog-form");
  
  if (form) form.reset();

  if (post) {
    if (title) title.textContent = "تعديل المقال";
    document.getElementById("blog-id").value = post.id || "";
    document.getElementById("blog-title").value = post.title || "";
    document.getElementById("blog-slug").value = post.slug || "";
    document.getElementById("blog-excerpt").value = post.excerpt || "";
    document.getElementById("blog-content").value = post.content || "";
    document.getElementById("blog-cover").value = post.coverImage || "";
    document.getElementById("blog-category").value = post.category || "نصائح";
    document.getElementById("blog-tags").value = (post.tags || []).join(", ");
    document.getElementById("blog-published").checked = post.published || false;
    document.getElementById("blog-related").value = (post.relatedProducts || []).join(", ");
  } else {
    if (title) title.textContent = "إضافة مقال";
    document.getElementById("blog-id").value = "";
    document.getElementById("blog-category").value = "نصائح";
    document.getElementById("blog-published").checked = false;
  }

  if (modal) modal.classList.add("active");
}

function editBlogPost(id) {
  const post = allBlogPosts.find(p => p.id === id);
  if (post) openBlogModal(post);
}

function closeBlogModal(e, force = false) {
  if (force || (e && e.target.id === "blog-modal")) {
    const modal = document.getElementById("blog-modal");
    if (modal) modal.classList.remove("active");
  }
}

// ===== توليد slug أوتوماتيك =====
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
}

function autoGenerateSlug() {
  const titleInput = document.getElementById("blog-title");
  const slugInput = document.getElementById("blog-slug");
  if (!titleInput || !slugInput) return;
  
  // متولّدش لو الـ slug موجود بالفعل (المستخدم كتبه)
  if (slugInput.value.trim()) return;
  
  slugInput.value = generateSlug(titleInput.value);
}

// ===== حفظ المقال =====
async function saveBlogPost(e) {
  e.preventDefault();

  const id = document.getElementById("blog-id").value;
  const title = document.getElementById("blog-title").value.trim();
  const slug = document.getElementById("blog-slug").value.trim().toLowerCase();
  const excerpt = document.getElementById("blog-excerpt").value.trim();
  const content = document.getElementById("blog-content").value.trim();
  const coverImage = document.getElementById("blog-cover").value.trim();
  const category = document.getElementById("blog-category").value;
  const tags = document.getElementById("blog-tags").value
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
  const published = document.getElementById("blog-published").checked;
  const relatedProducts = document.getElementById("blog-related").value
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => isNaN(id) ? id : parseInt(id));

  // Validation
  if (!title || title.length < 5) {
    showToast("⚠️ العنوان لازم يكون 5 حروف على الأقل", true);
    return;
  }
  if (!slug || slug.length < 3) {
    showToast("⚠️ الـ slug لازم يكون 3 حروف على الأقل", true);
    return;
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    showToast("⚠️ الـ slug لازم بحروف إنجليزية صغيرة وأرقام وشرطات", true);
    return;
  }
  if (!excerpt) {
    showToast("⚠️ اكتب وصف قصير للمقال", true);
    return;
  }
  if (!content || content.length < 50) {
    showToast("⚠️ المحتوى لازم يكون 50 حرف على الأقل", true);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ جاري الحفظ...";
  }

  const postData = {
    title,
    slug,
    excerpt,
    content,
    coverImage,
    category,
    tags,
    published,
    relatedProducts
  };

  let success;
  if (id) {
    success = await fbUpdateBlogPost(id, postData);
  } else {
    const result = await fbAddBlogPost(postData);
    if (result && result.error) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "💾 حفظ";
      }
      showToast("⚠️ " + result.error, true);
      return;
    }
    success = !!result;
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 حفظ";
  }

  if (success) {
    showToast(id ? "✅ تم تعديل المقال" : "✅ تم إضافة المقال");
    closeBlogModal(null, true);
    await loadBlogPosts();
  } else {
    showToast("❌ فشل الحفظ", true);
  }
}

// ===== نشر/إلغاء نشر =====
async function toggleBlogPublish(id, newStatus) {
  const success = await fbUpdateBlogPost(id, { published: newStatus });
  if (success) {
    showToast(newStatus ? "✅ تم نشر المقال" : "📝 تم تحويله لمسودة");
    await loadBlogPosts();
  } else {
    showToast("❌ فشل التحديث", true);
  }
}

// ===== حذف مقال =====
async function deleteBlogPost(id, title) {
  if (!confirm(`متأكد إنك عايز تحذف المقال "${title}"؟`)) return;

  const success = await fbDeleteBlogPost(id);
  if (success) {
    showToast("🗑️ تم حذف المقال");
    await loadBlogPosts();
  } else {
    showToast("❌ فشل الحذف", true);
  }
}

// ===== معاينة صورة الغلاف =====
function previewBlogCover() {
  const input = document.getElementById("blog-cover");
  const preview = document.getElementById("blog-cover-preview");
  if (!input || !preview) return;

  const val = input.value.trim();
  if (!val) {
    preview.innerHTML = '<span style="font-size:32px;">📄</span>';
    return;
  }
  preview.innerHTML = `<img src="${val}" alt="cover" style="width:80px; height:60px; object-fit:cover; border-radius:8px;" onerror="this.outerHTML='<span style=\\'font-size:32px;\\'>⚠️</span>'" />`;
}