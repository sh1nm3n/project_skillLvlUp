const { query } = require('../config/database');

class Lesson {
    // Создание урока
    static async create(courseId, title, description, duration, lessonDate) {
        const sql = `
            INSERT INTO lessons (course_id, title, description, duration, lesson_date)
            VALUES (?, ?, ?, ?, ?)
        `;
        const result = await query(sql, [courseId, title, description, duration, lessonDate]);
        return this.findById(result.insertId);
    }

    // Получить все уроки курса
    static async findAllByCourse(courseId) {
        const sql = `
            SELECT * FROM lessons
            WHERE course_id = ?
            ORDER BY created_at ASC
        `;
        return await query(sql, [courseId]);
    }

    // Получить урок по ID
    static async findById(id) {
        const sql = 'SELECT * FROM lessons WHERE id = ?';
        const lessons = await query(sql, [id]);
        return lessons[0] || null;
    }

    // Обновление урока
    static async update(id, title, description, duration, lessonDate, completed) {
        const sql = `
            UPDATE lessons 
            SET title = ?, description = ?, duration = ?, lesson_date = ?, completed = ?
            WHERE id = ?
        `;
        await query(sql, [title, description, duration, lessonDate, completed, id]);
        return this.findById(id);
    }

    // Обновление заметок
    static async updateNotes(id, notes) {
        const sql = 'UPDATE lessons SET notes = ? WHERE id = ?';
        await query(sql, [notes, id]);
        return this.findById(id);
    }

    // Удаление урока
    static async delete(id) {
        const sql = 'DELETE FROM lessons WHERE id = ?';
        await query(sql, [id]);
        return true;
    }

    // Переключение статуса выполнения
    static async toggleComplete(id) {
        const sql = `
            UPDATE lessons 
            SET completed = NOT completed 
            WHERE id = ?
        `;
        await query(sql, [id]);
        return this.findById(id);
    }
}

module.exports = Lesson;