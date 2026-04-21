const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const File = require('../models/File');

// Получить все курсы пользователя
// Получить все курсы пользователя
exports.getCourses = async (req, res) => {
    try {
        const { status, search, sort } = req.query;
        const filters = { status, search, sort };
        
        const courses = await Course.findAllByUser(req.user.id, filters);

        const coursesWithProgress = await Promise.all(
            courses.map(async (course) => {
                const progress = await Course.getProgress(course.id);
                // ✅ ДОБАВИТЬ: Загрузка уроков для каждого курса
                const lessons = await Lesson.findAllByCourse(course.id);
                
                return {
                    ...course,
                    progress: progress,
                    lessons: lessons  // ✅ Возвращаем уроки вместе с курсом
                };
            })
        );

        res.json({ courses: coursesWithProgress });
    } catch (error) {
        console.error('Ошибка получения курсов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить один курс
exports.getCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        course.progress = await Course.getProgress(id);
        course.lessons = await Lesson.findAllByCourse(id);

        for (const lesson of course.lessons) {
            lesson.files = await File.findAllByLesson(lesson.id);
        }

        res.json({ course });
    } catch (error) {
        console.error('Ошибка получения курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Создать курс
exports.createCourse = async (req, res) => {
    try {
        const { title, description, start_date, end_date } = req.body;

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ error: 'Название, дата начала и окончания обязательны' });
        }

        const course = await Course.create(
            req.user.id,
            title,
            description,
            start_date,
            end_date
        );

        res.status(201).json({
            message: 'Курс успешно создан',
            course
        });
    } catch (error) {
        console.error('Ошибка создания курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Обновить курс
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, start_date, end_date, status } = req.body;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const updated = await Course.update(
            id,
            title || course.title,
            description ?? course.description,
            start_date || course.start_date,
            end_date || course.end_date,
            status || course.status
        );

        res.json({
            message: 'Курс успешно обновлен',
            course: updated
        });
    } catch (error) {
        console.error('Ошибка обновления курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить курс
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        if (course.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        await Course.delete(id);

        res.json({ message: 'Курс успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

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

        for (const lesson of lessons) {
            lesson.files = await File.findAllByLesson(lesson.id);
        }

        res.json({ lessons });
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

        const updated = await Lesson.toggleComplete(id);

        res.json({
            message: updated.completed ? 'Урок пройден!' : 'Прогресс сброшен',
            lesson: updated
        });
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
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