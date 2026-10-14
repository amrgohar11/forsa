// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
  apiKey: "AIzaSyDsu345qPBINcVzRW0efglVgWU4Ujfe1bI",
  authDomain: "forsa-25081.firebaseapp.com",
  projectId: "forsa-25081",
  storageBucket: "forsa-25081.firebasestorage.app",
  messagingSenderId: "1092506195041",
  appId: "1:1092506195041:web:1f4f413c9db0e1a2454620"
};

// ========== ADMIN SETTINGS ==========
const ADMIN_PHONE = "201556687455";
const ADMIN_API_KEY = "6976391";

// ========== INITIALIZE FIREBASE ==========
let db = null;
let storage = null;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK not loaded");
    return false;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  if (firebase.storage) {
    storage = firebase.storage();
  }
  return true;
}

// ========== FIRESTORE HELPERS ==========

// جلب كل المنتجات
async function fbGetProducts() {
  if (!db) return null;
  try {
    const snapshot = await db.collection("products").get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (e) {
    console.error("Error getting products:", e);
    return null;
  }
}

// جلب كل الأقسام
async function fbGetCategories() {
  if (!db) return null;
  try {
    const snapshot = await db.collection("categories").get();
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return categories;
  } catch (e) {
    console.error("Error getting categories:", e);
    return null;
  }
}

// إضافة منتج
async function fbAddProduct(product) {
  if (!db) return null;
  try {
    const docRef = await db.collection("products").doc(product.id.toString()).set(product);
    return docRef.id;
  } catch (e) {
    console.error("Error adding product:", e);
    return null;
  }
}

// تعديل منتج
async function fbUpdateProduct(id, data) {
  if (!db) return false;
  try {
    await db.collection("products").doc(id.toString()).update(data);
    return true;
  } catch (e) {
    console.error("Error updating product:", e);
    return false;
  }
}

// حذف منتج
async function fbDeleteProduct(id) {
  if (!db) return false;
  try {
    await db.collection("products").doc(id.toString()).delete();
    return true;
  } catch (e) {
    console.error("Error deleting product:", e);
    return false;
  }
}

// إضافة قسم
async function fbAddCategory(id, category) {
  if (!db) return null;
  try {
    await db.collection("categories").doc(id).set(category);
    return id;
  } catch (e) {
    console.error("Error adding category:", e);
    return null;
  }
}

// رفع كل البيانات من localStorage لـ Firebase
async function fbUploadAll(allData) {
  if (!db) return false;
  try {
    for (const cat of allData.categories) {
      await db.collection("categories").doc(cat.id).set({
        name: cat.name,
        icon: cat.icon
      });
    }
    for (const product of allData.products) {
      await db.collection("products").doc(product.id.toString()).set(product);
    }
    return true;
  } catch (e) {
    console.error("Error uploading data:", e);
    return false;
  }
}

// ========== ORDERS HELPERS ==========

// إضافة طلب جديد
async function fbAddOrder(order) {
  if (!db) return null;
  try {
    const docRef = await db.collection("orders").add(order);
    return docRef.id;
  } catch (e) {
    console.error("Error adding order:", e);
    return null;
  }
}

// جلب كل الطلبات (للأدمن)
async function fbGetOrders() {
  if (!db) return null;
  try {
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  } catch (e) {
    console.error("Error getting orders:", e);
    return null;
  }
}

// جلب طلبات عميل معين (برقم الموبايل)
async function fbGetOrdersByPhone(phone) {
  if (!db) return null;
  try {
    const snapshot = await db.collection("orders").get();
    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.phone === phone) {
        orders.push({ id: doc.id, ...data });
      }
    });
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || 0;
      const dateB = b.createdAt?.toDate?.() || 0;
      return dateB - dateA;
    });
    return orders;
  } catch (e) {
    console.error("Error getting orders by phone:", e);
    return null;
  }
}

// تعديل حالة الطلب
async function fbUpdateOrderStatus(id, status) {
  if (!db) return false;
  try {
    await db.collection("orders").doc(id).update({
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Error updating order:", e);
    return false;
  }
}

// حذف طلب
async function fbDeleteOrder(id) {
  if (!db) return false;
  try {
    await db.collection("orders").doc(id).delete();
    return true;
  } catch (e) {
    console.error("Error deleting order:", e);
    return false;
  }
}

// ========== REVIEWS HELPERS ==========

// إضافة تقييم جديد
async function fbAddReview(review) {
  if (!db) return null;
  try {
    const docRef = await db.collection("reviews").add(review);
    return docRef.id;
  } catch (e) {
    console.error("Error adding review:", e);
    return null;
  }
}

// جلب تقييمات منتج معين
async function fbGetReviewsByProduct(productId) {
  if (!db) return null;
  try {
    const snapshot = await db.collection("reviews")
      .where("productId", "==", productId)
      .get();
    const reviews = [];
    snapshot.forEach(doc => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || 0;
      const dateB = b.createdAt?.toDate?.() || 0;
      return dateB - dateA;
    });
    return reviews;
  } catch (e) {
    console.error("Error getting reviews:", e);
    return null;
  }
}

// حذف تقييم (للأدمن)
async function fbDeleteReview(id) {
  if (!db) return false;
  try {
    await db.collection("reviews").doc(id).delete();
    return true;
  } catch (e) {
    console.error("Error deleting review:", e);
    return false;
  }
}

// ========== SEND WHATSAPP NOTIFICATION TO ADMIN ==========
async function sendAdminNotification(order) {
  if (!ADMIN_API_KEY || ADMIN_API_KEY === "ضع_API_KEY_هنا") {
    console.warn("⚠️ Admin API Key مش موجود - مش هيتم إرسال الإشعار");
    return;
  }

  try {
    const itemsText = (order.items || [])
      .map(item => `• ${item.name} × ${item.qty} = ${item.price * item.qty} ج`)
      .join("\n");

    const message =
`🛒 *طلب جديد على FORSA*

👤 *الاسم:* ${order.name}
📞 *الموبايل:* ${order.phone}
📍 *العنوان:* ${order.address} - ${order.city}
💳 *الدفع:* ${order.paymentMethod}

*المنتجات:*
${itemsText}

💰 *الإجمالي:* ${order.subtotal} ج
🚚 *الشحن:* ${order.shipping} ج
🧾 *الإجمالي النهائي:* ${order.total} ج
${order.notes ? "\n📝 *ملاحظات:* " + order.notes : ""}

🕐 ${new Date().toLocaleString("ar-EG")}`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_PHONE}&text=${encodeURIComponent(message)}&apikey=${ADMIN_API_KEY}`;

    await fetch(url, { mode: "no-cors" });

    console.log("✅ تم إرسال الإشعار على واتساب");
  } catch (e) {
    console.error("❌ فشل إرسال الإشعار:", e);
  }
}