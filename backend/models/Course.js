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
        let sql = `
            SELECT c.*, 
                   COUNT(l.id) as total_lessons,
                   COUNT(CASE WHEN l.completed = TRUE THEN 1 END) as completed_lessons
            FROM courses c
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.user_id = ?
        `;
        const params = [userId];

        if (filters.status) {
            sql += ' AND c.status = ?';
            params.push(filters.status);
        }

        if (filters.search) {
            sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ' GROUP BY c.id';

        if (filters.sort === 'progress') {
            sql += ' ORDER BY completed_lessons / total_lessons DESC';
        } else if (filters.sort === 'deadline') {
            sql += ' ORDER BY c.end_date ASC';
        } else {
            sql += ' ORDER BY c.created_at DESC';
        }

        return await query(sql, params);
    }

    // Получить курс по ID
    static async findById(id) {
        const sql = `
            SELECT c.*, 
                   COUNT(l.id) as total_lessons,
                   COUNT(CASE WHEN l.completed = TRUE THEN 1 END) as completed_lessons
            FROM courses c
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.id = ?
            GROUP BY c.id
        `;
        const courses = await query(sql, [id]);
        return courses[0] || null;
    }

    // Обновление курса
    static async update(id, title, description, startDate, endDate, status) {
        const sql = `
            UPDATE courses 
            SET title = ?, description = ?, start_date = ?, end_date = ?, status = ?
            WHERE id = ?
        `;
        await query(sql, [title, description, startDate, endDate, status, id]);
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