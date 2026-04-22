const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const File = require('../models/File');
const path = require('path');
const fs = require('fs');

// Получить все уроки курса
exports.getLessons = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const lessons = await Lesson.findAllByCourse(courseId);

        // Добавляем файлы к каждому уроку
        const lessonsWithFiles = await Promise.all(
            lessons.map(async (lesson) => ({
                ...lesson,
                files: await File.findAllByLesson(lesson.id)
            }))
        );

        res.json({ lessons: lessonsWithFiles });
    } catch (error) {
        console.error('Ошибка получения уроков:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Создать урок
exports.createLesson = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, duration, lesson_date } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const lesson = await Lesson.create(
            courseId,
            title,
            description,
            duration || 0,
            lesson_date
        );

        res.status(201).json({
            message: 'Урок успешно создан',
            lesson
        });
    } catch (error) {
        console.error('Ошибка создания урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновить урок
exports.updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, duration, lesson_date, completed } = req.body;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }

        const course = await Course.findById(lesson.course_id);
        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const updated = await Lesson.update(
            id,
            title || lesson.title,
            description ?? lesson.description,
            duration ?? lesson.duration,
            lesson_date || lesson.lesson_date,
            completed ?? lesson.completed
        );

        res.json({
            message: 'Урок успешно обновлен',
            lesson: updated
        });
    } catch (error) {
        console.error('Ошибка обновления урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновить заметки урока
exports.updateNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }

        const course = await Course.findById(lesson.course_id);
        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const updated = await Lesson.updateNotes(id, notes);

        res.json({
            message: 'Заметки сохранены',
            lesson: updated
        });
    } catch (error) {
        console.error('Ошибка сохранения заметок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Переключить статус выполнения
exports.toggleComplete = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }

        const course = await Course.findById(lesson.course_id);
        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const courseProgress = await Course.getProgress(course.id);

        res.json({
            message: updated.completed ? 'Урок пройден!' : 'Прогресс сброшен',
            lesson: updated,
            courseProgress: courseProgress  // ✅ Отправляем прогресс курса
        });
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить урок
exports.deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findById(id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }

        const course = await Course.findById(lesson.course_id);
        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        await Lesson.delete(id);

        res.json({ message: 'Урок успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Загрузить файл
exports.uploadFile = async (req, res) => {
    try {
        const { lessonId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }

        const course = await Course.findById(lesson.course_id);
        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const file = await File.create(
            lessonId,
            req.file.filename,
            req.file.originalname,
            req.file.path.replace(/\\/g, '/'),
            req.file.size,
            req.file.mimetype
        );

        res.status(201).json({
            message: 'Файл успешно загружен',
            file
        });
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить файл
exports.deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const lesson = await Lesson.findById(file.lesson_id);
        const course = await Course.findById(lesson.course_id);

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        await File.delete(fileId);

        res.json({ message: 'Файл успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};