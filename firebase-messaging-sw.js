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
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || "إشعار جديد من متجر الجامعة";
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/icon-192x192.png',
        badge: '/icon-144x144.png',
        // توجيه المستخدم للموقع عند الضغط على الإشعار
        data: { click_action: 'https://gam3a-store.vercel.app/' } 
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع الضغط على الإشعار لفتح الموقع
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.click_action || '/')
    );
});

// --- نظام تسريع الموقع (Caching) ---
// قم بتغيير رقم الإصدار هنا (مثلاً v2) كلما قمت بتحديث كبير في ملفات HTML/CSS
const CACHE_NAME = 'gam3a-store-cache-v1'; 
const STATIC_ASSETS =[
    '/',
    '/index.html',
    '/manifest.json', // مهم جداً حفظ المانيفست في الكاش
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// 1. حفظ الملفات الأساسية عند التثبيت
self.addEventListener('install', (event) => {
    self.skipWaiting(); // يجبر المتصفح على تفعيل النسخة الجديدة فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

// 2. مسح الكاش القديم عند تفعيل إصدار جديد (مهم جداً لكي لا يعلق الموقع على نسخة قديمة)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // السيطرة على كل الصفحات المفتوحة وتطبيق التحديث
});

// 3. جلب الملفات من الكاش لتسريع الموقع، وتحديثها في الخلفية
self.addEventListener('fetch', (event) => {
    // استثناء طلبات قاعدة البيانات، و إحصائيات جوجل، وأي طلب غير GET
    if (event.request.method !== 'GET' || 
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('google-analytics.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // التأكد من أن الاستجابة صالحة قبل تخزينها
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // في حالة انقطاع الإنترنت، نعتمد كلياً على الكاش
                return cachedResponse;
            });

            // نعرض الكاش فوراً (إن وُجد) لسرعة العرض، بينما يتم جلب الأحدث في الخلفية
            return cachedResponse || fetchPromise; 
        })
    );
});