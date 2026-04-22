const { query } = require('../config/database');

class Course {
    // Создание курса
    static async create(userId, title, description, startDate, endDate) {
        const sql = `
            INSERT INTO courses (user_id, title, description, start_date, end_date)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await query(sql, [userId, title, description, startDate, endDate]);
        return this.findById(result.insertId);
    }

    // Получить все курсы пользователя
    static async findAllByUser(userId, filters = {}) {
        const { status, search, sort } = filters;
        
        let sql = `SELECT * FROM courses WHERE user_id = ?`;
        const params = [userId];

        // ✅ Фильтрация по датам вместо status
        if (status === 'active') {
            sql += ` AND end_date >= CURDATE()`;
        } else if (status === 'completed') {
            // Нужно будет добавить логику проверки прогресса
        } else if (status === 'archived') {
            sql += ` AND end_date < CURDATE()`;
        }

        if (search) {
            sql += ` AND (title LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Сортировка
        if (sort === 'name') {
            sql += ` ORDER BY title ASC`;
        } else if (sort === 'deadline') {
            sql += ` ORDER BY end_date ASC`;
        } else if (sort === 'progress') {
            sql += ` ORDER BY created_at DESC`;
        } else {
            sql += ` ORDER BY created_at DESC`;
        }

        const courses = await query(sql, params);
        return courses;
    }

    // Получить курс по ID
    static async findById(id) {
        const sql = 'SELECT * FROM courses WHERE id = ?';
        const courses = await query(sql, [id]);
        return courses[0] || null;
    }

    // Обновление курса
    static async update(id, title, description, startDate, endDate, status) {
        const sql = `
            UPDATE courses 
            SET title = ?, description = ?, start_date = ?, end_date = ?
            WHERE id = ?
        `;
        const params = [
        title || null,
        description !== undefined ? description : null,
        startDate || null,
        endDate || null,
        id
    ];
    
        await query(sql, params);
        return this.findById(id);
    }

    // Удаление курса
    static async delete(id) {
        const sql = 'DELETE FROM courses WHERE id = ?';
        await query(sql, [id]);
        return true;
    }

    // Прогресс курса
    static async getProgress(courseId) {
        const sql = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed
            FROM lessons
            WHERE course_id = ?
        `;
        const result = await query(sql, [courseId]);
        const { total, completed } = result[0];
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
}

module.exports = Course;