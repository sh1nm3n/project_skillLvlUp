const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Создание пользователя
    static async create(name, email, password, role = 'user') {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (name, email, password, role) 
            VALUES (?, ?, ?, ?)
        `;
        
        // ✅ УБРАТЬ [] если query возвращает rows напрямую
        const result = await query(sql, [name, email, hashedPassword, role]);
        
        return { 
            id: result.insertId, 
            name, 
            email, 
            role 
        };
    }

    // Поиск по email
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await query(sql, [email]);
        // ✅ Если query возвращает массив пользователей
        return Array.isArray(users) ? users[0] : null;
    }

    // Поиск по ID
    static async findById(id) {
        const sql = 'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?';
        const users = await query(sql, [id]);
        return users[0] || null;
    }

    // Проверка пароля
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Обновление профиля
    static async update(id, name, email) {
        const sql = `
            UPDATE users SET name = ?, email = ? WHERE id = ?
        `;
        await query(sql, [name, email, id]);
        return this.findById(id);
    }

    // Статистика пользователя
    static async getStats(userId) {
        const sql = `
            SELECT 
                COUNT(DISTINCT c.id) as total_courses,
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_courses,
                COUNT(DISTINCT CASE WHEN l.completed = TRUE THEN l.id END) as completed_lessons
            FROM users u
            LEFT JOIN courses c ON u.id = c.user_id
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE u.id = ?
        `;
        const stats = await query(sql, [userId]);
        return stats[0];
    }
}

module.exports = User;