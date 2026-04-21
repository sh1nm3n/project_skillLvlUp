const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const lessonController = require('../controllers/lessonController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|doc|docx|txt|jpg|jpeg|png/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        cb(null, ext);
    }
});

// Все маршруты защищены
router.use(authenticateToken);

// Курсы
router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.get('/:id', courseController.getCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// Уроки
router.get('/:courseId/lessons', courseController.getLessons);
router.post('/:courseId/lessons', courseController.createLesson);
router.put('/lessons/:id', courseController.updateLesson);
router.patch('/lessons/:id/complete', courseController.toggleComplete);
router.put('/lessons/:id/notes', courseController.updateNotes);
router.delete('/lessons/:id', courseController.deleteLesson);

// Файлы
router.post('/lessons/:lessonId/files', upload.single('file'), courseController.uploadFile);
router.delete('/files/:fileId', courseController.deleteFile);

module.exports = router;