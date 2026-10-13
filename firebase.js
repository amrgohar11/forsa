// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
  apiKey: "AIzaSyDsu345qPBINcVzRW0efglVgWU4Ujfe1bI",
  authDomain: "forsa-25081.firebaseapp.com",
  projectId: "forsa-25081",
  storageBucket: "forsa-25081.firebasestorage.app",
  messagingSenderId: "1092506195041",
  appId: "1:1092506195041:web:1f4f413c9db0e1a2454620"
};

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
    const snapshot = await db.collection("orders")
      .where("phone", "==", phone)
      .orderBy("createdAt", "desc")
      .get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
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