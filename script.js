import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, onSnapshot, addDoc, doc, getDoc, setDoc, updateDoc, increment, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyD4sIkw8Pj_yDc0TFEhKoWu9Y0VI5PHoco",
    authDomain: "marketing-e9fdf.firebaseapp.com",
    projectId: "marketing-e9fdf",
    storageBucket: "marketing-e9fdf.firebasestorage.app",
    messagingSenderId: "802495803513",
    appId: "1:802495803513:web:ea214549ac16d110a164a8",
    measurementId: "G-4Z0FKEX06J"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

const rtdb = getDatabase(app); 

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => { console.log('تم تسجيل Service Worker بنجاح'); })
        .catch((error) => { console.error('فشل تسجيل Service Worker:', error); });
    });
}

window.products = [];
window.admins = {}; 

let initialCart = [];
try { initialCart = JSON.parse(localStorage.getItem('am_cart')) || []; } catch(e) {}
window.cart = initialCart;

let storedWishlist = JSON.parse(localStorage.getItem('am_wishlist')) || [];
window.wishlist = storedWishlist.map(String);

window.SELLER_PHONE = "201206244875";
window.historyStack = ['home'];
window.currentViewedProductId = null; 
window.profileProducts = [];
window.profileIndex = 0;
window.PROFILE_BATCH_SIZE = 8; 
window.sliderProducts = [];
window.sliderIndex = 0;
window.catProducts = [];
window.catIndex = 0;
window.CAT_BATCH_SIZE = 8;

window.toggleTheme = function() {
    const root = document.documentElement;
    const icon = document.getElementById('theme-icon');
    
    document.body.style.transition = 'none';
    
    root.classList.toggle('dark-theme');
    if (root.classList.contains('dark-theme')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark-theme');
    setTimeout(() => { document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun'); }, 100);
}

window.updateSEO = function(title, desc) {
    document.title = title ? `${title} | Gam3a Store` : "gam3a store | متجر الجامعة";
    let metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) metaDesc.setAttribute("content", desc ? desc : "تسوق أحدث المنتجات بأفضل الأسعار لطلاب الجامعة والمحافظات.");
    let canonical = document.querySelector('link[rel="canonical"]');
    if(canonical) canonical.setAttribute("href", window.location.href);
}

window.optimizeImage = function(url, width, isLightbox = false) {
    if (!url || typeof url !== 'string') return '';
    let cropParams = '';
    let cleanUrl = url;
    if (url.includes('#crop=')) {
        const parts = url.split('#crop=');
        cleanUrl = parts[0];
        cropParams = 'c_crop,' + parts[1] + '/';
    }
    if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/upload/')) {
        let parts = cleanUrl.split('/upload/');
        let rawEnd = parts[1];
        let versionMatch = rawEnd.match(/(v\d+\/.*)/);
        if (versionMatch) {
            rawEnd = versionMatch[1]; 
        } else {
            let splitSlash = rawEnd.split('/');
            rawEnd = splitSlash[splitSlash.length - 1]; 
        }
        let baseUrl = parts[0] + '/upload/';
        if (isLightbox) {
            return baseUrl + `c_limit,w_${width},q_auto,f_auto/` + rawEnd;
        } else {
            if (cropParams) {
                return baseUrl + cropParams + `c_limit,w_${width},q_auto,f_auto/` + rawEnd;
            } else {
                return baseUrl + `c_limit,w_${width},q_auto,f_auto/` + rawEnd;
            }
        }
    }
    if (cleanUrl.includes('images.pexels.com')) {
        return cleanUrl.replace(/w=\d+/, `w=${width}`);
    }
    return cleanUrl;
}

window.getColorCode = function(color) {
    const colorMap = {
        'أحمر': '#e74c3c', 'احمر': '#e74c3c', 'ازرق': '#3498db', 'أزرق': '#3498db', 'اخضر': '#2ecc71', 'أخضر': '#2ecc71',
        'اصفر': '#f1c40f', 'أصفر': '#f1c40f', 'اسود': '#2d3436', 'أسود': '#2d3436', 'ابيض': '#ffffff', 'أبيض': '#ffffff', 
        'رمادي': '#95a5a6', 'رصاصي': '#95a5a6', 'بني': '#8d6e63', 'برتقالي': '#e67e22', 'وردي': '#fd79a8', 'بمبي': '#fd79a8',
        'بنفسجي': '#9b59b6', 'موف': '#9b59b6', 'كحلي': '#192a56', 'نبيتي': '#800000', 'بيج': '#f5f5dc', 'ذهبي': '#f1c40f', 
        'فضي': '#bdc3c7', 'زيتي': '#556b2f', 'جملي': '#c19a6b', 'هافان': '#c19a6b', 'لبني': '#87ceeb', 'تركواز': '#40e0d0',
        'مسطردة': '#e1b12c', 'كشمير': '#d18b9b', 'وردي (بينك)': '#fd79a8', 'فوشيا': '#ff00ff', 
        'متعدد الألوان': 'linear-gradient(45deg, red, blue, green, yellow)'
    };
    if(!color) return '#ccc';
    if(color.startsWith('#')) return color;
    const isEnglish = /^[a-zA-Z]+$/.test(color);
    if(isEnglish) return color;
    return colorMap[color.trim()] || '#ccc'; 
}

let isInitialLoad = true;
let productsLoaded = false;
let adminsLoaded = false;

window.safeReplaceState = function(pageId, url = "/") {
    try { window.history.replaceState({ page: pageId }, "", url); } 
    catch(e) { try { window.history.replaceState({ page: pageId }, ""); } catch(err) {} }
}

window.safePushState = function(pageId, url = "/") {
    try { window.history.pushState({ page: pageId }, "", url); } 
    catch(e) { try { window.history.pushState({ page: pageId }, ""); } catch(err) {} }
}

function checkAndInit() {
    if(productsLoaded && adminsLoaded && isInitialLoad) {
        isInitialLoad = false;
        const loader = document.getElementById('global-loader');
        if(loader) loader.style.display = 'none';

        const path = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);

        let sharedCode = urlParams.get('p');
        let marketerCode = urlParams.get('m');

        if (sharedCode) {
            const targetProduct = window.products.find(x => String(x.shortCode) === String(sharedCode));
            if (targetProduct) {
                window.historyStack = ['home', 'details'];
                window.safeReplaceState('home', "/"); 
                window.safePushState('details', `/p/${sharedCode}`); 
                try {
                    window.openProduct(targetProduct.id, false);
                    return;
                } catch(e) { console.error(e); }
            }
        } else if (marketerCode) {
            let targetAdminId = null;
            for (const [uid, adminData] of Object.entries(window.admins)) {
                if (String(adminData.shortCode) === String(marketerCode)) {
                    targetAdminId = uid;
                    break;
                }
            }
            if (targetAdminId) {
                window.historyStack = ['home', 'profile'];
                window.safeReplaceState('home', "/"); 
                window.safePushState('profile', `/m/${marketerCode}`); 
                try {
                    window.openProfile(targetAdminId, false);
                    return;
                } catch(e) { console.error(e); }
            }
        }
        window.resetAndNavigate('home');
    } else if (!isInitialLoad) {
        const currentPage = window.historyStack[window.historyStack.length - 1];
        if (currentPage === 'home') {
            const slider = document.getElementById('latest-products-slider');
            if(slider) slider.innerHTML = ''; 
            window.renderHomeSlider();
        } else if (currentPage === 'category') {
            const titleEl = document.getElementById('category-title');
            if (titleEl) {
                let catName = titleEl.innerText;
                if(catName === 'عروض خاصة') catName = 'عروض';
                else catName = catName.replace('قسم ', '');
                window.openCategory(catName, false); 
            }
        } else if (currentPage === 'details' && window.currentViewedProductId) {
            try { window.openProduct(window.currentViewedProductId, false); } catch(e){}
        }
    }
}

const activeProductsQuery = query(
    collection(db, "ghosn_products"), 
    limit(200)
);

onSnapshot(activeProductsQuery, (querySnapshot) => {
    window.products = querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
    productsLoaded = true;
    checkAndInit();

    if (!isInitialLoad) {
        const currentPage = window.historyStack[window.historyStack.length - 1];
        if (currentPage === 'home') window.renderHomeSlider();
        if (currentPage === 'category') {
            const container = document.getElementById('category-products');
            if(container) container.innerHTML = ''; 
            window.catIndex = 0;
            window.loadMoreCategoryProducts(); 
        }
    }
}, (error) => console.error("خطأ في المنتجات:", error));

onSnapshot(collection(db, "gam3a_admins"), (querySnapshot) => {
    window.admins = {};
    querySnapshot.docs.forEach(doc => {
        window.admins[doc.id] = doc.data();
    });
    adminsLoaded = true;
    checkAndInit();
}, (error) => console.error("خطأ في المسوقين:", error));

window.showToast = function(message, color = "#2ecc71") {
    const toast = document.getElementById('toast');
    let iconClass = "fa-check";
    if(color === "#e74c3c") iconClass = "fa-trash";
    if(color === "#0984e3") iconClass = "fa-link";

    toast.innerHTML = `<div style="background: ${color}25; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; border-radius: 50%; flex-shrink: 0;"><i class="fa-solid ${iconClass}" style="color: ${color}; font-size: 0.75rem;"></i></div><span style="font-weight: 600; letter-spacing: 0.3px;">${message}</span>`;

    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

window.resetAndNavigate = function(pageId) {
    window.historyStack = [pageId];
    window.safeReplaceState(pageId, "/");
    window.navigateUI(pageId);
}

window.navigate = function(pageId, pushToHistory = true, url = "/") {
    if(pushToHistory && window.historyStack[window.historyStack.length - 1] !== pageId) {
        window.historyStack.push(pageId);
        window.safePushState(pageId, url);
    }
    window.navigateUI(pageId);
}

window.scrollPositions = {};

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.navigateUI = function(pageId, isBack = false) {
    if(pageId === 'home') window.updateSEO('', '');

    const pages = ['home', 'category', 'details', 'cart', 'profile', 'wishlist-page'];

    let currentVisible = pages.find(p => document.getElementById(p) && !document.getElementById(p).classList.contains('hidden'));
    if (currentVisible) {
        window.scrollPositions[currentVisible] = window.scrollY || document.documentElement.scrollTop;
    }

    const updateDOM = () => {
        pages.forEach(p => {
            const el = document.getElementById(p);
            if(el) el.classList.add('hidden');
        });

        const targetPage = document.getElementById(pageId);
        if(targetPage) targetPage.classList.remove('hidden');

        const bgVideo = document.getElementById('main-bg-video');
        const bgImg = document.getElementById('fallback-poster-img');

        if (bgVideo && bgImg) {
            if (pageId !== 'home') {
                bgVideo.style.display = 'none'; 
                bgImg.style.display = 'block'; 
                bgVideo.pause(); 
            } else {
                bgImg.style.display = 'none';
                bgVideo.style.display = 'block';
                let playPromise = bgVideo.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {});
                }
            }
        }

        const footer = document.getElementById('main-footer');
        if(footer) {
            if(pageId === 'home') {
                footer.style.display = 'block';
                footer.classList.remove('hidden');
            } else {
                footer.style.display = 'none';
            }
        }

        if(pageId === 'home') window.renderHomeSlider();
        if(pageId === 'cart') window.renderCart();

        if (pageId === 'home' || pageId === 'category') {
            const detailsContent = document.getElementById('product-details-content');
            if (detailsContent) detailsContent.innerHTML = ''; 
        }

        if (pageId === 'details' && window.currentViewedProductId) {
            const detailsContent = document.getElementById('product-details-content');
            if (detailsContent && detailsContent.innerHTML.trim() === '') {
                window.openProduct(window.currentViewedProductId, false);
            }
        }

        if (isBack && window.scrollPositions[pageId] !== undefined) {
            window.scrollTo(0, window.scrollPositions[pageId]);
        } else {
            window.scrollTo(0, 0);
        }
    };

    if (document.startViewTransition) {
        document.startViewTransition(() => updateDOM());
    } else {
        updateDOM();
    }
}

window.goBackSafe = function() {
    if (window.historyStack.length > 1) {
        window.history.back(); 
    } else {
        window.resetAndNavigate('home');
    }
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        if (window.historyStack.length > 1) window.historyStack.pop();
        window.navigateUI(e.state.page, true);
        if(e.state.page === 'home') window.safeReplaceState('home', "/");
    } else {
        window.navigateUI('home', true);
        window.safeReplaceState('home', "/");
    }
});

window.shareProduct = async function(event, id) {
    if(event) event.stopPropagation();
    const p = window.products.find(x => String(x.id) === String(id));
    if(!p) return;

    const domain = window.location.origin;
    const shareUrl = `${domain}/p/${p.shortCode}`;

    try {
        if (navigator.share) {
            await navigator.share({ url: shareUrl });
        } else {
            throw new Error("Share API not supported");
        }
    } catch (err) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            window.showToast("تم نسخ رابط المنتج بنجاح", "#0984e3"); 
        } catch(e) {
            prompt("تفضل بنسخ الرابط التالي:", shareUrl);
        }
    }
}

window.shareProfile = async function(adminId) {
    const admin = window.admins[adminId];
    if(!admin) return;

    const domain = window.location.origin;
    const shareUrl = `${domain}/m/${admin.shortCode}`;

    try {
        if (navigator.share) {
            await navigator.share({ url: shareUrl });
        } else {
            throw new Error("Share API not supported");
        }
    } catch (err) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            window.showToast("تم نسخ رابط البروفايل بنجاح", "#0984e3");
        } catch(e) {
             prompt("تفضل بنسخ الرابط التالي:", shareUrl);
        }
    }
}

window.updateCartBadge = function() { 
    const badge = document.getElementById('cart-count-badge');
    if(badge) badge.innerText = window.cart.length; 
}

window.toggleWishlist = function(event, id, fromDetails = false) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const icon = event ? event.currentTarget : null;
    const strId = String(id);
    const index = window.wishlist.indexOf(strId);
    
    if (index === -1) {
        window.wishlist.push(strId);
        if(icon) icon.classList.add(fromDetails ? 'active-heart' : 'active');
        window.showToast("تمت الإضافة للمفضلة", "#e74c3c");
    } else {
        window.wishlist.splice(index, 1);
        if(icon) icon.classList.remove(fromDetails ? 'active-heart' : 'active');
        window.showToast("تم الحذف من المفضلة", "#636e72");
        
        if (window.historyStack[window.historyStack.length - 1] === 'wishlist-page') {
            window.renderWishlist();
        }
    }
    localStorage.setItem('am_wishlist', JSON.stringify(window.wishlist));
    
    if (!fromDetails && window.currentViewedProductId === strId) {
        const wishBtn = document.getElementById('details-wishlist-btn');
        if(wishBtn) {
            if(window.wishlist.includes(strId)) wishBtn.classList.add('active-heart');
            else wishBtn.classList.remove('active-heart');
        }
    }
}

window.openWishlistPage = function() {
    window.navigate('wishlist-page');
    window.renderWishlist();
}

window.renderWishlist = function() {
    const container = document.getElementById('wishlist-products');
    const items = window.products.filter(p => window.wishlist.includes(String(p.id)));
    
    if (items.length === 0) {
        container.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:0.9rem; color:var(--text-muted); margin-top:20px;">المفضلة فارغة حالياً.</p>';
    } else {
        container.innerHTML = items.map(p => window.generateProductCardHTML(p)).join('');
    }
}

window.getOrderedColors = function(p) {
    let orderedColors = [];
    if (p.images && p.imageColorsMapping) {
        p.images.forEach(imgUrl => {
            let color = p.imageColorsMapping[imgUrl];
            if (color && p.colors.includes(color) && !orderedColors.includes(color)) {
                orderedColors.push(color);
            }
        });
    }
    if (p.colors) {
        p.colors.forEach(c => {
            if (!orderedColors.includes(c)) {
                orderedColors.push(c);
            }
        });
    }
    return orderedColors;
}

window.getCategoryIcon = function(category) {
    if (!category) return 'fa-tag';
    const cat = category.trim();
    if (cat.includes('رواية') || cat.includes('روايات') || cat.includes('كتاب') || cat.includes('كتب') || cat.includes('قصص') || cat.includes('دراسات')) return 'fa-book-open';
    if (cat.includes('مطبخ') || cat.includes('أدوات منزلية') || cat.includes('منزلية') || cat.includes('حلل') || cat.includes('معالق') || cat.includes('شوك') || cat.includes('أطباق')) return 'fa-utensils';
    if (cat.includes('أحذية') || cat.includes('جزم') || cat.includes('كوتش') || cat.includes('شوز')) return 'fa-shoe-prints';
    if (cat.includes('برفان') || cat.includes('عطور') || cat.includes('عطر')) return 'fa-spray-can';
    if (cat.includes('اكسسور') || cat.includes('إكسسوار') || cat.includes('ساعة') || cat.includes('نظارة')) return 'fa-gem';
    if (cat.includes('ملابس') || cat.includes('تيشيرت') || cat.includes('بنطلون') || cat.includes('قميص') || cat.includes('جاكيت') || cat.includes('بلوفر') || cat.includes('هودي')) return 'fa-shirt';
    if (cat.includes('عناية') || cat.includes('شخصية') || cat.includes('شاور') || cat.includes('صابون')) return 'fa-soap';
    if (cat.includes('تجميل') || cat.includes('مكياج') || cat.includes('ميك اب') || cat.includes('روج')) return 'fa-wand-magic-sparkles';
    if (cat.includes('دراسة') || cat.includes('ادوات دراسية') || cat.includes('مكتب') || cat.includes('قلم') || cat.includes('كشكول')) return 'fa-pencil';
    if (cat.includes('غذاء') || cat.includes('بيتي بايتس') || cat.includes('أكل') || cat.includes('طعام')) return 'fa-cookie-bite';
    if (cat.includes('هدايا') || cat.includes('هدية')) return 'fa-gift';
    if (cat.includes('منزل') || cat.includes('بيت')) return 'fa-couch';
    if (cat.includes('سكن') || cat.includes('مغترب')) return 'fa-bed';
    if (cat.includes('عروض') || cat.includes('عرض') || cat.includes('خصم')) return 'fa-percent';
    return 'fa-tag'; 
}

window.generateProductCardHTML = function(p) {
    let displayImg = window.optimizeImage(p.images ? p.images[0] : p.img, 600);

    let isSoldOut = (p.hidden === true || p.qty <= 0);
    let discountBadge = (p.isOffer && p.discount && !isSoldOut) ? `<div class="badge-discount">خصم ${p.discount}</div>` : '';
    let outOfStockBadge = isSoldOut ? `<div class="badge-outofstock">نفذت الكمية</div>` : '';
    let imgClass = isSoldOut ? 'img-outofstock' : '';

    let colorCirclesHTML = '';
    if (p.colors && p.colors.length > 0) {
        let sortedColors = window.getOrderedColors(p);
        let circles = sortedColors.map(c => `<div class="card-color-circle" style="background: ${window.getColorCode(c)};" title="${c}"></div>`).join('');
        colorCirclesHTML = `<div class="card-color-circles"><span class="color-label">الألوان:</span>${circles}</div>`;
    }

    let genderBadge = p.targetGender ? `<span class="card-gender-badge">${p.targetGender}</span>` : '';
    
    let typeName = p.subType ? p.subType : p.category;
    let categoryIcon = window.getCategoryIcon(typeName);
    let typeText = `<span class="card-type-text"><i class="fa-solid ${categoryIcon}" style="font-size: 0.65rem; margin-left: 4px; color: var(--card-icon-color); vertical-align: middle;"></i>النوع: ${typeName}</span>`;

    return `
        <a href="/p/${p.shortCode}" class="inner-product-card" onclick="event.preventDefault(); openProduct('${p.id}')" style="text-decoration: none; color: inherit; display: block;">
            ${discountBadge}
            <div class="wishlist-icon ${window.wishlist.includes(String(p.id)) ? 'active' : ''}" onclick="event.preventDefault(); toggleWishlist(event, '${p.id}')" title="المفضلة"><i class="fa-solid fa-heart"></i></div>   
            <div class="img-container"><img src="${displayImg}" alt="${p.name} - كود ${p.shortCode}" class="${imgClass}" loading="lazy" decoding="async">${outOfStockBadge}</div>
            <div class="card-info">
                <div class="title-price-row">
                    <h3 dir="auto">${p.name}</h3>
                    <span class="product-price-badge">${p.price} <span style="font-size: 0.65rem; font-weight: normal;">ج.م</span></span>
                </div>
                <div class="card-type-row">
                    <div>${typeText}</div>
                    <div>${genderBadge}</div>
                </div>
                ${colorCirclesHTML}
                <p class="card-desc-snippet" dir="auto">${p.description}</p>
            </div>
        </a>
    `;
}

window.lastRenderedCount = -1; 
window.renderHomeSlider = function() {
    const slider = document.getElementById('latest-products-slider');
    if(!slider) return;

    let visibleProducts = window.products;

    if(visibleProducts.length === 0) {
        slider.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted); text-align:center; width:100%;">لا توجد منتجات حالياً.</p>';
        window.lastRenderedCount = 0;
        return;
    }

    if(window.lastRenderedCount === visibleProducts.length && slider.innerHTML.trim() !== '') {
        return; 
    }
    window.lastRenderedCount = visibleProducts.length;

    visibleProducts.sort((a, b) => {
        let dateA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : 0;
        let dateB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : 0;
        return dateB - dateA;
    });

    window.sliderProducts = visibleProducts.slice(0, 10);
    let html = window.sliderProducts.map(p => window.generateProductCardHTML(p)).join('');
    
    if (visibleProducts.length > 10) {
        html += `
            <div class="inner-product-card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; background:var(--bg-main); box-shadow:none; border: 2px dashed var(--accent); cursor:pointer; text-decoration:none;" onclick="openLatestProducts()">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--glass-bg); display: flex; justify-content: center; align-items: center; margin-bottom: 10px; box-shadow: var(--shadow);">
                    <i class="fa-solid fa-arrow-left" style="font-size: 1.5rem; color: var(--accent);"></i>
                </div>
                <h3 style="color: var(--text-primary); font-size: 1rem; font-weight:bold; margin:0;">عرض المزيد</h3>
                <span style="font-size:0.65rem; color:var(--text-muted); margin-top:5px;">أحدث 50 منتج</span>
            </div>
        `;
    }
    
    slider.innerHTML = html;
    setTimeout(() => { window.initHomeSliderDots(); }, 100);
} 

window.initHomeSliderDots = function() {
    const slider = document.getElementById('latest-products-slider');
    const dotsContainer = document.getElementById('home-slider-dots');
    if(!slider || !dotsContainer) return;

    const itemsCount = slider.children.length;
    if(itemsCount <= 1) {
        dotsContainer.innerHTML = '';
        return;
    }

    let dotsHtml = '';
    for(let i=0; i<itemsCount; i++) {
        dotsHtml += `<div class="dot ${i===0 ? 'active' : ''}"></div>`;
    }
    dotsContainer.innerHTML = dotsHtml;
}

let sliderDotTicking = false;
window.updateHomeSliderDots = function() {
    if (!sliderDotTicking) {
        window.requestAnimationFrame(() => {
            const slider = document.getElementById('latest-products-slider');
            const dotsContainer = document.getElementById('home-slider-dots');
            if (slider && dotsContainer && slider.children.length > 0) {
                const cardWidth = slider.children[0].offsetWidth + 12;
                const scrollLeft = Math.abs(slider.scrollLeft);
                let activeIndex = Math.round(scrollLeft / cardWidth);
                if (activeIndex >= dotsContainer.children.length) activeIndex = dotsContainer.children.length - 1;

                const dots = dotsContainer.children;
                for (let i = 0; i < dots.length; i++) {
                    dots[i].classList.toggle('active', i === activeIndex);
                }
            }
            sliderDotTicking = false;
        });
        sliderDotTicking = true;
    }
}

window.scrollSlider = function(direction) {
    const slider = document.getElementById('latest-products-slider');
    if(!slider) return;
    const scrollAmount = slider.clientWidth / 2;
    if(direction === 'right') { slider.scrollBy({ left: scrollAmount, behavior: 'smooth' }); } 
    else { slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); }
}

window.catObserver = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) {
        window.loadMoreCategoryProducts();
    }
}, { rootMargin: '100px' });

window.toggleSortDropdown = function(e) {
    e.stopPropagation();
    document.getElementById('sort-dropdown').classList.toggle('show');
}

window.applySort = function(sortType) {
    document.getElementById('sort-dropdown').classList.remove('show');
    if(sortType === 'price-low') { window.catProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); } 
    else if(sortType === 'price-high') { window.catProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)); } 
    else if(sortType === 'newest') {
        window.catProducts.sort((a, b) => {
            let dateA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : 0;
            let dateB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : 0;
            return dateB - dateA;
        });
    } else {
        const titleEl = document.getElementById('category-title');
        let catName = titleEl ? titleEl.innerText.replace('قسم ', '') : '';
        if(catName === 'عروض خاصة') catName = 'عروض';
        
        if(catName === 'عروض') {
            window.catProducts = window.products.filter(p => p.isOffer === true && p.category !== 'سكن الطلاب');
        } else if (catName === 'أحدث الإضافات') {
            window.catProducts = window.products.slice().sort((a,b) => {
                let dateA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : 0;
                let dateB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : 0;
                return dateB - dateA;
            }).slice(0, 50);
        } else {
            window.catProducts = window.products.filter(p => {
                let match = (p.category === catName);
                if(catName === 'ملابس رجالي' && (p.category === 'ملابس رجالي' || p.category === 'رجالي')) match = true;
                if(catName === 'ملابس حريمي' && (p.category === 'ملابس حريمي' || p.category === 'حريمي')) match = true;
                return match;
            });
        }
    }
    document.getElementById('category-products').innerHTML = '';
    window.catIndex = 0;
    window.CAT_BATCH_SIZE = 8; 
    window.loadMoreCategoryProducts();
    
    const loader = document.getElementById('category-loader');
    if(loader) {
        window.catObserver.disconnect();
        window.catObserver.observe(loader);
    }
}

window.openLatestProducts = function() {
    window.updateSEO('أحدث الإضافات', 'تصفح أحدث 50 منتج تمت إضافتها للمتجر');

    const titleEl = document.getElementById('category-title');
    if(titleEl) titleEl.innerText = 'أحدث الإضافات';

    const container = document.getElementById('category-products');
    const loader = document.getElementById('category-loader');
    if(!container) return;

    container.innerHTML = '';
    if(loader) loader.style.display = 'block';

    window.navigate('category');

    setTimeout(() => {
        let sorted = window.products.slice().sort((a, b) => {
            let dateA = a.createdAt ? (a.createdAt.seconds || new Date(a.createdAt).getTime()) : 0;
            let dateB = b.createdAt ? (b.createdAt.seconds || new Date(b.createdAt).getTime()) : 0;
            return dateB - dateA;
        });
        
        window.catProducts = sorted.slice(0, 50);
        window.catIndex = 0;
        window.CAT_BATCH_SIZE = 5; 

        if(window.catProducts.length === 0) {
            if(loader) loader.style.display = 'none';
            container.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:0.9rem; color:var(--text-muted)">لا توجد منتجات حالياً.</p>';
            return;
        }

        window.loadMoreCategoryProducts();

        window.catObserver.disconnect();
        if(loader) window.catObserver.observe(loader);

    }, 10);
}

window.openCategory = function(catName, pushHistory = true) {
    window.updateSEO(`قسم ${catName}`, `تصفح أفضل المنتجات في قسم ${catName} بأرخص الأسعار`);

    const titleEl = document.getElementById('category-title');
    if(titleEl) titleEl.innerText = catName === 'عروض' ? 'عروض خاصة' : "قسم " + catName;

    const container = document.getElementById('category-products');
    const loader = document.getElementById('category-loader');
    if(!container) return;

    container.innerHTML = '';
    if(loader) loader.style.display = 'block';

    if (pushHistory) window.navigate('category');
    else window.navigateUI('category');

    setTimeout(() => {
        if(catName === 'عروض') {
            window.catProducts = window.products.filter(p => p.isOffer === true && p.category !== 'سكن الطلاب');
        } else {
            window.catProducts = window.products.filter(p => {
                let match = (p.category === catName);
                if(catName === 'ملابس رجالي' && (p.category === 'ملابس رجالي' || p.category === 'رجالي')) match = true;
                if(catName === 'ملابس حريمي' && (p.category === 'ملابس حريمي' || p.category === 'حريمي')) match = true;
                return match;
            });
        }

        window.catIndex = 0;
        window.CAT_BATCH_SIZE = 8; 

        if(window.catProducts.length === 0) {
            if(loader) loader.style.display = 'none';
            container.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:0.9rem; color:var(--text-muted)">لا توجد منتجات في هذا القسم حالياً.</p>';
            return;
        }

        window.loadMoreCategoryProducts();

        window.catObserver.disconnect();
        if(loader) window.catObserver.observe(loader);

    }, 10);
}

window.loadMoreCategoryProducts = function() {
    const container = document.getElementById('category-products');
    const loader = document.getElementById('category-loader');
    if(!container) return;

    let nextBatch = window.catProducts.slice(window.catIndex, window.catIndex + window.CAT_BATCH_SIZE);
    if(nextBatch.length > 0) {
        let html = nextBatch.map(p => window.generateProductCardHTML(p)).join('');
        container.insertAdjacentHTML('beforeend', html);
        window.catIndex += window.CAT_BATCH_SIZE;
    }

    if(window.catIndex >= window.catProducts.length) {
        if(loader) {
            loader.style.display = 'none';
            window.catObserver.unobserve(loader);
        }
    } else {
        if(loader) loader.style.display = 'block';
    }
}

let ticking = false;
window.updateSliderDots = function(sliderElement) {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const absScroll = Math.abs(sliderElement.scrollLeft);
            const index = Math.round(absScroll / sliderElement.clientWidth);

            const dotsContainer = sliderElement.parentElement.nextElementSibling;
            if (dotsContainer && dotsContainer.classList.contains('slider-dots')) {
                const dots = dotsContainer.children;
                for (let i = 0; i < dots.length; i++) {
                    dots[i].classList.toggle('active', i === index);
                }
            }
            ticking = false;
        });
        ticking = true;
    }
}

window.openLightbox = function(src) {
    const imgEl = document.getElementById('lightbox-img');
    const boxEl = document.getElementById('lightbox');
    if(imgEl && boxEl) {
        imgEl.src = src;
        boxEl.style.display = 'flex';
    }
}

window.closeLightbox = function() { 
    const boxEl = document.getElementById('lightbox');
    if(boxEl) boxEl.style.display = 'none'; 
}

window.toggleDropdown = function(id) {
    document.querySelectorAll('.custom-select-list').forEach(el => {
        if(el.id !== id) el.classList.remove('show');
    });
    const targetEl = document.getElementById(id);
    if(targetEl) targetEl.classList.toggle('show');
}

window.selectColor = function(color, productId) {
    const orderColorInput = document.getElementById('order-color');
    const colorDisplay = document.getElementById('color-display');
    const colorDropdown = document.getElementById('color-dropdown');

    if(orderColorInput) orderColorInput.value = color;
    if(colorDisplay) colorDisplay.innerText = color;
    if(colorDropdown) colorDropdown.classList.remove('show');

    document.querySelectorAll('.color-pill').forEach(el => el.classList.remove('active'));
    let activePill = document.getElementById(`color-pill-${color}`);
    if(activePill) activePill.classList.add('active');

    const p = window.products.find(x => String(x.id) === String(productId));
    if (!p || !p.imageColorsMapping || !p.images) return;

    let targetUrl = Object.keys(p.imageColorsMapping).find(url => p.imageColorsMapping[url] === color);

    if (targetUrl) {
        let index = p.images.findIndex(img => img === targetUrl);
        if (index !== -1) {
            const slider = document.querySelector('.details-slider');
            if (slider) {
                const targetImg = slider.querySelectorAll('img')[index];
                if(targetImg) {
                    slider.scrollTo({ left: targetImg.offsetLeft, behavior: 'auto' });
                }
            }
        }
    }
}

window.selectCustomOption = function(type, value) {
    const inputEl = document.getElementById(`order-${type}`);
    const displayEl = document.getElementById(`${type}-display`);
    const dropEl = document.getElementById(`${type}-dropdown`);

    if(inputEl) inputEl.value = value;
    if(displayEl) displayEl.innerText = value;
    if(dropEl) dropEl.classList.remove('show');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-list').forEach(el => el.classList.remove('show'));
        const badge = document.getElementById('notification-badge');
        if(badge && badge.style.display !== 'none') {
            badge.style.display = 'none';
            badge.innerText = '0';
        }
    }
});

window.profileObserver = new IntersectionObserver((entries) => {
    if(entries[0].isIntersecting) {
        window.loadMoreProfileProducts();
    }
}, { rootMargin: '50px' });

window.openProfile = function(adminId, pushHistory = true) {
    const admin = window.admins[adminId];
    if(!admin) return;

    const shareBtn = document.getElementById('profile-share-btn');
    if(shareBtn) shareBtn.setAttribute('onclick', `shareProfile('${adminId}')`);

    let joinDate = "حديثاً";
    if (admin.createdAt) {
        try {
            let d;
            if (admin.createdAt.toDate) { d = admin.createdAt.toDate(); }
            else if (admin.createdAt.seconds) { d = new Date(admin.createdAt.seconds * 1000); }
            else { d = new Date(admin.createdAt); }
            if (!isNaN(d)) joinDate = d.toLocaleDateString('ar-EG');
        } catch(e) { console.error("Date error:", e); }
    }

    const profileContent = document.getElementById('profile-content');
    document.getElementById('profile-products-title').innerText = `منتجات المسوق: ${admin.name}`;
    let bioHtml = admin.bio ? `<div style="width: 100%; margin-top: 5px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; white-space: pre-wrap;" dir="auto">${admin.bio}</div>` : '';

    profileContent.innerHTML = `
        <div class="details-image-wrapper">
            <div class="details-slider">
                <img src="${window.optimizeImage(admin.image, 600)}" onclick="openLightbox('${window.optimizeImage(admin.image, 700, true)}')" style="object-fit: contain; background: var(--bg-surface);">
            </div>
        </div>
        <div class="info-bar" style="flex-direction: column; gap: 8px; align-items: stretch; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <strong style="font-size:1.1rem; color:var(--text-primary);">${admin.name}</strong>
                <span style="font-size:0.8rem; color:var(--text-muted);">انضم: ${joinDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: var(--border-width) dashed var(--line-accent); padding-top: 8px;">
                <span style="font-size:0.85rem; color:var(--text-dark);"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${admin.address}</span>
                <span style="font-size:0.85rem; color:var(--text-dark); font-weight:bold;" dir="ltr"><i class="fa-solid fa-phone" style="color:var(--accent);"></i> ${admin.phone}</span>
            </div>
            ${bioHtml}
        </div>
    `;

    window.profileProducts = window.products.filter(p => p.adminId === adminId);
    window.profileIndex = 0;

    const container = document.getElementById('profile-products');
    const loader = document.getElementById('profile-loader');
    container.innerHTML = '';

    if (pushHistory) window.navigate('profile', true, `/m/${admin.shortCode}`);
    else window.navigateUI('profile');

    setTimeout(() => {
        if(window.profileProducts.length === 0) {
            if(loader) loader.style.display = 'none';
            container.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:0.9rem; color:var(--text-muted)">لم يقم هذا المسوق برفع منتجات بعد.</p>';
            return;
        }

        if(loader) loader.style.display = 'block';
        window.loadMoreProfileProducts();
        window.profileObserver.disconnect();
        if(loader) window.profileObserver.observe(loader);
    }, 10);
}

window.loadMoreProfileProducts = function() {
    const container = document.getElementById('profile-products');
    const loader = document.getElementById('profile-loader');
    if(!container) return;

    let nextBatch = window.profileProducts.slice(window.profileIndex, window.profileIndex + window.PROFILE_BATCH_SIZE);
    if(nextBatch.length > 0) {
        let html = nextBatch.map(p => window.generateProductCardHTML(p)).join('');
        container.insertAdjacentHTML('beforeend', html);
        window.profileIndex += window.PROFILE_BATCH_SIZE;
    }

    if(window.profileIndex >= window.profileProducts.length) {
        if(loader) {
            loader.style.display = 'none';
            window.profileObserver.unobserve(loader);
        }
    } else {
        if(loader) loader.style.display = 'block';
    }
}

window.openProduct = function(id, pushToHistory = true) {
    window.currentViewedProductId = id; 

    const p = window.products.find(x => String(x.id) === String(id));

    if (!p) {
        window.resetAndNavigate('home');
        return;
    }

    if(p) window.updateSEO(p.name, p.description.substring(0, 150));

    const shareBtn = document.getElementById('details-share-btn');
    if(shareBtn) shareBtn.setAttribute('onclick', `shareProduct(event, '${p.id}')`);
    
    const wishBtn = document.getElementById('details-wishlist-btn');
    if(wishBtn) {
        wishBtn.className = `share-btn-top ${window.wishlist.includes(String(p.id)) ? 'active-heart' : ''}`;
        wishBtn.setAttribute('onclick', `toggleWishlist(event, '${p.id}', true)`);
    }

    let pubDate = "أضيف حديثاً";
    if (p.createdAt) {
        try {
            let d;
            if (p.createdAt.toDate) { d = p.createdAt.toDate(); }
            else if (p.createdAt.seconds) { d = new Date(p.createdAt.seconds * 1000); }
            else { d = new Date(p.createdAt); }
            if (!isNaN(d)) {
                pubDate = d.toLocaleDateString('ar-EG') + ' - ' + d.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
            }
        } catch(e) { console.error("Date error:", e); }
    }

    let imgsArray = p.images && p.images.length > 0 ? p.images.slice(0, 7) : [p.img];
    let sliderHtml = imgsArray.map((imgSrc, index) => `<img src="${window.optimizeImage(imgSrc, 600)}" ${index === 0 ? 'decoding="sync"' : 'loading="lazy" decoding="async"'} onclick="openLightbox('${window.optimizeImage(imgSrc, 700, true)}')">`).join('');
    let dotsHtml = imgsArray.map((_, i) => `<span class="dot ${i===0 ? 'active' : ''}"></span>`).join('');
    let safeSizes = p.sizes || [];
    let safeColors = p.colors || [];

    let sizeItems = safeSizes.map(s => `<div class="custom-select-item" onclick="selectCustomOption('size', '${s}')">${s}</div>`).join('');
    let colorItems = safeColors.map(c => `<div class="custom-select-item" onclick="selectColor('${c}', '${p.id}')">${c}</div>`).join('');

    let defaultSize = safeSizes.length > 0 ? safeSizes[0] : '';
    let defaultColor = safeColors.length > 0 ? safeColors[0] : '';

    let detailsColorCirclesHTML = '';
    if (p.colors && p.colors.length > 0) {
        let sortedColors = window.getOrderedColors(p);

        let detailsCircles = sortedColors.map(c => `
            <div id="color-pill-${c}" class="color-pill ${c === defaultColor ? 'active' : ''}" onclick="selectColor('${c}', '${p.id}')">
                <div style="width:10px; height:10px; border-radius:50%; border:var(--border-width) solid var(--border-light); background: ${window.getColorCode(c)};"></div>
                <span style="font-size:0.7rem; color:var(--text-dark); font-weight:bold;">${c}</span>
            </div>`).join('');

        detailsColorCirclesHTML = `
        <div class="options-section" style="padding: 10px 15px;">
            <div style="font-weight:bold; font-size:0.85rem; color:var(--text-dark); margin-bottom: 8px;"><i class="fa-solid fa-palette" style="color:var(--accent);"></i> الألوان المتاحة:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${detailsCircles}
            </div>
        </div>`;
    }

    let detailsSizesHTML = '';
    if (p.sizes && p.sizes.length > 0) {
        let detailsSizes = p.sizes.map(s => `
            <div style="background:var(--bg-main); padding:4px 10px; border-radius:8px; border:var(--border-width) solid var(--border-light); font-size:0.75rem; color:var(--text-dark); font-weight:bold;">
                ${s}
            </div>`).join('');

        detailsSizesHTML = `
        <div class="options-section" style="padding: 10px 15px;">
            <div style="font-weight:bold; font-size:0.85rem; color:var(--text-dark); margin-bottom: 8px;"><i class="fa-solid fa-ruler" style="color:var(--accent);"></i> المقاسات المتاحة:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${detailsSizes}
            </div>
        </div>`;
    }

    let isSoldOut = (p.hidden === true || p.qty <= 0);

    let adminPhone = window.SELLER_PHONE;
    if(p.whatsapp) {
        adminPhone = p.whatsapp;
    } else if (p.adminId && window.admins[p.adminId] && window.admins[p.adminId].phone) {
        adminPhone = window.admins[p.adminId].phone;
        if(adminPhone.startsWith('01')) adminPhone = '20' + adminPhone.substring(1);
    }

    let orderSectionHTML = '';
    if (!isSoldOut) {
        orderSectionHTML = `
        <div class="options-section" style="padding: 12px; border: var(--border-width) solid var(--border-light); overflow: visible;">
            <div style="font-weight:bold; font-size:0.9rem; color:var(--text-primary); margin-bottom: 10px; border-bottom: var(--border-width) solid var(--line-accent); padding-bottom: 5px;">تجهيز الطلب:</div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">الاسم:</label>
                    <input type="text" id="order-customer-name" class="form-control" style="padding: 6px 10px; font-size:0.8rem;" placeholder="اسمك ثلاثي">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">رقم العميل:</label>
                    <input type="tel" id="order-customer-phone" class="form-control" style="padding: 6px 10px; font-size:0.8rem; direction: ltr; text-align: right;" placeholder="010...">
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <div class="custom-select-wrapper" style="flex: 1; margin-bottom: 0; ${safeSizes.length ? '' : 'display:none;'}">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">المقاس:</label>
                    <div class="custom-select-btn" style="padding: 6px 10px; font-size:0.8rem;" onclick="toggleDropdown('size-dropdown')">
                        <span id="size-display">${defaultSize || 'لا يوجد'}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="custom-select-list" id="size-dropdown">${sizeItems}</div>
                </div>

                <div class="custom-select-wrapper" style="flex: 1; margin-bottom: 0; ${safeColors.length ? '' : 'display:none;'}">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">اللون:</label>
                    <div class="custom-select-btn" style="padding: 6px 10px; font-size:0.8rem;" onclick="toggleDropdown('color-dropdown')">
                        <span id="color-display">${defaultColor || 'لا يوجد'}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="custom-select-list" id="color-dropdown">${colorItems}</div>
                </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: flex-end; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">الكمية المطلوبة:</label>
                    <input type="number" id="order-qty" class="form-control" style="padding: 6px 10px; font-size:0.8rem;" value="1" min="1" max="${p.qty}" oninput="updateOrderTotal(${p.price}, this.value)">
                </div>
                <div style="flex: 2; text-align: center; background: var(--bg-main); padding: 6px; border-radius: 8px; border: var(--border-width) solid var(--border-light);">
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">الإجمالي:</span>
                    <span id="order-total-display" style="font-size:0.95rem; font-weight:bold; color:var(--price-color); margin-right: 5px;">${p.price} ج.م</span>
                </div>
            </div>
            
            <input type="hidden" id="order-size" value="${defaultSize}">
            <input type="hidden" id="order-color" value="${defaultColor}">

            <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn btn-whatsapp" style="flex: 1; margin-top: 0; padding: 8px; font-size: 0.85rem;" onclick="confirmDirectOrder('${p.id}', '${adminPhone}')">
                    <i class="fa-brands fa-whatsapp"></i> اطلب الآن
                </button>
                <button class="btn" style="flex: 1; margin-top: 0; padding: 8px; font-size: 0.85rem; background: var(--bg-dark-blue); color: white;" onclick="inquireProduct('${p.id}', '${adminPhone}')">
                    <i class="fa-solid fa-circle-question"></i> استفسار
                </button>
                <button class="btn btn-cart" style="width: 45px; height: 40px; margin-top: 0; padding: 0; display: flex; justify-content: center; align-items: center; font-size: 1.1rem; border-radius: 12px; flex-shrink: 0;" onclick="addFromFormToCart('${p.id}', '${adminPhone}')" title="إضافة للسلة">
                    <i class="fa-solid fa-cart-plus"></i>
                </button>
            </div>
        </div>`;
    } else {
        orderSectionHTML = `
        <div style="display: flex; gap: 6px; align-items: center; margin-top: 15px;">
            <button class="btn" style="flex: 2; background:#bdc3c7; color:#fff; cursor:not-allowed; margin-top: 0; border: var(--border-width) solid var(--border-light);">
                <i class="fa-solid fa-ban"></i> نفذت الكمية
            </button>
            <button class="btn" style="flex: 1; margin-top: 0; padding: 8px; font-size: 0.85rem; background: var(--bg-dark-blue); color: white;" onclick="inquireProduct('${p.id}', '${adminPhone}')">
                <i class="fa-solid fa-circle-question"></i> استفسار
            </button>
        </div>`;
    }

    let publisherBarHTML = '';
    if (p.adminId && window.admins[p.adminId]) {
        const admin = window.admins[p.adminId];
        let adminJoinDate = "حديثاً";
        if (admin.createdAt) {
            try {
                let d;
                if (admin.createdAt.toDate) { d = admin.createdAt.toDate(); }
                else if (admin.createdAt.seconds) { d = new Date(admin.createdAt.seconds * 1000); }
                else { d = new Date(admin.createdAt); }
                if (!isNaN(d)) adminJoinDate = d.toLocaleDateString('ar-EG');
            } catch(e) { console.error("Date error:", e); }
        }

        publisherBarHTML = `
        <div class="options-section publisher-bar" onclick="openProfile('${p.adminId}')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${window.optimizeImage(admin.image, 100)}" style="width:40px; height:40px; border-radius:50%; border:var(--border-width) solid var(--border-light); object-fit:cover;">
                    <span style="font-weight:bold; font-size:0.9rem; color:var(--text-primary);">المسوق: ${admin.name}</span>
                </div>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">${adminJoinDate}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--accent); text-align: center; margin-top: 8px; font-weight:bold;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> اضغط لعرض بروفايل المسوق
            </div>
        </div>`;
    }

    const container = document.getElementById('product-details-content');
    if(container) {
        container.innerHTML = `
            <div class="details-image-wrapper"><div class="details-slider" onscroll="updateSliderDots(this)">${sliderHtml}</div></div>
            ${imgsArray.length > 1 ? `<div class="slider-dots">${dotsHtml}</div>` : ''}

            <div class="info-bar" style="align-items: flex-start;">
                <div>
                    <strong style="font-size:0.95rem; display:block; margin-bottom:5px;" dir="auto">${p.name}</strong> 
                    <span style="color:var(--price-color); font-weight:bold; font-size:1.1rem;">${p.price} ج.م</span>
                </div>
                <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <span style="font-size: 0.55rem; color: var(--silver); direction: ltr;">${pubDate}</span>
                    <span style="color:${!isSoldOut ? 'var(--text-primary)' : '#e74c3c'}; font-weight:bold; font-size:0.8rem; background: var(--bg-main); padding: 3px 8px; border-radius: 10px;">${!isSoldOut ? 'متاح: ' + p.qty : 'نفذت الكمية'}</span>
                </div>
            </div>

            ${detailsColorCirclesHTML}
            ${detailsSizesHTML}

            <div class="options-section">
                <div style="font-weight:bold; font-size:0.9rem; color:var(--text-dark); margin-bottom: 8px;"><i class="fa-solid fa-file-lines" style="color:var(--accent);"></i> تفاصيل المنتج:</div>
                <p style="font-size:1rem; color:var(--text-dark); line-height: 1.7; margin: 0; white-space: pre-wrap;" dir="auto">${p.description}</p>
            </div>

            ${publisherBarHTML}

            <div class="options-section" style="font-size:0.85rem; color:var(--text-dark)">
                <div style="margin-bottom: 10px;"><i class="fa-solid fa-hashtag" style="color:var(--accent); width: 15px;"></i> <strong>كود المنتج:</strong> <span style="color:var(--text-primary); font-weight:bold;">${p.shortCode}</span></div>
                <div style="margin-bottom: 10px;"><i class="fa-solid fa-layer-group" style="color:var(--accent); width: 15px;"></i> <strong>القسم:</strong> ${p.category}</div>
                ${p.subType ? `<div style="margin-bottom: 10px;"><i class="fa-solid fa-tag" style="color:var(--accent); width: 15px;"></i> <strong>التصنيف:</strong> ${p.subType}</div>` : ''}
                ${p.targetGender ? `<div style="margin-bottom: 10px;"><i class="fa-solid fa-venus-mars" style="color:var(--accent); width: 15px;"></i> <strong>الفئة:</strong> ${p.targetGender}</div>` : ''}
                <div><i class="fa-solid fa-location-dot" style="color:var(--accent); width: 15px;"></i> <strong>التوصيل:</strong> ${p.delivery || 'غير محدد'}</div>
            </div>

            ${orderSectionHTML}
        `;

        let related = window.products.filter(x => x.category === p.category && String(x.id) !== String(p.id));
        related = related.sort(() => 0.5 - Math.random()).slice(0, 4);
        
        if(related.length > 0) {
            let relatedHtml = related.map(rp => window.generateProductCardHTML(rp)).join('');
            container.innerHTML += `
                <div class="slider-section" style="margin-top: 15px; border: none; box-shadow: none; padding: 0;">
                    <div class="slider-header"><h2 style="font-size:0.9rem; color:var(--text-primary);"><i class="fa-solid fa-fire" style="color:var(--accent);"></i> منتجات مشابهة</h2></div>
                    <div class="slider-container" style="padding-bottom: 10px;">${relatedHtml}</div>
                </div>
            `;
        }
    }
    if(pushToHistory) window.navigate('details', true, `/p/${p.shortCode}`);
    else window.navigateUI('details');
}

window.updateOrderTotal = function(price, qty) {
    let parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty < 1) parsedQty = 1;
    let total = price * parsedQty;
    const displayEl = document.getElementById('order-total-display');
    if(displayEl) displayEl.innerText = `${total} ج.م`;
}

window.flyToCartAnimation = function(imgSrc) {
    const cartIcon = document.querySelector('.fa-cart-shopping');
    if (!cartIcon) return;
    const img = document.createElement('img');
    img.src = window.optimizeImage(imgSrc, 100);
    img.className = 'flying-img';
    img.style.width = '80px'; 
    img.style.height = '80px';
    img.style.left = (window.innerWidth / 2 - 40) + 'px';
    img.style.top = (window.innerHeight / 2 - 40) + 'px';
    img.style.transform = 'scale(0.8)';
    img.style.willChange = 'top, left, transform, opacity'; 
    document.body.appendChild(img);
    
    const cartPos = cartIcon.getBoundingClientRect();
    
    setTimeout(() => { img.style.transform = 'scale(1)'; }, 10);
    
    setTimeout(() => {
        img.style.left = cartPos.left + 'px';
        img.style.top = cartPos.top + 'px';
        img.style.width = '20px'; 
        img.style.height = '20px';
        img.style.opacity = '0'; 
        img.style.transform = 'scale(0.2)';
    }, 1000); 
    
    setTimeout(() => { img.remove(); }, 1400);
}

window.addFromFormToCart = function(id, adminPhone) {
    const p = window.products.find(x => String(x.id) === String(id));
    let size = document.getElementById('order-size') ? document.getElementById('order-size').value : '';
    let color = document.getElementById('order-color') ? document.getElementById('order-color').value : '';
    let qtyInput = document.getElementById('order-qty');

    let qty = parseInt(qtyInput ? qtyInput.value : 1);
    if (isNaN(qty) || qty < 1) qty = 1;

    if (qty > p.qty) { alert("الكمية المطلوبة أكبر من المتاح في المخزن!"); return; }

    let selectedImg = p.img;
    if(p.imageColorsMapping && color) {
        let matchingUrl = Object.keys(p.imageColorsMapping).find(url => p.imageColorsMapping[url] === color);
        if(matchingUrl) selectedImg = matchingUrl;
    }

    window.cart.push({ ...p, selSize: size, selColor: color, selQty: qty, selImg: selectedImg, marketerPhone: adminPhone });
    try { localStorage.setItem('am_cart', JSON.stringify(window.cart)); } catch(e){}
    window.updateCartBadge(); 
    window.flyToCartAnimation(selectedImg);
    window.showToast("تمت الإضافة للسلة بنجاح", "#2ecc71"); 
}

window.confirmDirectOrder = function(id, adminPhone) {
    const p = window.products.find(x => String(x.id) === String(id));
    let size = document.getElementById('order-size') ? document.getElementById('order-size').value : '';
    let color = document.getElementById('order-color') ? document.getElementById('order-color').value : '';
    let qtyInput = document.getElementById('order-qty');

    let qty = parseInt(qtyInput ? qtyInput.value : 1);
    if (isNaN(qty) || qty < 1) qty = 1;

    let cName = document.getElementById('order-customer-name').value.trim();
    let cPhone = document.getElementById('order-customer-phone').value.trim();

    if(!cName || !cPhone) {
        window.showToast("يرجى إدخال اسمك ورقم هاتفك لتأكيد الطلب", "#e74c3c");
        return;
    }

    if (qty > p.qty) { alert("الكمية المطلوبة أكبر من المتاح في المخزن!"); return; }

    const cleanBaseUrl = window.location.origin;
    const productUrl = `${cleanBaseUrl}/p/${p.shortCode}`;
    const totalPrice = p.price * qty;

    let targetPhone = adminPhone || window.SELLER_PHONE;

    let msg = `مرحباً، أود طلب المنتج التالي:\n\n👤 اسم العميل: ${cName}\n📞 رقم العميل: ${cPhone}\n\n🔖 كود المنتج: ${p.shortCode}\n المنتج: ${p.name}\n القسم: ${p.category}\n اللون: ${color || 'غير محدد'}\n المقاس: ${size || 'غير محدد'}\n العدد: ${qty}\n إجمالي الحساب: ${totalPrice} ج.م\n\n🔗 الرابط: ${productUrl}`;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.inquireProduct = function(id, adminPhone) {
    const p = window.products.find(x => String(x.id) === String(id));
    if (!p) return;

    const cleanBaseUrl = window.location.origin;
    const productUrl = `${cleanBaseUrl}/p/${p.shortCode}`;

    let targetPhone = adminPhone || window.SELLER_PHONE;

    let msg = `مرحباً، لدي استفسار بخصوص هذا المنتج:\n\n🔖 كود المنتج: ${p.shortCode}\n📦 المنتج: ${p.name}\n🔗 الرابط: ${productUrl}`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.renderCart = function() {
    const c = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total-container');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if(!c || !totalContainer) return;

    if(window.cart.length === 0) {
        c.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:var(--text-muted)">السلة فارغة.</p>';
        totalContainer.innerHTML = '';
        if(checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if(checkoutBtn) checkoutBtn.style.display = 'flex';

    let totalCartPrice = 0;
    c.innerHTML = window.cart.map((item, i) => {
        let itemTotal = item.price * item.selQty;
        totalCartPrice += itemTotal;

        let displayImg = window.optimizeImage(item.selImg || (item.images ? item.images[0] : item.img), 100);

        return `
        <div class="info-bar" style="margin-bottom:12px; padding: 10px;">
            <img src="${displayImg}" style="width:50px; height:50px; border-radius:10px; object-fit:cover; border: var(--border-width) solid var(--border-light);">
            <div style="flex:1; margin: 0 12px;">
                <strong style="font-size:0.9rem;" dir="auto">${item.name}</strong><br>
                <small style="color:var(--text-muted); font-size:0.75rem;">${item.selColor ? `لون: ${item.selColor} | ` : ''}${item.selSize ? `مقاس: ${item.selSize} | ` : ''}<strong style="color:var(--text-primary)">العدد: ${item.selQty}</strong></small><br>
                <span style="color:var(--price-color); font-weight:bold; font-size:0.85rem;">${itemTotal} ج.م</span>
            </div>
            <i class="fa-solid fa-trash" style="color:#e74c3c; cursor:pointer; font-size:1.1rem; padding:8px;" onclick="removeFromCart(${i})"></i>
        </div>`;
    }).join('');

    totalContainer.innerHTML = `
        <div class="options-section" style="padding: 12px; margin-top: 15px; border-radius: 12px;">
            <div style="font-weight:bold; font-size:0.85rem; margin-bottom:8px; color:var(--text-primary);">بيانات التوصيل:</div>
            <div style="display: flex; gap: 8px;">
                <div style="flex: 1;">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">الاسم:</label>
                    <input type="text" id="cart-customer-name" class="form-control" style="padding: 6px 10px; font-size:0.8rem;" placeholder="اسمك ثلاثي">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; font-size:0.75rem; margin-bottom:4px; font-weight:bold; color:var(--text-dark);">رقم الهاتف:</label>
                    <input type="tel" id="cart-customer-phone" class="form-control" style="padding: 6px 10px; font-size:0.8rem; direction:ltr; text-align:right;" placeholder="010...">
                </div>
            </div>
        </div>
        <div class="cart-total-box" style="margin-top: 0;">إجمالي حساب السلة: ${totalCartPrice} ج.م</div>
        <div id="split-orders-ui"></div>
    `;
}

window.removeFromCart = function(i) { 
    window.cart.splice(i, 1); 
    try { localStorage.setItem('am_cart', JSON.stringify(window.cart)); } catch(e){}
    window.updateCartBadge(); 
    window.renderCart(); 
    window.showToast("تم إزالة المنتج من السلة", "#e74c3c"); 
}

window.sendWhatsApp = function(targetPhone, items, totalCartPrice, cName, cPhone) {
    const cleanBaseUrl = window.location.origin;

    let groupedItems = {};
    items.forEach(item => {
        if (!groupedItems[item.shortCode]) {
            groupedItems[item.shortCode] = {
                name: item.name,
                category: item.category,
                shortCode: item.shortCode,
                price: item.price,
                variations:[],
                totalPrice: 0
            };
        }
        groupedItems[item.shortCode].variations.push({
            color: item.selColor,
            size: item.selSize,
            qty: item.selQty
        });
        groupedItems[item.shortCode].totalPrice += (item.price * item.selQty);
    });

    let msg = `مرحباً، هذا طلبي من السلة:\n\n👤 اسم العميل: ${cName}\n📞 رقم العميل: ${cPhone}\n\n`;

    let counter = 1;
    let keys = Object.keys(groupedItems);

    for (let code in groupedItems) {
        let g = groupedItems[code];
        const productUrl = `${cleanBaseUrl}/p/${g.shortCode}`;

        msg += `${counter}- ${g.name} (قسم: ${g.category})\n🔖 كود: ${g.shortCode}\n`;

        g.variations.forEach(v => {
            msg += ` 🔸 ${v.color ? `لون: ${v.color} ` : ''}${v.size ? `| مقاس: ${v.size} ` : ''}| عدد: ${v.qty}\n`;
        });

        msg += ` 💰 إجمالي الصنف: ${g.totalPrice} ج.م\n🔗 الرابط: ${productUrl}`;

        if (counter < keys.length) {
            msg += `\n\n-----------------\n\n`;
        }
        counter++;
    }

    msg += `\n\n🛒 إجمالي الحساب الكلي: ${totalCartPrice} ج.م`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.sendGroupWhatsApp = function(targetPhone) {
    let cName = document.getElementById('cart-customer-name').value.trim();
    let cPhone = document.getElementById('cart-customer-phone').value.trim();

    let items = window.cart.filter(item => (item.marketerPhone || window.SELLER_PHONE) === targetPhone);
    let total = items.reduce((sum, item) => sum + (item.price * item.selQty), 0);

    window.sendWhatsApp(targetPhone, items, total, cName, cPhone);
}

window.checkoutCart = function() {
    if(!window.cart.length) return;

    let cName = document.getElementById('cart-customer-name').value.trim();
    let cPhone = document.getElementById('cart-customer-phone').value.trim();

    if(!cName || !cPhone) {
        window.showToast("يرجى إدخال بيانات التوصيل (الاسم ورقم الهاتف)", "#e74c3c");
        return;
    }

    let groups = {};
    window.cart.forEach((item) => {
        let phone = item.marketerPhone || window.SELLER_PHONE;
        if(!groups[phone]) groups[phone] = { items:[], total: 0 };
        groups[phone].items.push(item);
        groups[phone].total += (item.price * item.selQty);
    });

    let phoneKeys = Object.keys(groups);

    if (phoneKeys.length === 1) {
        let phone = phoneKeys[0];
        window.sendWhatsApp(phone, groups[phone].items, groups[phone].total, cName, cPhone);
    } else {
        let splitDiv = document.getElementById('split-orders-ui');
        if(!splitDiv) return;

        let html = `
        <div class="options-section" style="padding: 15px; border: 2px solid #e74c3c; background: #fff0f0; margin-top: 15px;">
            <h4 style="color: #c0392b; margin-bottom: 10px; text-align: center; font-size: 0.95rem;">تنبيه: السلة تحتوي على منتجات من بائعين مختلفين!</h4>
            <p style="font-size: 0.8rem; color: #333; margin-bottom: 15px; text-align: center;">يرجى إرسال الطلب لكل بائع على حدة لضمان وصول طلبك بالكامل.</p>
        `;

        let groupCounter = 1;
        for(let phone in groups) {
            let g = groups[phone];
            html += `
                <div style="background: #fff; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: var(--border-width) solid var(--border-light);">
                    <div style="font-weight: bold; font-size: 0.85rem; margin-bottom: 5px; color: var(--bg-dark-blue);">طلب البائع ${groupCounter} (إجمالي: ${g.total} ج.م)</div>
                    <button class="btn btn-whatsapp" style="margin-top: 5px; padding: 8px; font-size: 0.85rem;" onclick="sendGroupWhatsApp('${phone}')">
                        <i class="fa-brands fa-whatsapp"></i> إرسال طلب البائع ${groupCounter}
                    </button>
                </div>
            `;
            groupCounter++;
        }
        html += `</div>`;

        document.getElementById('cart-checkout-btn').style.display = 'none';
        splitDiv.innerHTML = html;
        splitDiv.scrollIntoView({behavior: 'smooth'});
    }
}

window.updateCartBadge();

function initVisitorStats() {
    const visitorId = Math.random().toString(36).substring(2, 15); 
    const myConnectionsRef = ref(rtdb, `online_users/${visitorId}`);
    const connectedRef = ref(rtdb, '.info/connected');

    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(myConnectionsRef, true);
            onDisconnect(myConnectionsRef).remove();
        }
    });

    let onlineUpdateTimer = null;
    const onlineUsersRef = ref(rtdb, 'online_users');
    onValue(onlineUsersRef, (snap) => {
        const count = snap.size; 
        if(onlineUpdateTimer) clearTimeout(onlineUpdateTimer);
        
        onlineUpdateTimer = setTimeout(() => {
            window.requestAnimationFrame(() => {
                const el = document.getElementById('online-users-count');
                if(el) el.innerText = count || 1;
            });
        }, 1000); 
    });

    const statsRef = doc(db, "gam3a_settings", "visitor_stats");

    onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('total-visits-count').innerText = docSnap.data().totalVisits;
        } else {
            document.getElementById('total-visits-count').innerText = "0";
        }
    }, (error) => {
        console.error("Snapshot Error:", error);
    });

    if (!localStorage.getItem('gam3a_visited')) {
        localStorage.setItem('gam3a_visited', 'true');

        getDoc(statsRef).then(snap => {
            if (!snap.exists()) {
                setDoc(statsRef, { totalVisits: 1 });
            } else {
                updateDoc(statsRef, { totalVisits: increment(1) });
            }
        }).catch(err => console.error("Update Error:", err));
    }
}

const messaging = getMessaging(app);

window.savedNotifications = JSON.parse(localStorage.getItem('gam3a_notifications')) || [];

window.updateNotificationBadge = function() {
    const badge = document.getElementById('notification-badge'); 
    const unread = window.savedNotifications.filter(n => !n.read).length;
    if (badge) {
        badge.innerText = unread;
        badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
}

window.renderNotifications = function() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    if (window.savedNotifications.length === 0) {
        list.innerHTML = '<p style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin:10px 0;">لا توجد إشعارات حالياً.</p>';
        return;
    }

    let sorted = [...window.savedNotifications].reverse();
    list.innerHTML = sorted.map(n => `
        <div style="background:${n.read ? 'var(--bg-main)' : 'var(--border-light)'}; padding:10px; border-radius:8px; border:var(--border-width) solid ${n.read ? 'var(--border-light)' : 'var(--accent)'}; text-align:right;">
            <strong style="display:block; font-size:0.85rem; color:var(--text-primary); margin-bottom:4px;">${n.title}</strong>
            <p style="font-size:0.75rem; color:var(--text-dark); margin:0; line-height:1.4;">${n.body}</p>
            <span style="font-size:0.65rem; color:var(--silver); margin-top:5px; display:block;">${new Date(n.time).toLocaleString('ar-EG')}</span>
        </div>
    `).join('');
}

window.toggleNotificationBox = async function(e) {
    if(e) e.stopPropagation(); 

    const box = document.getElementById('notification-dropdown'); 

    if (!box.classList.contains('show')) {
        box.classList.add('show'); 

        const btn = document.getElementById('enable-notifications-btn');
        if ('Notification' in window && Notification.permission === 'granted') {
            if (btn) btn.style.display = 'none';
        } else if (btn) {
            btn.style.display = 'block';
        }

        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            await window.requestNotificationPermission();
        }

        window.savedNotifications.forEach(n => n.read = true);
        localStorage.setItem('gam3a_notifications', JSON.stringify(window.savedNotifications));
        window.updateNotificationBadge();
        window.renderNotifications();
    } else {
        box.classList.remove('show');
    }
}

window.closeNotificationBox = function() {
    const box = document.getElementById('notification-dropdown');
    if(box) box.classList.remove('show');
}

window.requestNotificationPermission = async function() {
    try {
        const btn = document.getElementById('enable-notifications-btn');
        if(btn) btn.innerText = "جاري التفعيل...";

        if (!('Notification' in window)) {
            window.showToast("متصفحك لا يدعم الإشعارات", "#e74c3c");
            if(btn) btn.innerText = "تفعيل الإشعارات";
            return;
        }

        if (!('serviceWorker' in navigator)) {
            window.showToast("متصفحك لا يدعم Service Worker", "#e74c3c");
            if(btn) btn.innerText = "تفعيل الإشعارات";
            return;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            await navigator.serviceWorker.ready;
            const currentToken = await getToken(messaging, { 
                vapidKey: 'BMWdIiAsx9-L-msgleE9e19DVCXKtst9Bs0T4VHtaaUTddKOMSpjHImOmC9i980_rffeE061vi-jxWlqpGISArU',
                serviceWorkerRegistration: registration 
            });

            if (currentToken) {
                localStorage.setItem('fcm_token_saved', 'true');
                const tokenRef = doc(db, "fcm_tokens", currentToken);
                await setDoc(tokenRef, {
                    token: currentToken,
                    device: navigator.userAgent,
                    createdAt: Date.now()
                }, { merge: true });
                window.showToast("تم تفعيل الإشعارات بنجاح!", "#2ecc71");
                if(btn) btn.style.display = 'none';
            }
        } else if (permission === 'denied') {
            window.showToast("لقد قمت برفض الإشعارات من المتصفح", "#e74c3c");
            if(btn) btn.innerText = "تم الرفض";
        }
    } catch (error) {
        console.error('تنبيه الإشعارات:', error);
        window.showToast("حدث خطأ أثناء التفعيل", "#e74c3c");
        const btn = document.getElementById('enable-notifications-btn');
        if(btn) btn.innerText = "تفعيل الإشعارات";
    }
}

onMessage(messaging, (payload) => {
    const title = payload.notification.title || "إشعار جديد";
    const body = payload.notification.body || "";

    window.savedNotifications.push({
        title: title,
        body: body,
        time: Date.now(),
        read: false
    });

    if(window.savedNotifications.length > 50) {
        window.savedNotifications.shift();
    }

    localStorage.setItem('gam3a_notifications', JSON.stringify(window.savedNotifications));

    window.updateNotificationBadge();
    window.renderNotifications();
    window.showToast(`🔔 ${title}: ${body}`, "#9b59b6");
});

window.updateNotificationBadge();
window.renderNotifications();

initVisitorStats();