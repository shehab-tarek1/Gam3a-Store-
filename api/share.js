module.exports = async (req, res) => {
    const type = req.query.type;
    const code = req.query.code;

    res.setHeader('Vary', 'User-Agent');

    if (!code) {
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /bot|facebook|whatsapp|telegram|viber|skype|twitter|discord|linkedin/i.test(userAgent);

    if (!isBot) {
        const redirectUrl = type === 'product' ? `/?p=${code}` : `/?m=${code}`;
        res.writeHead(302, { 'Location': redirectUrl, 'Cache-Control': 'no-store' });
        return res.end();
    }

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

            const price =
                fields.price?.integerValue ||
                fields.price?.doubleValue ||
                '';

            if (price) {
                title += ` | ${price} ج.م`;
            }

            title += ` | ك: ${code}`;

            // وصف المنتج
            let productDesc =
                fields.description?.stringValue ||
                'تسوق أحدث المنتجات.';

            // رقم التواصل
            let phone =
                fields.whatsapp?.stringValue || '';

            let adminId =
                fields.adminId?.stringValue || '';

            // لو مفيش رقم خاص بالمنتج
            if (!phone && adminId) {
                try {

                    const adminUrl =
                        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gam3a_admins/${adminId}`;

                    const adminRes = await fetch(adminUrl);

                    const adminData = await adminRes.json();

                    phone =
                        adminData.fields?.phone?.stringValue || '';

                } catch (e) {
                    console.error('Error fetching admin phone:', e);
                }
            }

            // رقم افتراضي
            if (!phone) {
                phone = '201206244875';
            }

            // تحويل 20 -> 0
            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            // الوصف النهائي
            desc = `الوصف: ${productDesc}\n\nللطلب تواصل مع: ${phone}`;

            // الصورة
            imageUrl =
                fields.images?.arrayValue?.values?.[0]?.stringValue ||
                fields.img?.stringValue ||
                '';

            siteUrl = `https://${req.headers.host}/p/${code}`;

        } else {

            // بروفايل المسوق
            title =
                `معرض منتجات المسوق: ${fields.name?.stringValue || 'gam3a store'}`;

            let phone =
                fields.phone?.stringValue || '';

            if (phone.startsWith('20')) {
                phone = '0' + phone.substring(2);
            }

            const bio =
                fields.bio?.stringValue || '';

            desc = bio
                ? `${bio}\n\nللتواصل: ${phone}`
                : `للتواصل: ${phone}`;

            imageUrl =
                fields.image?.stringValue || '';

            siteUrl = `https://${req.headers.host}/m/${code}`;
        }

        // تحسين صور Cloudinary + دعم crop
        if (imageUrl.includes('cloudinary.com')) {

            // استخراج crop من الرابط
            const cropMatch =
                imageUrl.match(/#crop=([^&]+)/);

            let cropTransform = '';

            // لو فيه crop محفوظ
            if (cropMatch && cropMatch[1]) {
                cropTransform =
                    `c_crop,${cropMatch[1]}/`;
            }

            // حذف #crop من الرابط
            imageUrl =
                imageUrl.split('#')[0];

            // تطبيق التحويلات الجديدة
            imageUrl = imageUrl.replace(
                /\/upload\/(?:[a-zA-Z0-9_,-]+\/)?/,
                `/upload/${cropTransform}w_900,q_auto,f_auto/`
            );
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

<meta property="og:image:width" content="900" />

<meta property="og:image:height" content="900" />

<meta property="og:site_name" content="Ghosn STORE" />

<meta property="og:url" content="${siteUrl}" />

<meta name="twitter:card" content="summary_large_image" />

<meta name="twitter:title" content="${title}" />

<meta name="twitter:description" content="${desc}" />

<meta name="twitter:image" content="${imageUrl}" />

</head>
<body></body>
</html>
`;

        res.setHeader(
            'Content-Type',
            'text/html; charset=utf-8'
        );

        res.setHeader(
            'Cache-Control',
            'public, max-age=3600'
        );

        return res.status(200).send(botHtml);

    } catch (error) {

        console.error(
            'Share preview error:',
            error
        );

        res.writeHead(302, {
            'Location': '/',
            'Cache-Control': 'no-store'
        });

        return res.end();
    }
};