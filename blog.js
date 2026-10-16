// ============================================
// ===== BLOG - PUBLIC PAGE ===================
// ============================================

let allBlogPosts = [];
let filteredBlogPosts = [];

// ===== تحميل المقالات =====
async function loadBlogPosts() {
  const grid = document.getElementById("blog-grid");
  const loading = document.getElementById("blog-loading");
  const empty = document.getElementById("blog-empty");
  const countEl = document.getElementById("blog-results-count");

  if (!grid) return;

  try {
    if (typeof initFirebase !== "function" || !initFirebase()) {
      console.warn("Firebase مش متاح");
      if (loading) loading.style.display = "none";
      if (empty) {
        empty.style.display = "block";
        empty.querySelector("h3").textContent = "❌ Firebase مش متاح";
        empty.querySelector("p").textContent = "جرب تحديث الصفحة";
      }
      return;
    }

    // جلب المقالات المنشورة بس
    const snapshot = await firebase.firestore().collection("blog_posts")
      .where("published", "==", true)
      .orderBy("publishedAt", "desc")
      .get();

    allBlogPosts = [];
    snapshot.forEach(doc => {
      allBlogPosts.push({ id: doc.id, ...doc.data() });
    });

    filteredBlogPosts = [...allBlogPosts];

    if (loading) loading.style.display = "none";
    renderBlogGrid();
    if (countEl) countEl.textContent = filteredBlogPosts.length;

  } catch (e) {
    console.error("Error loading blog posts:", e);
    if (loading) loading.style.display = "none";
    if (empty) {
      empty.style.display = "block";
      empty.querySelector("h3").textContent = "❌ فشل تحميل المقالات";
      empty.querySelector("p").textContent = "جرب تحديث الصفحة";
    }
  }
}

// ===== عرض المقالات =====
function renderBlogGrid() {
  const grid = document.getElementById("blog-grid");
  const empty = document.getElementById("blog-empty");
  const countEl = document.getElementById("blog-results-count");
  
  if (!grid) return;

  if (countEl) countEl.textContent = filteredBlogPosts.length;

  if (filteredBlogPosts.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  grid.innerHTML = filteredBlogPosts.map(post => {
    const date = post.publishedAt?.toDate
      ? post.publishedAt.toDate().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : "";

    const readTime = calculateReadTime(post.content || "");
    const coverHtml = post.coverImage
      ? `<img src="${post.coverImage}" alt="${post.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class='blog-placeholder'>📝</div>'" />`
      : `<div class="blog-placeholder">📝</div>`;

    return `
      <article class="blog-card fade-up" onclick="goToBlogPost('${post.slug}')">
        <div class="blog-card-img">
          ${coverHtml}
          ${post.category ? `<span class="blog-category-badge">${post.category}</span>` : ""}
        </div>
        <div class="blog-card-body">
          <h3 class="blog-card-title">${post.title}</h3>
          <p class="blog-card-excerpt">${post.excerpt || ""}</p>
          <div class="blog-card-meta">
            <span class="blog-meta-item">📅 ${date}</span>
            <span class="blog-meta-item">⏱️ ${readTime} دقيقة</span>
            <span class="blog-meta-item">👁️ ${post.views || 0}</span>
          </div>
          <div class="blog-card-footer">
            <span class="blog-read-more">اقرأ المزيد →</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // تحديث fade-up observer
  if (typeof observeFadeUp === "function") {
    observeFadeUp();
  }
}

// ===== حساب وقت القراءة =====
function calculateReadTime(content) {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // 200 كلمة في الدقيقة
  return Math.max(1, minutes);
}

// ===== الفلترة والترتيب =====
function applyBlogFilters() {
  const searchInput = document.getElementById("blog-search-input");
  const catFilter = document.getElementById("blog-cat-filter");
  const sortFilter = document.getElementById("blog-sort-filter");

  const query = (searchInput?.value || "").toLowerCase().trim();
  const category = catFilter?.value || "";
  const sort = sortFilter?.value || "new";

  // Filter
  filteredBlogPosts = allBlogPosts.filter(p => {
    const matchesSearch = !query || 
      (p.title || "").toLowerCase().includes(query) ||
      (p.excerpt || "").toLowerCase().includes(query) ||
      (p.tags || []).some(t => t.toLowerCase().includes(query));
    
    const matchesCategory = !category || p.category === category;

    return matchesSearch && matchesCategory;
  });

  // Sort
  if (sort === "new") {
    filteredBlogPosts.sort((a, b) => {
      const dateA = a.publishedAt?.toDate?.() || 0;
      const dateB = b.publishedAt?.toDate?.() || 0;
      return dateB - dateA;
    });
  } else if (sort === "old") {
    filteredBlogPosts.sort((a, b) => {
      const dateA = a.publishedAt?.toDate?.() || 0;
      const dateB = b.publishedAt?.toDate?.() || 0;
      return dateA - dateB;
    });
  } else if (sort === "views") {
    filteredBlogPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
  }

  renderBlogGrid();
}

// ===== Reset Filters =====
function resetBlogFilters() {
  const searchInput = document.getElementById("blog-search-input");
  const catFilter = document.getElementById("blog-cat-filter");
  const sortFilter = document.getElementById("blog-sort-filter");

  if (searchInput) searchInput.value = "";
  if (catFilter) catFilter.value = "";
  if (sortFilter) sortFilter.value = "new";

  applyBlogFilters();
}

// ===== التنقل لصفحة المقال =====
function goToBlogPost(slug) {
  window.location.href = `blog-post.html?slug=${encodeURIComponent(slug)}`;
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadBlogPosts();
});