// ============================================
// FORSA - PWA Registration
// ============================================

// ===== تسجيل Service Worker =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        console.log("✅ PWA: Service Worker registered", registration.scope);
      })
      .catch(error => {
        console.warn("⚠️ PWA: Service Worker failed", error);
      });
  });
}

// ===== Install Prompt =====
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // منع الـ default
  e.preventDefault();
  deferredPrompt = e;
  console.log("💡 PWA: Install prompt available");

  // اعرض زر التثبيت
  showInstallButton();
});

// ===== زر التثبيت =====
function showInstallButton() {
  // شيل الزر القديم لو موجود
  const existing = document.getElementById("pwa-install-btn");
  if (existing) existing.remove();

  const btn = document.createElement("button");
  btn.id = "pwa-install-btn";
  btn.className = "pwa-install-btn";
  btn.innerHTML = "📱 ثبّت التطبيق";
  btn.onclick = installPWA;

  // ضيفه للـ body
  document.body.appendChild(btn);

  // اظهره بعد 5 ثواني
  setTimeout(() => btn.classList.add("show"), 5000);
}

// ===== التثبيت =====
async function installPWA() {
  if (!deferredPrompt) {
    console.warn("⚠️ Install prompt not available");
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("✅ PWA: User accepted install");
    const btn = document.getElementById("pwa-install-btn");
    if (btn) btn.remove();
  }

  deferredPrompt = null;
}

// ===== رصد التثبيت =====
window.addEventListener("appinstalled", () => {
  console.log("✅ PWA: App installed");
  const btn = document.getElementById("pwa-install-btn");
  if (btn) btn.remove();
});

// ===== كشف standalone mode =====
if (window.matchMedia("(display-mode: standalone)").matches) {
  console.log("📱 PWA: Running in standalone mode");
  document.body.classList.add("pwa-standalone");
}

// ===== إخفاء زر التثبيت لو العميل ثبّت بالفعل =====
if (window.navigator.standalone === true) {
  document.body.classList.add("pwa-standalone");
}