// استدعاء مكتبات فايربيز للعمل في الخلفية
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// إعدادات مشروعك
firebase.initializeApp({
    apiKey: "AIzaSyD4sIkw8Pj_yDc0TFEhKoWu9Y0VI5PHoco",
    authDomain: "marketing-e9fdf.firebaseapp.com",
    projectId: "marketing-e9fdf",
    storageBucket: "marketing-e9fdf.firebasestorage.app",
    messagingSenderId: "802495803513",
    appId: "1:802495803513:web:ea214549ac16d110a164a8"
});

const messaging = firebase.messaging();

// استقبال الإشعارات والموقع مغلق (في الخلفية)
messaging.onBackgroundMessage(function(payload) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png',
        badge: '/icon-144x144.png',
        click_action: 'https://gam3a-store.vercel.app/'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- نظام تسريع الموقع (Caching) ---
const CACHE_NAME = 'gam3a-store-cache-v1';
const STATIC_ASSETS =[
    '/',
    '/index.html',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// حفظ الملفات الأساسية عند التثبيت
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

// جلب الملفات من الكاش لتسريع الموقع، وتحديثها في الخلفية
self.addEventListener('fetch', (event) => {
    // استثناء طلبات قاعدة البيانات (عشان المنتجات تتحدث لحظياً)
    if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => cachedResponse); // لو النت فاصل يفتح من الكاش
            return cachedResponse || fetchPromise;
        })
    );
});