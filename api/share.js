module.exports = async (req, res) => {
    const type = req.query.type; // يحدد هل الرابط لمنتج (p) أم لمسوق (m)
    const code = req.query.code;

    // إخبار الخادم بفصل الكاش بناءً على نوع المتصفح
    res.setHeader('Vary', 'User-Agent');

    // إذا لم يكن هناك كود، وجهه للرئيسية
    if (!code) {
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // فلتر قوي لكشف جميع روبوتات منصات التواصل الاجتماعي 
    const isBot = /bot|facebook|whatsapp|telegram|viber|skype|twitter|discord|linkedin/i.test(userAgent);

    // 🔴 إذا كان زائر بشري حقيقي، يتم توجيهه فورا للمتجر بذكاء 
    if (!isBot) {
        const redirectUrl = type === 'product' ? `/?p=${code}` : `/?m=${code}`;
        res.writeHead(302, { 'Location': redirectUrl, 'Cache-Control': 'no-store' });
        return res.end();
    }

    // 🟢 إذا كان روبوت (واتساب، فيسبوك، الخ)، نجلب البيانات ونصنع له المعاينة
    const projectId = 'marketing-e9fdf'; 
    const collectionName = type === 'product' ? 'ghosn_products' : 'gam3a_admins';

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    try {
        // البحث برقم الكود في قاعدة البيانات المناسبة
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

        // تجهيز بيانات المعاينة (البطاقة)
        if (type === 'product') {
            title = fields.name?.stringValue || 'Ghosn STORE';
            const price = fields.price?.integerValue || fields.price?.doubleValue || '';
            desc = `🔖 كود المنتج: ${code}\n${fields.description?.stringValue || 'تسوق أحدث المنتجات.'}`;
            if (price) title += ` | ${price} ج.م`;
            
            imageUrl = fields.images?.arrayValue?.values?.[0]?.stringValue || fields.img?.stringValue || '';
            siteUrl = `https://${req.headers.host}/p/${code}`;
        } else {
            // تجهيز بيانات المعاينة (بروفايل المسوق)
            title = `المسوق: ${fields.name?.stringValue || 'Ghosn STORE'}`;
            desc = `تصفح أحدث الموديلات والمنتجات من ${fields.name?.stringValue || 'هذا المسوق'} - ${fields.address?.stringValue || ''}`;
            imageUrl = fields.image?.stringValue || '';
            siteUrl = `https://${req.headers.host}/m/${code}`;
        }

        // تحسين جودة الصورة وعرضها بحجم مناسب لفيسبوك وواتساب
        if (imageUrl.includes('cloudinary.com')) {
            imageUrl = imageUrl.replace(/\/upload\/(?:[a-zA-Z0-9_,-]+\/)?/, '/upload/w_600,h_600,c_fill,q_80,f_jpg/');
        }

        // كود الـ HTML الصامت الذي يقرأه الروبوت
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
                <meta property="og:image:width" content="600" />
                <meta property="og:image:height" content="600" />
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

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(botHtml);

    } catch (error) {
        console.error("Share preview error:", error);
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }
};