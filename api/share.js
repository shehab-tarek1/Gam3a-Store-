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
        const redirectUrl = type === 'product' ? `/?p=${code}` : `/?m=${code}`;
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
                            value: { stringValue: code }
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
            // عنوان المنتج
            title = fields.name?.stringValue || 'gam3a store';

            const price = fields.price?.integerValue || fields.price?.doubleValue || '';
            if (price) {
                title += ` | ${price} ج.م`;
            }

            title += ` | كود: ${code}`;

            // وصف المنتج
            let productDesc = fields.description?.stringValue || 'تشكيلة رائعة بأفضل الأسعار. تسوق الآن من gam3a store.';

            // رقم التواصل
            let phone = fields.whatsapp?.stringValue || '';
            let adminId = fields.adminId?.stringValue || '';

            // جلب رقم المسوق إذا لم يكن هناك رقم مخصص للمنتج
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

            // رقم المتجر الافتراضي
            if (!phone) {
                phone = '201206244875';
            }

            // تحويل 20 إلى 0 لتنسيق الرقم المصري محلياً
            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            desc = `الوصف: ${productDesc}\n\nللطلب تواصل واتساب على: ${phone}`;

            // الصورة
            imageUrl = fields.images?.arrayValue?.values?.[0]?.stringValue || fields.img?.stringValue || '';
            siteUrl = `https://${req.headers.host}/p/${code}`;

        } else {
            // بروفايل المسوق
            title = `منتجات المسوق: ${fields.name?.stringValue || 'gam3a store'}`;

            let phone = fields.phone?.stringValue || '';
            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            const bio = fields.bio?.stringValue || '';
            desc = bio ? `${bio}\n\nللتواصل واتساب: ${phone}` : `للتواصل واتساب: ${phone}`;

            imageUrl = fields.image?.stringValue || '';
            siteUrl = `https://${req.headers.host}/m/${code}`;
        }

        // --- تحسين صور Cloudinary ودعم القص (Crop) بشكل آمن 100% ---
        if (imageUrl.includes('res.cloudinary.com') && imageUrl.includes('/upload/')) {
            let cropTransform = '';
            let cleanUrl = imageUrl;

            // لو فيه crop محفوظ من الفرونت إند
            if (imageUrl.includes('#crop=')) {
                const parts = imageUrl.split('#crop=');
                cleanUrl = parts[0];
                cropTransform = 'c_crop,' + parts[1] + '/';
            }

            let parts = cleanUrl.split('/upload/');
            let rawEnd = parts[1];
            
            // تنظيف الرابط من أي فلاتر قديمة للحفاظ على جودة واسم الصورة
            let versionMatch = rawEnd.match(/(v\d+\/.*)/);
            if (versionMatch) {
                rawEnd = versionMatch[1]; 
            } else {
                let splitSlash = rawEnd.split('/');
                rawEnd = splitSlash[splitSlash.length - 1]; 
            }

            // تجميع الرابط الجديد للبوتات بجودة واضحة وبحجم مناسب لـ Open Graph (1200x630 هو الحجم القياسي)
            imageUrl = `${parts[0]}/upload/${cropTransform}c_limit,w_1200,q_auto,f_auto/${rawEnd}`;
        }

        const botHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="gam3a store" />
    <meta property="og:url" content="${siteUrl}" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
    <script>
        // إعادة توجيه إضافية في حال فتح البوت للصفحة بالخطأ
        window.location.href = "${type === 'product' ? `/?p=${code}` : `/?m=${code}`}";
    </script>
</body>
</html>
`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // كاش للبوتات لمدة ساعة لتخفيف الضغط على قاعدة البيانات
        res.setHeader('Cache-Control', 'public, max-age=3600'); 

        return res.status(200).send(botHtml);

    } catch (error) {
        console.error('Share preview error:', error);
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }
};