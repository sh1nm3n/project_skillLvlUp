const { query } = require('../config/database');

// ✅ ОБНОВЛЕННО: Получить статистику пользователя с активностью
exports.getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const stats = await query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_courses,
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_courses,
                COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_courses,
                COUNT(DISTINCT l.id) as total_lessons,
                COUNT(DISTINCT CASE WHEN l.completed = TRUE THEN l.id END) as completed_lessons,
                COUNT(DISTINCT f.id) as total_files
            FROM users u
            LEFT JOIN courses c ON u.id = c.user_id
            LEFT JOIN lessons l ON c.id = l.course_id
            LEFT JOIN files f ON l.id = f.lesson_id
            WHERE u.id = ?
        `, [userId]);

        res.json({ stats: stats[0] });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить дедлайны
exports.getDeadlines = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const deadlines = await query(`
            SELECT 
                c.id,
                c.title,
                c.end_date,
                COUNT(l.id) as total_lessons,
                COUNT(CASE WHEN l.completed = TRUE THEN 1 END) as completed_lessons,
                DATEDIFF(c.end_date, CURDATE()) as days_remaining
            FROM courses c
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.user_id = ? AND c.status = 'active'
            GROUP BY c.id
            HAVING days_remaining <= 14
            ORDER BY days_remaining ASC
        `, [userId]);

        res.json({ deadlines });
    } catch (error) {
        console.error('Ошибка получения дедлайнов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить активность по дням
exports.getActivityByDays = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const activity = await query(`
            SELECT 
                DATE(activity_date) as date,
                COUNT(*) as count
            FROM user_activity
            WHERE user_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(activity_date)
            ORDER BY date ASC
        `, [userId]);

        res.json({ activity });
    } catch (error) {
        console.error('Ошибка получения активности:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Экспорт отчета (CSV)
exports.exportReport = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const courses = await query(`
            SELECT 
                c.title,
                c.start_date,
                c.end_date,
                c.status,
                COUNT(l.id) as lessons,
                COUNT(CASE WHEN l.completed = TRUE THEN 1 END) as completed
            FROM courses c
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.user_id = ?
            GROUP BY c.id
        `, [userId]);

        // Формирование CSV
        let csv = 'Название,Начало,Окончание,Статус,Уроков,Пройдено\n';
        courses.forEach(c => {
            csv += `"${c.title}",${c.start_date},${c.end_date},${c.status},${c.lessons},${c.completed}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=report.csv');
        res.send(csv);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};