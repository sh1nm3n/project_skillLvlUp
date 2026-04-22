// app.js - Исправленная версия с календарём
class SkillLvlUpApp {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.currentPage = 'dashboard';
        this.activeCourse = null;
        this.editingCourseId = null;
        this.editingLessonId = null;
        this.courseToDelete = null;
        this.calendar = null;
        this.filesManager = null;
        this.exportManager = null;
        this.api = new ApiService('http://localhost:3000/api');
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.initModules();
        this.bindEvents();
        this.currentUser ? this.showApp() : this.showAuth();
    }

    async checkAuth() {
        if (this.api.token) {
            try {
                const response = await this.api.getProfile();
                this.currentUser = response.user;
                await this.loadCourses();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.api.clearToken();
                this.currentUser = null;
            }
        }
    }

    async loadCourses() {
        try {
            const response = await this.api.getCourses();
            this.courses = response.courses || [];
            this.courses.forEach(course => {
                if (course.start_date && !course.startDate) {
                    course.startDate = course.start_date;
                }
                if (course.end_date && !course.endDate) {
                    course.endDate = course.end_date;
                }
                if (course.lessons) {
                    course.lessons.forEach(lesson => {
                        if (lesson.lesson_date && !lesson.date) {
                            lesson.date = lesson.lesson_date;
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.courses = [];
        }
    }

    async refreshAllData() {
        try {
            await this.loadCourses();
            this.renderDashboard();
            
            if (this.currentPage === 'courses') {
                this.renderCoursesPage();
            }
            
            if (this.currentPage === 'reports') {
                this.renderReports();
                this.renderCharts();
            }
            
            if (this.calendar) {
                this.calendar.refresh();
            }
            
            if (this.activeCourse) {
                await this.loadCourseDetail(this.activeCourse.id);
                this.renderLessonList();
            }
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
        }
    }

    // ✅ МЕТОД ДЛЯ ПОЛУЧЕНИЯ СОБЫТИЙ НА ДАТУ (для календаря)
    getEventsForDate(dateKey) {
        const events = [];
        const now = new Date();
        
        this.courses.forEach(course => {
            // ✅ Дедлайн курса (дата окончания) - БЕЗ ПРОВЕРКИ STATUS
            const endDate = course.endDate || course.end_date;
            if (endDate) {
                const endDateFormatted = new Date(endDate).toISOString().split('T')[0];
                // ✅ Убрали проверку course.status === 'active'
                if (endDateFormatted === dateKey) {
                    events.push({ 
                        type: 'deadline', 
                        title: `📅 Дедлайн: ${course.title}`, 
                        course,
                        description: 'Дата окончания курса'
                    });
                }
            }
            
            // ✅ Уроки курса
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                const lessonDate = lesson.lesson_date || lesson.date;
                if (lessonDate) {
                    const lessonDateFormatted = new Date(lessonDate).toISOString().split('T')[0];
                    if (lessonDateFormatted === dateKey) {
                        events.push({ 
                            type: 'lesson', 
                            title: `📚 ${lesson.title}`, 
                            course, 
                            lesson,
                            description: `Урок из курса "${course.title}"`,
                            completed: lesson.completed || false
                        });
                    }
                }
            });
        });
        
        return events;
    }

    // ✅ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ВСЕХ СОБЫТИЙ ДЛЯ КАЛЕНДАРЯ
    getAllCalendarEvents() {
        const events = [];
        
        this.courses.forEach(course => {
            // Дедлайн курса - БЕЗ ПРОВЕРКИ STATUS
            const endDate = course.endDate || course.end_date;
            if (endDate) {
                const endDateFormatted = new Date(endDate).toISOString().split('T')[0];
                events.push({
                    date: endDateFormatted,
                    type: 'deadline',
                    title: `Дедлайн: ${course.title}`,
                    course
                });
            }
            
            // Уроки
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                const lessonDate = lesson.lesson_date || lesson.date;
                if (lessonDate) {
                    const lessonDateFormatted = new Date(lessonDate).toISOString().split('T')[0];
                    events.push({
                        date: lessonDateFormatted,
                        type: 'lesson',
                        title: lesson.title,
                        course,
                        lesson,
                        completed: lesson.completed || false
                    });
                }
            });
        });
        
        return events;
    }

    async register(name, email, password) {
        try {
            const response = await this.api.register(name, email, password);
            this.currentUser = response.user;
            await this.loadCourses();
            this.showApp();
            this.showToast('Аккаунт успешно создан!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async login(email, password) {
        try {
            const response = await this.api.login(email, password);
            this.currentUser = response.user;
            await this.loadCourses();
            this.showApp();
            this.showToast('Добро пожаловать!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.courses = [];
        this.api.clearToken();
        this.showAuth();
        this.showToast('Вы вышли из системы', 'info');
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    updateUserInfo() {
        if (!this.currentUser) return;
        const { name, email, initials } = this.currentUser;
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-avatar').textContent = initials || this.getInitials(name);
        document.getElementById('profile-name').value = name;
        document.getElementById('profile-email').value = email;
    }

    navigateTo(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        document.querySelectorAll('.page-content').forEach(c => c.style.display = 'none');
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) pageElement.style.display = 'block';
        this.updatePageHeader(page);
        this.renderPage(page);

        if (page === 'reports') {
            setTimeout(() => {
                this.renderCharts();
            }, 200);
        }
    }

    updatePageHeader(page) {
        const headers = {
            dashboard: ['Главная', 'Обзор прогресса'],
            courses: ['Курсы', 'Управление курсами'],
            reports: ['Отчеты', 'Статистика'],
            profile: ['Настройки', 'Профиль']
        };
        const [title, subtitle] = headers[page] || [page, ''];
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;
    }

    renderPage(page) {
        const methods = { 
            dashboard: 'renderDashboard', 
            courses: 'renderCoursesPage', 
            reports: 'renderReports' 
        };
        if (methods[page]) this[methods[page]]();
    }

    renderDashboard() {
        const activeCourses = this.courses.filter(c => c.status === 'active').length;
        const completedLessons = this.courses.reduce((acc, c) => {
            const lessons = c.lessons || [];
            return acc + lessons.filter(l => l.completed).length;
        }, 0);
        const now = new Date();
        const upcomingDeadlines = this.courses.filter(c => {
            const endDate = c.endDate || c.end_date;
            if (!endDate) return false;
            const diffDays = Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24));
            return diffDays <= 7 && c.status === 'active';
        }).length;
        const totalFiles = this.courses.reduce((acc, c) => 
            acc + (c.lessons || []).reduce((lAcc, l) => lAcc + (l.files?.length || 0) + (l.notes ? 1 : 0), 0), 0);

        this.animateStatUpdate('stat-active-courses', activeCourses);
        this.animateStatUpdate('stat-completed-lessons', completedLessons);
        this.animateStatUpdate('stat-upcoming-deadlines', upcomingDeadlines);
        this.animateStatUpdate('stat-total-files', totalFiles);

        const courseList = document.getElementById('dashboard-course-list');
        if (this.courses.length === 0) {
            courseList.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i><h3>Нет курсов</h3></div>`;
        } else {
            this.renderCourseList(this.courses.slice(0, 3), 'dashboard-course-list');
        }

        this.renderDeadlines();
        if (this.calendar) this.calendar.refresh();
    }

    animateStatUpdate(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const oldValue = parseInt(element.textContent) || 0;
        
        if (oldValue !== newValue) {
            element.classList.add('updated');
            element.textContent = newValue;
            
            setTimeout(() => {
                element.classList.remove('updated');
            }, 400);
        }
    }

    renderDeadlines() {
        const container = document.getElementById('dashboard-deadlines');
        const now = new Date();
        
        const deadlines = this.courses
            .filter(c => c.status === 'active')
            .map(course => {
                const endDate = course.endDate || course.end_date;
                if (!endDate) return null;
                
                const diffDays = Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24));
                return { 
                    course, 
                    endDate: new Date(endDate), 
                    diffDays 
                };
            })
            .filter(d => d !== null && d.diffDays <= 14)
            .sort((a, b) => a.diffDays - b.diffDays)
            .slice(0, 5);

        if (deadlines.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Нет дедлайнов</p></div>`;
            return;
        }

        container.innerHTML = deadlines.map(d => {
            const urgencyClass = d.diffDays <= 3 ? 'urgent' : d.diffDays <= 7 ? 'soon' : 'normal';
            const daysText = d.diffDays === 0 ? 'Сегодня!' : `${d.diffDays} дн.`;
            return `
                <div class="deadline-item ${urgencyClass}" onclick="app.openCourseDetail(${d.course.id})">
                    <div class="deadline-icon">
                        <i class="fas fa-flag"></i>
                    </div>
                    <div class="deadline-info">
                        <div class="deadline-course">${d.course.title}</div>
                        <div class="deadline-date">${d.endDate.toLocaleDateString('ru-RU')}</div>
                    </div>
                    <span class="deadline-days">${daysText}</span>
                </div>`;
        }).join('');
    }

    renderCourseList(courses, containerId) {
        const container = document.getElementById(containerId);
        if (courses.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i><p>Не найдено</p></div>`;
            return;
        }

        container.innerHTML = courses.map(course => {
            const progress = this.getCourseProgress(course);
            const endDate = course.endDate || course.end_date;
            const startDate = course.startDate || course.start_date;
            const lessonsCount = (course.lessons || []).length;
            
            return `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-card-actions">
                        <button class="course-action-btn edit" onclick="app.editCourse(event, ${course.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="course-action-btn delete" onclick="app.deleteCourse(event, ${course.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="course-header">
                        <h3>${course.title}</h3>
                    </div>
                    <div class="course-body">
                        <p class="course-desc">${course.description || 'Нет описания'}</p>
                        <p class="course-meta">
                            <i class="fas fa-calendar"></i> 
                            ${startDate ? new Date(startDate).toLocaleDateString('ru-RU') : 'Не указана'} - 
                            ${endDate ? new Date(endDate).toLocaleDateString('ru-RU') : 'Не указана'}
                        </p>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${progress === 100 ? 'completed' : ''}" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-row">
                            <span>${progress}%</span>
                            <span>${lessonsCount} уроков</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.course-card-actions')) return;
                this.openCourseDetail(parseInt(card.dataset.courseId));
            });
        });
    }

    getCourseProgress(course) {
        if (!course || !course.lessons || !Array.isArray(course.lessons)) return 0;
        if (course.lessons.length === 0) return 0;
        const completed = course.lessons.filter(l => l.completed).length;
        return Math.round((completed / course.lessons.length) * 100);
    }

    renderCoursesPage() {
        const searchTerm = document.getElementById('course-search')?.value.toLowerCase() || '';
        const filter = document.getElementById('course-filter')?.value || 'all';
        const sort = document.getElementById('course-sort')?.value || 'name';

        let filtered = this.courses.filter(course => {
            const matchSearch = course.title.toLowerCase().includes(searchTerm) || 
                               course.description?.toLowerCase().includes(searchTerm);
            const matchFilter = filter === 'all' || 
                               (filter === 'active' && course.status === 'active') || 
                               (filter === 'completed' && this.getCourseProgress(course) === 100);
            return matchSearch && matchFilter;
        });

        filtered.sort((a, b) => {
            if (sort === 'name') return a.title.localeCompare(b.title);
            if (sort === 'progress') return this.getCourseProgress(b) - this.getCourseProgress(a);
            if (sort === 'deadline') return new Date(a.endDate || a.end_date) - new Date(b.endDate || b.end_date);
            return 0;
        });

        const container = document.getElementById('courses-page-list');
        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Не найдено</h3></div>`;
        } else {
            this.renderCourseList(filtered, 'courses-page-list');
        }
    }

    async openCourseDetail(courseId) {
        try {
            await this.loadCourseDetail(courseId);
            
            if (!this.activeCourse) return;

            document.getElementById('course-detail-page').style.display = 'block';
            document.querySelectorAll('.page-content').forEach(c => { 
                if (c.id !== 'course-detail-page') c.style.display = 'none'; 
            });

            document.getElementById('detail-course-title').textContent = this.activeCourse.title;
            document.getElementById('detail-course-description').textContent = this.activeCourse.description || 'Нет описания';
            
            const progress = this.getCourseProgress(this.activeCourse);
            document.getElementById('detail-course-progress').textContent = `${progress}%`;
            document.getElementById('detail-progress-bar').style.width = `${progress}%`;
            
            const startDate = this.activeCourse.startDate || this.activeCourse.start_date;
            const endDate = this.activeCourse.endDate || this.activeCourse.end_date;
            
            document.getElementById('detail-course-deadline').textContent = endDate ? 
                new Date(endDate).toLocaleDateString('ru-RU') : 'Не указана';
            document.getElementById('detail-course-start').textContent = startDate ? 
                new Date(startDate).toLocaleDateString('ru-RU') : 'Не указана';
            
            const lessonsCount = (this.activeCourse.lessons || []).length;
            document.getElementById('lessons-count').textContent = `${lessonsCount} уроков`;

            this.renderLessonList();
            document.getElementById('page-title').textContent = this.activeCourse.title;
            document.getElementById('page-subtitle').textContent = 'Детали курса';
        } catch (error) {
            console.error('Error opening course:', error);
            this.showToast('Ошибка загрузки курса', 'error');
        } 
    }

    renderLessonList() {
        const container = document.getElementById('lesson-list');
        const lessons = this.activeCourse?.lessons || [];
        
        if (!lessons.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Нет уроков</h3>
                </div>`;
            return;
        }

        container.innerHTML = lessons.map((lesson, index) => {
            const filesCount = lesson.files?.length || 0;
            const hasNotes = !!lesson.notes;
            const materials = filesCount || hasNotes ? 
                `<span class="lesson-files-indicator" onclick="app.openLessonFiles(event, ${lesson.id})">
                    <i class="fas fa-paperclip"></i> ${filesCount + (hasNotes ? 1 : 0)}
                </span>` : '';
            
            return `
                <div class="lesson-item" data-lesson-id="${lesson.id}">
                    <input type="checkbox" ${lesson.completed ? 'checked' : ''} 
                        data-lesson-id="${lesson.id}" class="lesson-checkbox">
                    <span class="lesson-number">${index + 1}.</span>
                    <div class="lesson-info">
                        <span class="lesson-title ${lesson.completed ? 'completed' : ''}">${lesson.title}</span>
                        ${lesson.description ? `<p class="lesson-description">${lesson.description}</p>` : ''}
                        ${lesson.lesson_date || lesson.date ? 
                            `<span class="lesson-date"><i class="fas fa-calendar"></i> ${new Date(lesson.lesson_date || lesson.date).toLocaleDateString('ru-RU')}</span>` 
                            : ''}
                        ${materials}
                    </div>
                    <span class="lesson-duration">${lesson.duration} мин.</span>
                    <button class="btn btn-sm btn-secondary lesson-btn" onclick="app.openLessonFiles(event, ${lesson.id})">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary lesson-btn" onclick="app.editLesson(event, ${lesson.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger lesson-btn" onclick="app.deleteLesson(event, ${lesson.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
        }).join('');

        container.querySelectorAll('.lesson-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                this.toggleLessonCompletion(parseInt(e.target.dataset.lessonId));
            });
        });
    }

    openLessonFiles(event, lessonId) {
        event.stopPropagation();
        const lesson = this.activeCourse.lessons.find(l => l.id === lessonId);
        if (lesson) this.filesManager.open(this.activeCourse, lesson);
    }

    async toggleLessonCompletion(lessonId) {
        try {
            const response = await this.api.toggleLessonComplete(lessonId);
            await this.loadCourseDetail(this.activeCourse.id);
            await this.loadCourses();
            const newProgress = this.getCourseProgress(this.activeCourse);
            this.animateProgressUpdate(this.activeCourse.id, newProgress);
            this.renderLessonList();
            setTimeout(() => {
                const lessonItem = document.querySelector(`[data-lesson-id="${lessonId}"]`);
                if (lessonItem) {
                    lessonItem.classList.add('status-changed');
                    setTimeout(() => {
                        lessonItem.classList.remove('status-changed');
                    }, 400);
                }
            }, 100);
            this.renderDashboard();
            if (this.currentPage === 'courses') {
                this.renderCoursesPage();
            }
            const lesson = this.activeCourse?.lessons.find(l => l.id === lessonId);
            this.showToast(
                lesson?.completed ? 'Урок пройден!' : 'Прогресс сброшен', 
                lesson?.completed ? 'success' : 'info'
            );
            this.refreshCharts();
            if (this.calendar) {
                this.calendar.refresh();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadCourseDetail(courseId) {
        try {
            const response = await this.api.getCourse(courseId);
            this.activeCourse = response.course;
            
            if (this.activeCourse) {
                if (this.activeCourse.start_date && !this.activeCourse.startDate) {
                    this.activeCourse.startDate = this.activeCourse.start_date;
                }
                if (this.activeCourse.end_date && !this.activeCourse.endDate) {
                    this.activeCourse.endDate = this.activeCourse.end_date;
                }
                if (!this.activeCourse.lessons) {
                    this.activeCourse.lessons = [];
                }
                
                this.activeCourse.lessons.forEach(lesson => {
                    if (lesson.lesson_date && !lesson.date) {
                        lesson.date = lesson.lesson_date;
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load course detail:', error);
            this.showToast('Ошибка загрузки курса', 'error');
        }
    }

    closeCourseDetail() {
        document.getElementById('course-detail-page').style.display = 'none';
        this.navigateTo(this.currentPage);
        this.activeCourse = null;
    }

    openCourseModal(courseId = null) {
        this.editingCourseId = courseId;
        const modal = document.getElementById('course-modal');
        const title = document.getElementById('course-modal-title');
        const form = document.getElementById('new-course-form');
        form.reset();

        if (courseId) {
            const course = this.courses.find(c => c.id === courseId);
            if (course) {
                title.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
                document.getElementById('course-title').value = course.title;
                document.getElementById('course-description').value = course.description || '';
                document.getElementById('course-start-date').value = course.startDate || course.start_date;
                document.getElementById('course-end-date').value = course.endDate || course.end_date;
            }
        } else {
            title.innerHTML = '<i class="fas fa-plus-circle"></i> Новый курс';
            document.getElementById('course-start-date').value = this.getTodayDate();
            document.getElementById('course-end-date').value = this.getDateOffset(30);
        }
        modal.style.display = 'flex';
    }

    closeCourseModal() {
        document.getElementById('course-modal').style.display = 'none';
        this.editingCourseId = null;
    }

    async saveCourse(title, description, startDate, endDate) {
        try {
            // ✅ ИСПРАВЛЕНО: Проверяем обязательные поля
            if (!title || !startDate || !endDate) {
                this.showToast('Заполните все обязательные поля', 'error');
                return;
            }
            
            if (this.editingCourseId) {
                await this.api.updateCourse(this.editingCourseId, { 
                    title: title.trim(),
                    description: description ? description.trim() : '',
                    start_date: startDate,
                    end_date: endDate
                });
                this.showToast('Курс успешно обновлен!', 'success');
            } else {
                await this.api.createCourse({ 
                    title: title.trim(),
                    description: description ? description.trim() : '',
                    start_date: startDate,
                    end_date: endDate
                });
                this.showToast('Курс успешно создан!', 'success');
            }
            await this.refreshAllData();
            this.closeCourseModal();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    editCourse(event, courseId) {
        event.stopPropagation();
        this.openCourseModal(courseId);
    }

    deleteCourse(event, courseId) {
        event.stopPropagation();
        const course = this.courses.find(c => c.id === courseId);
        if (course) {
            document.getElementById('delete-course-name').textContent = course.title;
            document.getElementById('delete-modal').style.display = 'flex';
            this.courseToDelete = courseId;
        }
    }

    async confirmDeleteCourse() {
    if (this.courseToDelete) {
        try {
            await this.api.deleteCourse(this.courseToDelete);
            this.showToast('Курс успешно удален!', 'success');
            await this.refreshAllData();
            this.closeDeleteModal();
            
            if (this.activeCourse?.id === this.courseToDelete) {
                this.closeCourseDetail();
            }
            
            this.courseToDelete = null;
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
}

    closeDeleteModal() {
        document.getElementById('delete-modal').style.display = 'none';
        this.courseToDelete = null;
    }

    openLessonModal(lessonId = null) {
        this.editingLessonId = lessonId;
        const modal = document.getElementById('lesson-modal');
        const title = document.getElementById('lesson-modal-title');
        const form = document.getElementById('new-lesson-form');
        form.reset();

        if (lessonId && this.activeCourse) {
            const lesson = this.activeCourse.lessons.find(l => l.id === lessonId);
            if (lesson) {
                title.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
                document.getElementById('lesson-title').value = lesson.title;
                document.getElementById('lesson-duration').value = lesson.duration;
                document.getElementById('lesson-date').value = lesson.date || lesson.lesson_date || this.getTodayDate();
                document.getElementById('lesson-description').value = lesson.description || '';
            }
        } else {
            title.innerHTML = '<i class="fas fa-plus-circle"></i> Добавить урок';
            document.getElementById('lesson-date').value = this.getTodayDate();
        }
        modal.style.display = 'flex';
    }

    closeLessonModal() {
        document.getElementById('lesson-modal').style.display = 'none';
        this.editingLessonId = null;
    }

    async saveLesson(title, duration, date, description) {
        if (!this.activeCourse) return;
        
        try {
            if (this.editingLessonId) {
                await this.api.updateLesson(this.editingLessonId, {
                    title, duration: parseInt(duration), lesson_date: date, description
                });
                this.showToast('Урок успешно обновлен!', 'success');
            } else {
                await this.api.createLesson(this.activeCourse.id, {
                    title, duration: parseInt(duration), lesson_date: date, description
                });
                this.showToast('Урок успешно добавлен!', 'success');
            }
            await this.refreshAllData();
            this.closeLessonModal();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    editLesson(event, lessonId) {
        event.stopPropagation();
        this.openLessonModal(lessonId);
    }

    deleteLesson(event, lessonId) {
        event.stopPropagation();
        if (!this.activeCourse) return;
        
        if (confirm('Удалить урок?')) {
            this.api.deleteLesson(lessonId)
                .then(() => {
                    this.showToast('Урок успешно удален!', 'success');
                    this.refreshAllData();
                })
                .catch(error => {
                    this.showToast(error.message, 'error');
                });
        }
    }

    renderReports() {
        const tbody = document.getElementById('reports-table-body');
        if (!this.courses.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fas fa-chart-bar"></i><p>Нет данных</p></td></tr>`;
            return;
        }
        tbody.innerHTML = this.courses.map(course => {
            const progress = this.getCourseProgress(course);
            const lessonsCount = (course.lessons || []).length;
            const endDate = course.endDate || course.end_date;
            const [badgeClass, status] = progress === 100 ? ['badge-success', 'Завершен'] : 
                                        new Date(endDate) < new Date() ? ['badge-danger', 'Просрочен'] : 
                                        ['badge-info', 'В процессе'];
            return `<tr>
                <td>${course.title}</td>
                <td>${lessonsCount}</td>
                <td>
                    <div class="progress-bar-bg" style="width: 100px; display: inline-block; vertical-align: middle; margin-right: 10px;">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    ${progress}%
                </td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
            </tr>`;
        }).join('');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => { 
            toast.style.animation = 'slideInRight 0.3s ease reverse'; 
            setTimeout(() => toast.remove(), 300); 
        }, 3000);
    }

    initModules() {
        this.calendar = new CalendarManager(this);
        this.calendar.init('calendar-widget');
        this.filesManager = new FilesManager(this);
        this.filesManager.init();
        this.exportManager = new ExportManager(this);
    }

    getDateOffset(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    showAuth() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-layout').style.display = 'none';
    }

    showApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-layout').style.display = 'flex';
        this.updateUserInfo();
        this.navigateTo('dashboard');
    }

    getActivityData(days = 30) {
        const activityData = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0); 
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i); 
            const dateKey = date.toISOString().split('T')[0];
            activityData[dateKey] = 0;
        }
        this.courses.forEach(course => {
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                if (lesson.completed) {
                    let completedDate = lesson.completed_date || lesson.date || lesson.lesson_date;
                    if (completedDate) {
                        completedDate = new Date(completedDate).toISOString().split('T')[0];
                        if (activityData.hasOwnProperty(completedDate)) {
                            activityData[completedDate]++;
                        }
                    }
                }
            });
        });
        const labels = [];
        const data = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i); 
            const dateKey = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('ru-RU', { 
                day: '2-digit', 
                month: '2-digit' 
            }));
            data.push(activityData[dateKey] || 0);
        }
        
        return { labels, data };
    }
    getTopicTimeData() {
        const topicData = {};
        
        this.courses.forEach(course => {
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                const topic = course.title;
                const duration = lesson.duration || 0;
                
                if (!topicData[topic]) {
                    topicData[topic] = 0;
                }
                topicData[topic] += duration;
            });
        });
        const labels = Object.keys(topicData);
        const data = Object.values(topicData);
        
        return { labels, data };
    }

    renderCharts() {
        const activityCtx = document.getElementById('activity-chart');
        if (activityCtx) {
            const activityData = this.getActivityData(30);
            
            if (this.activityChartInstance) {
                this.activityChartInstance.destroy();
            }
            
            this.activityChartInstance = new Chart(activityCtx, {
                type: 'bar',
                data: {
                    labels: activityData.labels,
                    datasets: [{
                        label: 'Пройдено уроков',
                        data: activityData.data,
                        backgroundColor: 'rgba(79, 70, 229, 0.6)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        maxBarThickness: 30
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.parsed.y + ' уроков';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    return value + ' ур.';
                                }
                            },
                            grid: {
                                color: '#e5e7eb'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45,
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            });
        }
        
        const topicCtx = document.getElementById('topic-chart');
        if (topicCtx) {
            const topicData = this.getTopicTimeData();
            
            if (this.topicChartInstance) {
                this.topicChartInstance.destroy();
            }
            
            const colors = [
                'rgba(79, 70, 229, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(99, 102, 241, 0.8)',
                'rgba(14, 165, 233, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)'
            ];
            
            this.topicChartInstance = new Chart(topicCtx, {
                type: 'doughnut',
                data: {
                    labels: topicData.labels,
                    datasets: [{
                        data: topicData.data,
                        backgroundColor: colors.slice(0, topicData.labels.length),
                        borderColor: '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} мин. (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    renderReports() {
        const tbody = document.getElementById('reports-table-body');
        
        if (!this.courses.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <p>Нет данных</p>
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = this.courses.map(course => {
            const progress = this.getCourseProgress(course);
            const lessonsCount = (course.lessons || []).length;
            const endDate = course.endDate || course.end_date;
            const [badgeClass, status] = progress === 100 ? ['badge-success', 'Завершен'] : 
                                        new Date(endDate) < new Date() ? ['badge-danger', 'Просрочен'] : 
                                        ['badge-info', 'В процессе'];
            return `<tr>
                <td>${course.title}</td>
                <td>${lessonsCount}</td>
                <td>
                    <div class="progress-bar-bg" style="width: 100px; display: inline-block; vertical-align: middle; margin-right: 10px;">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    ${progress}%
                </td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
            </tr>`;
        }).join('');
        
        setTimeout(() => {
            this.renderCharts();
        }, 100);
    }

    refreshCharts() {
        if (this.currentPage === 'reports') {
            this.renderCharts();
        }
    }

    animateProgressUpdate(courseId, newProgress) {
        const progressBars = document.querySelectorAll(`[data-course-id="${courseId}"] .progress-bar-fill`);
        const progressTexts = document.querySelectorAll(`[data-course-id="${courseId}"] .progress-row span:first-child`);
        const courseCards = document.querySelectorAll(`[data-course-id="${courseId}"]`);
        
        progressBars.forEach(bar => {
            const oldWidth = bar.style.width;
            
            bar.classList.add('updating');
            
            requestAnimationFrame(() => {
                bar.style.width = `${newProgress}%`;
            });
            
            setTimeout(() => {
                bar.classList.remove('updating');
                if (newProgress === 100) {
                    bar.classList.add('completed');
                }
            }, 600);
        });
        
        progressTexts.forEach(text => {
            const oldText = text.textContent;
            text.classList.add('updated');
            text.textContent = `${newProgress}%`;
            
            setTimeout(() => {
                text.classList.remove('updated');
            }, 400);
        });
        
        // Анимация для карточки курса
        courseCards.forEach(card => {
            card.classList.add('progress-updated');
            setTimeout(() => {
                card.classList.remove('progress-updated');
            }, 500);
        });
        
        // Обновляем прогресс в деталях курса если открыт
        if (this.activeCourse && this.activeCourse.id === courseId) {
            const detailProgress = document.getElementById('detail-course-progress');
            const detailBar = document.getElementById('detail-progress-bar');
            const detailHeader = document.querySelector('.detail-progress-header');
            
            if (detailProgress) {
                detailProgress.classList.add('updated');
                detailProgress.textContent = `${newProgress}%`;
                setTimeout(() => {
                    detailProgress.classList.remove('updated');
                }, 400);
            }
            
            if (detailBar) {
                detailBar.classList.add('updating');
                requestAnimationFrame(() => {
                    detailBar.style.width = `${newProgress}%`;
                });
                setTimeout(() => {
                    detailBar.classList.remove('updating');
                    if (newProgress === 100) {
                        detailBar.classList.add('completed');
                    }
                }, 600);
            }
            
            if (detailHeader) {
                detailHeader.classList.add('updated');
                setTimeout(() => {
                    detailHeader.classList.remove('updated');
                }, 500);
            }
        }
    }

    validateProfileName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: 'Имя обязательно' };
        }
        
        const trimmedName = name.trim();
        
        if (trimmedName.length < 2) {
            return { valid: false, message: 'Имя должно содержать минимум 2 символа' };
        }
        
        if (trimmedName.length > 50) {
            return { valid: false, message: 'Имя не должно превышать 50 символов' };
        }
        
        // ✅ Разрешаем кириллицу, латиницу, пробелы, дефисы и апострофы
        const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s'-]+$/;
        if (!nameRegex.test(trimmedName)) {
            return { 
                valid: false, 
                message: 'Имя может содержать только буквы, пробелы, дефисы и апострофы' 
            };
        }
        
        return { valid: true, name: trimmedName };
    }

    validateProfileEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email обязателен' };
        }
        
        const trimmedEmail = email.trim().toLowerCase();
        
        // ✅ Проверка формата email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return { 
                valid: false, 
                message: 'Неверный формат email. Пример: user@example.com' 
            };
        }
        
        // ✅ Проверка домена
        const domain = trimmedEmail.split('@')[1];
        const validDomains = ['.com', '.ru', '.org', '.net', '.edu', '.gov', '.io', '.co', '.by', '.kz', '.ua'];
        const hasValidDomain = validDomains.some(tld => domain.endsWith(tld));
        
        if (!hasValidDomain) {
            return { 
                valid: false, 
                message: 'Недопустимый домен email. Используйте .com, .ru, .org и т.д.' 
            };
        }
        
        return { valid: true, email: trimmedEmail };
    }

    // ✅ ОБНОВЛЕННЫЙ МЕТОД: Обновление профиля с валидацией
    async updateProfile(name, email) {
        // ✅ Валидация имени
        const nameValidation = this.validateProfileName(name);
        if (!nameValidation.valid) {
            this.showToast(nameValidation.message, 'error');
            return false;
        }
        
        // ✅ Валидация email
        const emailValidation = this.validateProfileEmail(email);
        if (!emailValidation.valid) {
            this.showToast(emailValidation.message, 'error');
            return false;
        }
        
        // ✅ Если имя не изменилось, не отправляем его
        const updateData = {};
        if (nameValidation.name !== this.currentUser.name) {
            updateData.name = nameValidation.name;
        }
        if (emailValidation.email !== this.currentUser.email) {
            updateData.email = emailValidation.email;
        }
        
        
        
        try {
            await this.api.updateProfile(updateData.name, updateData.email);
            
            // ✅ Обновляем данные пользователя
            this.currentUser.name = updateData.name || this.currentUser.name;
            this.currentUser.email = updateData.email || this.currentUser.email;
            this.currentUser.initials = this.getInitials(this.currentUser.name);
            
            this.updateUserInfo();
            this.showToast('Профиль успешно обновлён!', 'success');
            return true;
        } catch (error) {
            this.showToast(error.message, 'error');
            return false;
        }
    }

    bindEvents() {
        const $ = (id) => document.getElementById(id);
        const $$ = (sel) => document.querySelectorAll(sel);

        $('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            $('login-form').style.display = 'none';
            $('register-form').style.display = 'block';
        });

        $('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            $('login-form').style.display = 'block';
            $('register-form').style.display = 'none';
        });

        $('login-form-element')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login($('login-email').value, $('login-password').value);
        });

        $('register-form-element')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register($('register-name').value, $('register-email').value, $('register-password').value);
        });

        $('logout-btn')?.addEventListener('click', () => this.logout());

        $$('.nav-item').forEach(item => item.addEventListener('click', () => this.navigateTo(item.dataset.page)));

        $('new-course-btn')?.addEventListener('click', () => this.openCourseModal());
        $('cancel-course')?.addEventListener('click', () => this.closeCourseModal());
        $('new-course-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCourse($('course-title').value, $('course-description').value, 
                           $('course-start-date').value, $('course-end-date').value);
        });
        $('course-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'course-modal') this.closeCourseModal();
        });

        $('cancel-lesson')?.addEventListener('click', () => this.closeLessonModal());
        $('new-lesson-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLesson($('lesson-title').value, $('lesson-duration').value, 
                           $('lesson-date').value, $('lesson-description').value);
        });
        $('lesson-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'lesson-modal') this.closeLessonModal();
        });

        $('cancel-delete')?.addEventListener('click', () => this.closeDeleteModal());
        $('confirm-delete')?.addEventListener('click', () => this.confirmDeleteCourse());
        $('delete-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'delete-modal') this.closeDeleteModal();
        });

        $('back-to-courses')?.addEventListener('click', () => this.closeCourseDetail());
        $('edit-course-btn')?.addEventListener('click', () => {
            if (this.activeCourse) this.openCourseModal(this.activeCourse.id);
        });
        $('delete-course-btn')?.addEventListener('click', () => {
            if (this.activeCourse) {
                $('delete-course-name').textContent = this.activeCourse.title;
                $('delete-modal').style.display = 'flex';
                this.courseToDelete = this.activeCourse.id;
            }
        });
        $('add-lesson-btn')?.addEventListener('click', () => this.openLessonModal());

        $('course-search')?.addEventListener('input', () => {
            if (this.currentPage === 'courses') this.renderCoursesPage();
        });
        $('course-filter')?.addEventListener('change', () => {
            if (this.currentPage === 'courses') this.renderCoursesPage();
        });
        $('course-sort')?.addEventListener('change', () => {
            if (this.currentPage === 'courses') this.renderCoursesPage();
        });

        $('profile-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = $('profile-name').value;
            const email = $('profile-email').value;
            try {
                await this.api.updateProfile(name, email);
                this.currentUser.name = name;
                this.currentUser.email = email;
                this.currentUser.initials = this.getInitials(name);
                this.updateUserInfo();
                this.showToast('Профиль обновлён!', 'success');
            } catch (error) {
                this.showToast(error.message, 'error');
            }
            await this.updateProfile(name, email);
        });

        $('export-pdf')?.addEventListener('click', async () => {
            if (this.exportManager) {
                await this.exportManager.exportToPDF(); // ✅ Добавлен await
            }
        });
        
        $('export-excel')?.addEventListener('click', () => {
            if (this.exportManager) {
                this.exportManager.exportToXLSX();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SkillLvlUpApp();
});