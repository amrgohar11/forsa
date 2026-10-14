// ============================================
// ========== FORSA LUXURY ANIMATIONS =========
// ============================================

// ===== 1. Custom Cursor =====
(function initCursor() {
  if (window.innerWidth < 900) return;
  const cursor = document.getElementById("custom-cursor");
  const outline = document.getElementById("custom-cursor-outline");
  if (!cursor || !outline) return;

  let mouseX = 0, mouseY = 0;
  let outlineX = 0, outlineY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + "px";
    cursor.style.top = mouseY + "px";
  });

  function animateOutline() {
    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;
    outline.style.left = outlineX + "px";
    outline.style.top = outlineY + "px";
    requestAnimationFrame(animateOutline);
  }
  animateOutline();

  const selectors = "a, button, .cat-card, .product-card, .fav-btn, .add-btn, .order-now-btn, .icon-btn, .cart-btn, .tab-btn, .carousel-nav, input, select, textarea, .value-card, .stat-box, .contact-card";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(selectors)) {
      cursor.classList.add("hover");
      outline.classList.add("hover");
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(selectors)) {
      cursor.classList.remove("hover");
      outline.classList.remove("hover");
    }
  });
})();

// ===== 2. Scroll Progress Bar =====
(function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (scrollTop / docHeight) * 100 + "%";
  });
})();

// ===== 3. Luxury Loader =====
(function initLoader() {
  const loader = document.getElementById("luxury-loader");
  if (!loader) return;
  window.addEventListener("load", () => setTimeout(() => loader.classList.add("hidden"), 800));
  setTimeout(() => loader.classList.add("hidden"), 4000);
})();

// ===== 4. Scroll Reveal (Fade Up) =====
(function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), index * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  function attach() {
    document.querySelectorAll(".fade-up:not(.visible)").forEach(el => observer.observe(el));
  }
  attach();
  new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
})();

// ===== 5. 3D Tilt Effect =====
(function initTilt() {
  if (window.innerWidth < 900) return;

  function applyTilt(card) {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -5;
      const rotY = ((x - cx) / cx) * 5;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => card.style.transform = "");
  }

  function attach() {
    document.querySelectorAll(".product-card").forEach(card => {
      if (!card.dataset.tilt) {
        card.dataset.tilt = "true";
        applyTilt(card);
      }
    });
  }
  attach();
  new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
})();

// ===== 6. Glow on Hover =====
(function initGlow() {
  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".glow-on-hover").forEach(card => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", (e.clientX - rect.left) + "px");
      card.style.setProperty("--mouse-y", (e.clientY - rect.top) + "px");
    });
  });
})();

// ===== 7. Magnetic Buttons =====
(function initMagnetic() {
  if (window.innerWidth < 900) return;
  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".magnetic-btn").forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const btnX = rect.left + rect.width / 2;
      const btnY = rect.top + rect.height / 2;
      const distX = e.clientX - btnX;
      const distY = e.clientY - btnY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      if (distance < 100) {
        const s = (100 - distance) / 100;
        btn.style.transform = `translate(${distX * s * 0.3}px, ${distY * s * 0.3}px)`;
      } else {
        btn.style.transform = "";
      }
    });
  });
})();

// ===== 8. Flying Product to Cart =====
window.flyToCart = function(sourceEl) {
  const cartIcon = document.querySelector(".cart-btn");
  if (!cartIcon || !sourceEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const cartRect = cartIcon.getBoundingClientRect();

  const clone = sourceEl.cloneNode(true);
  clone.style.cssText = `
    position: fixed;
    top: ${sourceRect.top}px;
    left: ${sourceRect.left}px;
    width: ${sourceRect.width}px;
    height: ${sourceRect.height}px;
    border-radius: 50%;
    z-index: 9999;
    pointer-events: none;
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 0 0 40px rgba(184, 242, 58, 0.8);
    object-fit: cover;
  `;
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    clone.style.top = cartRect.top + "px";
    clone.style.left = (cartRect.left + cartRect.width / 2 - 20) + "px";
    clone.style.width = "40px";
    clone.style.height = "40px";
    clone.style.opacity = "0.3";
    clone.style.transform = "scale(0.3) rotate(360deg)";
  });

  setTimeout(() => {
    clone.remove();
    cartIcon.style.transform = "scale(1.3)";
    setTimeout(() => cartIcon.style.transform = "", 200);
  }, 800);
};

// ===== 9. Heart Burst (للمفضلة) =====
window.heartBurst = function(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 8; i++) {
    const p = document.createElement("div");
    p.textContent = "❤️";
    p.style.cssText = `
      position: fixed;
      top: ${cy}px;
      left: ${cx}px;
      font-size: 16px;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;
    document.body.appendChild(p);

    const angle = (Math.PI * 2 * i) / 8;
    const distance = 60 + Math.random() * 40;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    requestAnimationFrame(() => {
      p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
      p.style.opacity = "0";
    });
    setTimeout(() => p.remove(), 700);
  }
};

// ===== 10. Count Up Numbers =====
(function initCountUp() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        if (isNaN(target)) return;

        let current = 0;
        const steps = 75;
        const increment = target / steps;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            el.textContent = "+" + target;
            clearInterval(timer);
          } else {
            el.textContent = "+" + Math.floor(current);
          }
        }, 20);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll("[data-count]").forEach(el => observer.observe(el));
})();

// ===== 11. Parallax Effect =====
(function initParallax() {
  const els = document.querySelectorAll(".parallax");
  if (els.length === 0) return;
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    els.forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.5;
      el.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });
})();

// ===== 12. Staggered Animations =====
(function initStagger() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add("visible"), index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".stagger-item").forEach(el => observer.observe(el));
})();

// ===== 13. Text Reveal =====
(function initTextReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll(".reveal-text").forEach(el => observer.observe(el));
})();

// ===== 14. Hero Logo Reveal =====
(function initHeroReveal() {
  const heroLogo = document.querySelector(".hero-logo");
  if (!heroLogo) return;
  heroLogo.style.opacity = "0";
  heroLogo.style.transform = "scale(0.8)";
  setTimeout(() => {
    heroLogo.style.transition = "all 1.5s cubic-bezier(0.16, 1, 0.3, 1)";
    heroLogo.style.opacity = "1";
    heroLogo.style.transform = "scale(1)";
  }, 1000);
})();

// ===== 15. Hero Title Reveal =====
(function initHeroTitleReveal() {
  const title = document.querySelector(".hero-text h1");
  if (!title) return;
  title.style.opacity = "0";
  title.style.transform = "translateY(30px)";
  setTimeout(() => {
    title.style.transition = "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
    title.style.opacity = "1";
    title.style.transform = "translateY(0)";
  }, 1300);
})();