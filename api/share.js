module.exports = async (req, res) => {
    const type = req.query.type;
    const code = req.query.code;

    // إخبار المتصفح/الكاش أن النتيجة تعتمد على نوع الزائر (بوت أو إنسان)
    res.setHeader('Vary', 'User-Agent');

    if (!code) {
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    // توسيع قائمة البوتات لضمان عمل المشاركة على جميع المنصات
    const isBot = /bot|facebook|whatsapp|telegram|viber|skype|twitter|discord|linkedin|slack|pinterest|applebot/i.test(userAgent);

    // توجيه الزوار العاديين فوراً لتطبيق الموقع الأساسي
    if (!isBot) {
        // استخدام encodeURIComponent لتأمين المدخلات في الروابط
        const safeCode = encodeURIComponent(code);
        const redirectUrl = type === 'product' ? `/?p=${safeCode}` : `/?m=${safeCode}`;
        res.writeHead(302, { 'Location': redirectUrl, 'Cache-Control': 'no-store' });
        return res.end();
    }

    // إعدادات جلب البيانات من فايربيز (للبوتات فقط)
    const projectId = 'marketing-e9fdf';
    const collectionName = type === 'product' ? 'ghosn_products' : 'gam3a_admins';

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    try {
        const response = await fetch(firestoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: collectionName }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'shortCode' },
                            op: 'EQUAL',
                            value: { stringValue: code } // Firestore يحمي المدخلات هنا تلقائياً
                        }
                    },
                    limit: 1
                }
            })
        });

        const data = await response.json();

        if (!data || !data[0] || !data[0].document) {
            throw new Error('لم يتم العثور على البيانات');
        }

        const fields = data[0].document.fields || {};

        let title, desc, imageUrl, siteUrl;

        if (type === 'product') {
            title = fields.name?.stringValue || 'Gam3a Store';

            const price = fields.price?.integerValue || fields.price?.doubleValue || '';
            if (price) {
                title += ` | ${price} ج.م`;
            }

            title += ` | كود: ${code}`;

            let productDesc = fields.description?.stringValue || 'تشكيلة رائعة بأفضل الأسعار. تسوق الآن من متجر الجامعة.';

            let phone = fields.whatsapp?.stringValue || '';
            let adminId = fields.adminId?.stringValue || '';

            if (!phone && adminId) {
                try {
                    const adminUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gam3a_admins/${adminId}`;
                    const adminRes = await fetch(adminUrl);
                    const adminData = await adminRes.json();
                    phone = adminData.fields?.phone?.stringValue || '';
                } catch (e) {
                    console.error('Error fetching admin phone:', e);
                }
            }

            if (!phone) {
                phone = '01206244875'; // تم تعديل الصيغة الافتراضية هنا لتجنب تكرار كود التحويل
            }

            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            desc = `الوصف: ${productDesc}\n\nللطلب تواصل واتساب على: ${phone}`;

            imageUrl = fields.images?.arrayValue?.values?.[0]?.stringValue || fields.img?.stringValue || '';
            siteUrl = `https://${req.headers.host}/p/${encodeURIComponent(code)}`;

        } else {
            title = `منتجات المسوق: ${fields.name?.stringValue || 'Gam3a Store'}`;

            let phone = fields.phone?.stringValue || '';
            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            const bio = fields.bio?.stringValue || '';
            desc = bio ? `${bio}\n\nللتواصل واتساب: ${phone}` : `للتواصل واتساب: ${phone}`;

            imageUrl = fields.image?.stringValue || '';
            siteUrl = `https://${req.headers.host}/m/${encodeURIComponent(code)}`;
        }

        // --- تحسين صور Cloudinary ---
        if (imageUrl.includes('res.cloudinary.com') && imageUrl.includes('/upload/')) {
            let cropTransform = '';
            let cleanUrl = imageUrl;

            if (imageUrl.includes('#crop=')) {
                const parts = imageUrl.split('#crop=');
                cleanUrl = parts[0];
                cropTransform = 'c_crop,' + parts[1] + '/';
            }

            let parts = cleanUrl.split('/upload/');
            let rawEnd = parts[1];

            let versionMatch = rawEnd.match(/(v\d+\/.*)/);
            if (versionMatch) {
                rawEnd = versionMatch[1]; 
            } else {
                let splitSlash = rawEnd.split('/');
                rawEnd = splitSlash[splitSlash.length - 1]; 
            }

            imageUrl = `${parts[0]}/upload/${cropTransform}c_limit,w_1200,q_auto,f_auto/${rawEnd}`;
        }

        // دالة حماية النصوص لمنع كسر أكواد HTML
        const escapeHTML = (str) => {
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const safeTitle = escapeHTML(title);
        const safeDesc = escapeHTML(desc);

        const botHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${safeTitle}</title>
    
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Gam3a Store" />
    <meta property="og:url" content="${siteUrl}" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
    <script>
        // إعادة توجيه إضافية في حال فتح البوت للصفحة بالخطأ باستخدام متغيرات آمنة
        window.location.href = "${type === 'product' ? `/?p=${encodeURIComponent(code)}` : `/?m=${encodeURIComponent(code)}`}";
    </script>
</body>
</html>
`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); 

        return res.status(200).send(botHtml);

    } catch (error) {
        console.error('Share preview error:', error);
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }
};