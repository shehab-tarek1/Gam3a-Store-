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
    console.log('[SW] Received background message ', payload);
    const notificationTitle = payload.notification?.title || "إشعار جديد من متجر الجامعة";
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/icon-192x192.png',
        badge: '/icon-144x144.png',
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

// --- نظام تسريع الموقع المتقدم (Advanced Caching) ---
const STATIC_CACHE = 'gam3a-static-v3'; // للملفات الأساسية
const DYNAMIC_IMAGE_CACHE = 'gam3a-images-v1'; // لصور المنتجات
const MAX_CACHED_IMAGES = 150; // الحد الأقصى للصور في الكاش (لحماية رامات ومساحة الهاتف)

const STATIC_ASSETS =[
    '/',
    '/index.html',
    '/privacy.html',
    '/manifest.json',
    '/icon-144x144.png',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// دالة ذكية لحذف الصور القديمة إذا زادت عن الحد الأقصى
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(() => limitCacheSize(name, size));
            }
        });
    });
};

// 1. التثبيت
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

// 2. التفعيل ومسح الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_IMAGE_CACHE)
                .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 3. معالجة الطلبات (السر الحقيقي للأداء)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = req.url;

    // استثناء طلبات قواعد البيانات، الفيديوهات، والـ API (لا تقم بتخزينها أبداً)
    if (req.method !== 'GET' || 
        url.includes('firestore.googleapis.com') || 
        url.includes('firebaseio.com') || 
        url.includes('google-analytics.com') ||
        url.endsWith('.mp4')) {
        return;
    }

    // --- استراتيجية 1: لصور المنتجات (Cloudinary & Pexels) ---
    // Cache First, Fallback to Network
    if (url.includes('res.cloudinary.com') || url.includes('images.pexels.com') || req.destination === 'image') {
        event.respondWith(
            caches.match(req).then(cachedRes => {
                return cachedRes || fetch(req).then(networkRes => {
                    // التأكد من أن الصورة صالحة (حتى لو كانت Cross-Origin)
                    if (networkRes && (networkRes.status === 200 || networkRes.status === 0)) {
                        const responseClone = networkRes.clone();
                        caches.open(DYNAMIC_IMAGE_CACHE).then(cache => {
                            cache.put(req, responseClone);
                            limitCacheSize(DYNAMIC_IMAGE_CACHE, MAX_CACHED_IMAGES); // تطبيق حد الرامات
                        });
                    }
                    return networkRes;
                });
            })
        );
        return;
    }

    // --- استراتيجية 2: لملفات الموقع الأساسية (HTML) ---
    // Network First, Fallback to Cache (ليحصل المستخدم على أحدث تعديلات برمجية دائماً)
    event.respondWith(
        fetch(req).then(networkRes => {
            if (networkRes && networkRes.status === 200) {
                const responseClone = networkRes.clone();
                caches.open(STATIC_CACHE).then(cache => cache.put(req, responseClone));
            }
            return networkRes;
        }).catch(() => {
            // في حالة انقطاع الإنترنت، جلب الصفحة من الكاش
            return caches.match(req).then(cachedRes => {
                if (cachedRes) return cachedRes;
                if (req.mode === 'navigate') return caches.match('/'); // صفحة الطوارئ
            });
        })
    );
});