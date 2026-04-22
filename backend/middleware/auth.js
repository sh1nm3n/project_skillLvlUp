const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : authHeader;

    if (!token) {
        console.error('Токен не предоставлен');
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    try {
        console.log('Проверка токена:', token.substring(0, 20) + '...');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Токен декодирован:', decoded);
        
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            console.error('Пользователь не найден:', decoded.userId);
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Срок действия токена истек' });
        }
        
        return res.status(403).json({ error: 'Неверный токен' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
}

module.exports = { authenticateToken, requireAdmin };