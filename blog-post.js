// ============================================
// ===== BLOG POST - SINGLE PAGE ==============
// ============================================

let currentPost = null;
let allBlogPostsCache = [];

// ===== تحميل المقال =====
async function loadBlogPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  const loading = document.getElementById("blog-post-loading");
  const article = document.getElementById("blog-post-article");
  const notfound = document.getElementById("blog-post-notfound");

  if (!slug) {
    if (loading) loading.style.display = "none";
    if (notfound) notfound.style.display = "block";
    return;
  }

  try {
    if (typeof initFirebase !== "function" || !initFirebase()) {
      throw new Error("Firebase مش متاح");
    }

    // جلب المقال
    const snapshot = await firebase.firestore().collection("blog_posts")
      .where("slug", "==", slug)
      .where("published", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      if (loading) loading.style.display = "none";
      if (notfound) notfound.style.display = "block";
      return;
    }

    const doc = snapshot.docs[0];
    currentPost = { id: doc.id, ...doc.data() };

    // زيادة المشاهدات
    if (typeof fbIncrementBlogPostViews === "function") {
      fbIncrementBlogPostViews(currentPost.id).catch(console.warn);
    }

    // عرض المقال
    renderBlogPost();

    if (loading) loading.style.display = "none";
    if (article) article.style.display = "block";

    // تحميل البيانات الإضافية
    loadRelatedPosts();
    loadRelatedProducts();

    // تحديث SEO
    updateBlogPostSEO();

  } catch (e) {
    console.error("Error loading blog post:", e);
    if (loading) loading.style.display = "none";
    if (notfound) notfound.style.display = "block";
  }
}

// ===== عرض المقال =====
function renderBlogPost() {
  if (!currentPost) return;

  const post = currentPost;

  // العنوان
  const titleEl = document.getElementById("post-title");
  if (titleEl) titleEl.textContent = post.title || "بدون عنوان";

  // Breadcrumb
  const breadcrumbEl = document.getElementById("breadcrumb-title");
  if (breadcrumbEl) {
    const shortTitle = (post.title || "").length > 40 
      ? post.title.substring(0, 40) + "..." 
      : (post.title || "المقال");
    breadcrumbEl.textContent = shortTitle;
  }

  // التصنيف
  const catEl = document.getElementById("post-category");
  if (catEl) {
    if (post.category) {
      catEl.textContent = post.category;
      catEl.style.display = "inline-block";
    } else {
      catEl.style.display = "none";
    }
  }

  // التاريخ
  const dateEl = document.getElementById("post-date");
  if (dateEl) {
    dateEl.textContent = post.publishedAt?.toDate
      ? post.publishedAt.toDate().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : "-";
  }

  // وقت القراءة
  const readTimeEl = document.getElementById("post-read-time");
  if (readTimeEl) {
    const words = (post.content || "").trim().split(/\s+/).length;
    readTimeEl.textContent = Math.max(1, Math.ceil(words / 200));
  }

  // المشاهدات
  const viewsEl = document.getElementById("post-views");
  if (viewsEl) viewsEl.textContent = (post.views || 0) + 1;

  // صورة الغلاف
  const coverWrap = document.getElementById("post-cover-wrap");
  const coverImg = document.getElementById("post-cover");
  if (post.coverImage && coverWrap && coverImg) {
    coverImg.src = post.coverImage;
    coverImg.alt = post.title || "cover";
    coverWrap.style.display = "block";
  }

  // المحتوى (Markdown بسيط)
  const bodyEl = document.getElementById("post-body");
  if (bodyEl) {
    bodyEl.innerHTML = parseMarkdown(post.content || "");
  }

  // أزرار المشاركة
  updateShareButtons();
}

// ===== Markdown بسيط =====
function parseMarkdown(text) {
  if (!text) return "";

  let html = text;

  // Escape HTML
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Lists
  const lines = html.split("\n");
  let inList = false;
  let listType = null;
  const result = [];

  lines.forEach(line => {
    const trimmed = line.trim();

    // Unordered list
    if (/^- (.+)/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${trimmed.replace(/^- /, "")}</li>`);
    }
    // Ordered list
    else if (/^\d+\. (.+)/.test(trimmed)) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${trimmed.replace(/^\d+\. /, "")}</li>`);
    }
    // Empty line
    else if (trimmed === "") {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      result.push("");
    }
    // Paragraph or existing HTML
    else if (trimmed.startsWith("<") || trimmed === "") {
      result.push(trimmed);
    }
    else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      result.push(`<p>${trimmed}</p>`);
    }
  });

  if (inList) result.push(`</${listType}>`);

  return result.join("\n");
}

// ===== أزرار المشاركة =====
function updateShareButtons() {
  const url = window.location.href;
  const title = encodeURIComponent(currentPost?.title || "مقال من FORSA");

  const wa = document.getElementById("share-whatsapp");
  const fb = document.getElementById("share-facebook");
  const tw = document.getElementById("share-twitter");

  if (wa) wa.href = `https://wa.me/?text=${title}%20${encodeURIComponent(url)}`;
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  if (tw) tw.href = `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(url)}`;
}

// ===== نسخ الرابط =====
function copyPostLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    if (typeof showToast === "function") {
      showToast("✅ تم نسخ الرابط");
    } else {
      alert("✅ تم نسخ الرابط");
    }
  }).catch(() => {
    alert("❌ فشل النسخ");
  });
}

// ===== تحديث SEO =====
function updateBlogPostSEO() {
  if (!currentPost) return;

  const post = currentPost;
  const title = post.title || "مقال | FORSA";
  const description = post.excerpt || "";
  const image = post.coverImage || "https://forsa-store.vercel.app/assets/logo.png";
  const url = window.location.href;

  // Title
  document.title = `${title} | مدونة FORSA`;
  const metaTitle = document.getElementById("meta-title");
  if (metaTitle) metaTitle.setAttribute("content", title);

  const metaDesc = document.getElementById("meta-description");
  if (metaDesc) metaDesc.setAttribute("content", description);

  const metaKeywords = document.getElementById("meta-keywords");
  if (metaKeywords && post.tags) metaKeywords.setAttribute("content", post.tags.join(", "));

  const canonical = document.getElementById("canonical-link");
  if (canonical) canonical.setAttribute("href", url);

  // OG
  const ogUrl = document.getElementById("og-url");
  if (ogUrl) ogUrl.setAttribute("content", url);
  const ogTitle = document.getElementById("og-title");
  if (ogTitle) ogTitle.setAttribute("content", title);
  const ogDesc = document.getElementById("og-description");
  if (ogDesc) ogDesc.setAttribute("content", description);
  const ogImg = document.getElementById("og-image");
  if (ogImg) ogImg.setAttribute("content", image);

  // Twitter
  const twUrl = document.getElementById("twitter-url");
  if (twUrl) twUrl.setAttribute("content", url);
  const twTitle = document.getElementById("twitter-title");
  if (twTitle) twTitle.setAttribute("content", title);
  const twDesc = document.getElementById("twitter-description");
  if (twDesc) twDesc.setAttribute("content", description);
  const twImg = document.getElementById("twitter-image");
  if (twImg) twImg.setAttribute("content", image);

  // Schema.org
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "image": image,
    "datePublished": post.publishedAt?.toDate?.()?.toISOString() || "",
    "dateModified": post.updatedAt?.toDate?.()?.toISOString() || "",
    "author": {
      "@type": "Organization",
      "name": "FORSA"
    },
    "publisher": {
      "@type": "Organization",
      "name": "FORSA",
      "logo": {
        "@type": "ImageObject",
        "url": "https://forsa-store.vercel.app/assets/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  };

  const schemaScript = document.createElement("script");
  schemaScript.type = "application/ld+json";
  schemaScript.textContent = JSON.stringify(schema);
  document.head.appendChild(schemaScript);
}

// ===== تحميل مقالات مشابهة =====
async function loadRelatedPosts() {
  if (!currentPost) return;

  try {
    const snapshot = await firebase.firestore().collection("blog_posts")
      .where("published", "==", true)
      .limit(10)
      .get();

    const allPosts = [];
    snapshot.forEach(doc => {
      const post = { id: doc.id, ...doc.data() };
      if (post.id !== currentPost.id) allPosts.push(post);
    });

    // فضّل نفس التصنيف
    const sameCategory = allPosts.filter(p => p.category === currentPost.category);
    const others = allPosts.filter(p => p.category !== currentPost.category);
    const related = [...sameCategory, ...others].slice(0, 3);

    if (related.length === 0) return;

    const section = document.getElementById("related-posts-section");
    const grid = document.getElementById("related-posts-grid");
    if (!section || !grid) return;

    grid.innerHTML = related.map(post => {
      const date = post.publishedAt?.toDate
        ? post.publishedAt.toDate().toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })
        : "";

      const readTime = Math.max(1, Math.ceil((post.content || "").trim().split(/\s+/).length / 200));

      const coverHtml = post.coverImage
        ? `<img src="${post.coverImage}" alt="${post.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class='blog-placeholder'>📝</div>'" />`
        : `<div class="blog-placeholder">📝</div>`;

      return `
        <article class="blog-card" onclick="goToBlogPost('${post.slug}')">
          <div class="blog-card-img">
            ${coverHtml}
            ${post.category ? `<span class="blog-category-badge">${post.category}</span>` : ""}
          </div>
          <div class="blog-card-body">
            <h3 class="blog-card-title">${post.title}</h3>
            <p class="blog-card-excerpt">${post.excerpt || ""}</p>
            <div class="blog-card-meta">
              <span class="blog-meta-item">📅 ${date}</span>
              <span class="blog-meta-item">⏱️ ${readTime} د</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    section.style.display = "block";

  } catch (e) {
    console.warn("Error loading related posts:", e);
  }
}

// ===== تحميل منتجات ذات صلة =====
async function loadRelatedProducts() {
  if (!currentPost || !currentPost.relatedProducts || currentPost.relatedProducts.length === 0) return;

  try {
    const products = await fbGetProducts();
    if (!products || products.length === 0) return;

    const relatedIds = currentPost.relatedProducts.map(id => String(id));
    const related = products.filter(p => relatedIds.includes(String(p.id)));

    if (related.length === 0) return;

    const section = document.getElementById("related-products-section");
    const carousel = document.getElementById("related-products-carousel");
    if (!section || !carousel) return;

    carousel.innerHTML = related.map(p => {
      const cat = allData?.categories?.find(c => c.id === p.category);
      const isFav = false; // ما نستخدمش المفضلة في صفحة المقال

      return `
        <div class="carousel-item">
          <div class="product-card">
            ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
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
                <button class="add-btn" onclick="addToCart(${p.id}, event)">🛒 أضف للسلة</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    section.style.display = "block";

  } catch (e) {
    console.warn("Error loading related products:", e);
  }
}

// ===== Scroll Related Products =====
function scrollRelatedProducts(dir) {
  const c = document.getElementById("related-products-carousel");
  if (!c) return;
  const amount = c.querySelector(".carousel-item")?.offsetWidth + 20 || 300;
  c.scrollBy({ left: dir * amount * 2, behavior: "smooth" });
}

// ===== التنقل للمقال =====
function goToBlogPost(slug) {
  window.location.href = `blog-post.html?slug=${encodeURIComponent(slug)}`;
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadBlogPost();
});