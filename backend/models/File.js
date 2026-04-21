const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');

class File {
    // Создание записи о файле
    static async create(lessonId, name, originalName, filePath, size, mimeType) {
        const sql = `
            INSERT INTO files (lesson_id, name, original_name, path, size, mime_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await query(sql, [lessonId, name, originalName, filePath, size, mimeType]);
        return this.findById(result.insertId);
    }

    // Получить все файлы урока
    static async findAllByLesson(lessonId) {
        const sql = 'SELECT * FROM files WHERE lesson_id = ? ORDER BY uploaded_at DESC';
        return await query(sql, [lessonId]);
    }

    // Получить файл по ID
    static async findById(id) {
        const sql = 'SELECT * FROM files WHERE id = ?';
        const files = await query(sql, [id]);
        return files[0] || null;
    }

    // Удаление файла
    static async delete(id) {
        const file = await this.findById(id);
        if (file) {
            // Удаляем физический файл
            const fullPath = path.join(__dirname, '..', file.path);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
            
            const sql = 'DELETE FROM files WHERE id = ?';
            await query(sql, [id]);
        }
        return true;
    }
}

module.exports = File;