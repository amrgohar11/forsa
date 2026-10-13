// ============================================
// ========== LUXURY ANIMATIONS ===============
// ============================================

// ===== Custom Cursor =====
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

  const interactiveSelectors = "a, button, .cat-card, .product-card, .fav-btn, .add-btn, .order-now-btn, .icon-btn, .cart-btn, .tab-btn, .carousel-nav, input, select, textarea";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.add("hover");
      outline.classList.add("hover");
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.remove("hover");
      outline.classList.remove("hover");
    }
  });
})();

// ===== Scroll Progress Bar =====
(function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    bar.style.width = progress + "%";
  });
})();

// ===== Luxury Loader =====
(function initLoader() {
  const loader = document.getElementById("luxury-loader");
  if (!loader) return;

  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 800);
  });

  setTimeout(() => {
    loader.classList.add("hidden");
  }, 4000);
})();

// ===== 3D Tilt Effect =====
(function initTilt() {
  if (window.innerWidth < 900) return;

  function applyTilt(card) {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  }

  function attachTiltToCards() {
    document.querySelectorAll(".product-card").forEach(card => {
      if (!card.dataset.tiltAttached) {
        card.dataset.tiltAttached = "true";
        applyTilt(card);
      }
    });
  }

  attachTiltToCards();

  const observer = new MutationObserver(attachTiltToCards);
  observer.observe(document.body, { childList: true, subtree: true });
})();

// ===== Glow on Hover =====
(function initGlow() {
  document.addEventListener("mousemove", (e) => {
    const cards = document.querySelectorAll(".glow-on-hover");
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", x + "px");
      card.style.setProperty("--mouse-y", y + "px");
    });
  });
})();

// ===== Magnetic Buttons =====
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
        const strength = (100 - distance) / 100;
        btn.style.transform = `translate(${distX * strength * 0.3}px, ${distY * strength * 0.3}px)`;
      } else {
        btn.style.transform = "";
      }
    });
  });
})();

// ===== Parallax Effect =====
(function initParallax() {
  const parallaxElements = document.querySelectorAll(".parallax");
  if (parallaxElements.length === 0) return;

  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.5;
      el.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });
})();

// ===== Staggered Animations =====
(function initStagger() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".stagger-item").forEach(el => observer.observe(el));
})();

// ===== Text Reveal =====
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