// app.js - Исправленная версия
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
            
            // ✅ Конвертируем даты для календаря
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
        document.getElementById('user-avatar').textContent = initials;
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
        const methods = { dashboard: 'renderDashboard', courses: 'renderCoursesPage', reports: 'renderReports' };
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

        document.getElementById('stat-active-courses').textContent = activeCourses;
        document.getElementById('stat-completed-lessons').textContent = completedLessons;
        document.getElementById('stat-upcoming-deadlines').textContent = upcomingDeadlines;
        document.getElementById('stat-total-files').textContent = totalFiles;

        const courseList = document.getElementById('dashboard-course-list');
        if (this.courses.length === 0) {
            courseList.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i><h3>Нет курсов</h3></div>`;
        } else {
            this.renderCourseList(this.courses.slice(0, 3), 'dashboard-course-list');
        }

        this.renderDeadlines();
        if (this.calendar) this.calendar.refresh();
    }

    renderDeadlines() {
        const container = document.getElementById('dashboard-deadlines');
        const now = new Date();
        
        const deadlines = this.courses
            .filter(c => c.status === 'active')
            .map(course => {
                // ✅ Поддержка обоих форматов дат
                const endDate = course.endDate || course.end_date;
                if (!endDate) return null;
                
                const diffDays = Math.ceil((new Date(endDate) - now) / (1000 * 60 * 60 * 24));
                return { 
                    course, 
                    endDate: new Date(endDate), 
                    diffDays 
                };
            })
            .filter(d => d !== null && d.diffDays <= 14)  // ✅ Фильтр null
            .sort((a, b) => a.diffDays - b.diffDays)
            .slice(0, 5);

        if (deadlines.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>Нет дедлайнов</p>
                </div>`;
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

    getEventsForDate(dateKey) {
        const events = [];
        
        this.courses.forEach(course => {
            // ✅ Дедлайн курса (поддержка обоих форматов)
            const endDate = course.endDate || course.end_date;
            if (endDate === dateKey) {
                events.push({ 
                    type: 'deadline', 
                    title: `📅 ${course.title}`, 
                    course 
                });
            }
            
            // ✅ Уроки (поддержка обоих форматов дат)
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                const lessonDate = lesson.lesson_date || lesson.date;  // ✅ ПРОВЕРКА ОБОИХ ФОРМАТОВ
                if (lessonDate === dateKey) {
                    events.push({ 
                        type: 'lesson', 
                        title: `📚 ${lesson.title}`, 
                        course, 
                        lesson 
                    });
                }
            });
        });
        
        return events;
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
                        <button class="course-action-btn edit" onclick="app.editCourse(event, ${course.id})"><i class="fas fa-edit"></i></button>
                        <button class="course-action-btn delete" onclick="app.deleteCourse(event, ${course.id})"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="course-header">
                        <h3>${course.title}</h3>
                    </div>
                    <div class="course-body">
                        <p class="course-desc">${course.description || 'Нет описания'}</p>
                        <p class="course-meta">
                            <i class="fas fa-calendar"></i> ${startDate ? new Date(startDate).toLocaleDateString('ru-RU') : 'Не указана'} - ${endDate ? new Date(endDate).toLocaleDateString('ru-RU') : 'Не указана'}
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
            const matchSearch = course.title.toLowerCase().includes(searchTerm) || course.description?.toLowerCase().includes(searchTerm);
            const matchFilter = filter === 'all' || (filter === 'active' && course.status === 'active') || (filter === 'completed' && this.getCourseProgress(course) === 100);
            return matchSearch && matchFilter;
        });

        filtered.sort((a, b) => {
            if (sort === 'name') return a.title.localeCompare(b.title);
            if (sort === 'progress') return this.getCourseProgress(b) - this.getCourseProgress(a);
            if (sort === 'deadline') return new Date(a.endDate) - new Date(b.endDate);
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
            // ✅ Загружаем полную информацию о курсе с уроками через API
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
            
            // ✅ Обработка дат (snake_case и camelCase)
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
                    <i class="fas fa-video"></i>
                    <h3>Нет уроков</h3>
                    <button class="btn btn-primary" onclick="app.openLessonModal()">
                        <i class="fas fa-plus"></i> Добавить урок
                    </button>
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
            await this.api.toggleLessonComplete(lessonId);
            await this.loadCourseDetail(this.activeCourse.id);
            this.renderLessonList();
            this.renderDashboard();
            const lesson = this.activeCourse.lessons.find(l => l.id === lessonId);
            this.showToast(lesson.completed ? 'Урок пройден!' : 'Прогресс сброшен', lesson.completed ? 'success' : 'info');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadCourseDetail(courseId) {
        try {
            const response = await this.api.getCourse(courseId);
            this.activeCourse = response.course;
            
            // ✅ Конвертируем snake_case в camelCase для совместимости
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
                
                // ✅ Конвертируем даты уроков
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
                document.getElementById('course-start-date').value = course.startDate;
                document.getElementById('course-end-date').value = course.endDate;
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
            if (this.editingCourseId) {
                await this.api.updateCourse(this.editingCourseId, { title, description, start_date: startDate, end_date: endDate });
                this.showToast('Курс успешно обновлен!', 'success');
            } else {
                await this.api.createCourse({ title, description, start_date: startDate, end_date: endDate });
                this.showToast('Курс успешно создан!', 'success');
            }
            await this.loadCourses();
            this.closeCourseModal();
            this.renderDashboard();
            this.renderCoursesPage();
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
                await this.loadCourses();
                this.closeDeleteModal();
                this.renderDashboard();
                this.renderCoursesPage();
                if (this.activeCourse?.id === this.courseToDelete) this.closeCourseDetail();
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
                document.getElementById('lesson-date').value = lesson.date || this.getTodayDate();
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
            
            // ✅ ИСПРАВЛЕНИЕ: Полная перезагрузка курса с уроками
            await this.loadCourseDetail(this.activeCourse.id);
            this.closeLessonModal();
            this.renderLessonList();  // ✅ Явный вызов рендера
            this.renderDashboard();
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
            this.activeCourse.lessons = this.activeCourse.lessons.filter(l => l.id !== lessonId);
            this.renderLessonList();
            this.renderDashboard();
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
            const [badgeClass, status] = progress === 100 ? ['badge-success', 'Завершен'] : new Date(course.endDate) < new Date() ? ['badge-danger', 'Просрочен'] : ['badge-info', 'В процессе'];
            return `<tr><td>${course.title}</td><td>${lessonsCount}</td><td><div class="progress-bar-bg" style="width: 100px; display: inline-block; vertical-align: middle; margin-right: 10px;"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>${progress}%</td><td><span class="badge ${badgeClass}">${status}</span></td></tr>`;
        }).join('');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
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
            this.saveCourse($('course-title').value, $('course-description').value, $('course-start-date').value, $('course-end-date').value);
        });
        $('course-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'course-modal') this.closeCourseModal();
        });

        $('cancel-lesson')?.addEventListener('click', () => this.closeLessonModal());
        $('new-lesson-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLesson($('lesson-title').value, $('lesson-duration').value, $('lesson-date').value, $('lesson-description').value);
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
        });

        $('export-pdf')?.addEventListener('click', () => this.showToast('PDF в полной версии', 'info'));
        $('export-excel')?.addEventListener('click', () => this.showToast('Excel в полной версии', 'info'));
    }
}

document.addEventListener('DOMContentLoaded', () => { 
    window.app = new SkillLvlUpApp(); 
});