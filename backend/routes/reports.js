const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты защищены
router.use(authenticateToken);

// Статистика
router.get('/stats', reportController.getUserStats);

// Дедлайны
router.get('/deadlines', reportController.getDeadlines);

// Активность
router.get('/activity', reportController.getActivityByDays);

// Экспорт
router.get('/export', reportController.exportReport);

module.exports = router;