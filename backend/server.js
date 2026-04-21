const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ ИСПРАВЛЕННЫЙ CORS - разрешаем ВСЕ источники для разработки
app.use(cors({
    origin: true,  // Разрешить все origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SkillLvlUp API работает',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Запись уже существует' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ error: 'Связанная запись не найдена' });
    }
    res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

async function startServer() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Не удалось подключиться к базе данных');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ====================================');
            console.log('🚀 SkillLvlUp Backend запущен!');
            console.log('🚀 ====================================');
            console.log(`📍 Порт: ${PORT}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
            console.log('📁 Uploads: ./uploads');
            console.log('====================================');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

startServer();