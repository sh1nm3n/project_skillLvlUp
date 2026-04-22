// Calendar Module - Календарь для SkillLUp с отображением уроков и курсов
class CalendarManager {
    constructor(app) {
        this.app = app;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.container = null;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) {
            this.render();
            this.bindEvents();
        }
    }

    render() {
        if (!this.container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const fullMonthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = (firstDay.getDay() + 6) % 7;
        const totalDays = lastDay.getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.container.innerHTML = `
            <div class="calendar-widget-header">
                <button class="btn btn-sm btn-secondary" id="cal-prev-month">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3 id="cal-month-year">${fullMonthNames[month]} ${year}</h3>
                <button class="btn btn-sm btn-secondary" id="cal-next-month">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-widget-grid">
                <div class="calendar-weekdays-mini">
                    <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
                </div>
                <div class="calendar-days-mini" id="cal-days-grid">
                    ${this.renderDays(startDay, totalDays, month, year, today)}
                </div>
            </div>
            <div class="calendar-widget-events" id="cal-selected-events">
                <p class="text-muted" style="font-size: 0.85rem;">Выберите дату для просмотра событий</p>
            </div>
        `;

        this.bindCalendarEvents();
    }

    renderDays(startDay, totalDays, month, year, today) {
        let html = '';
        
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        for (let day = 1; day <= totalDays; day++) {
            const currentDate = new Date(year, month, day);
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = currentDate.getTime() === today.getTime();
            const isSelected = this.selectedDate === dateKey;
            
            // ✅ Получаем события для этой даты
            const events = this.app.getEventsForDate(dateKey);
            const hasDeadlines = events.some(e => e.type === 'deadline');
            const hasLessons = events.some(e => e.type === 'lesson');

            // ✅ Определяем классы для индикаторов
            let indicators = '';
            if (hasDeadlines && hasLessons) {
                indicators = '<span class="cal-event-dot deadline"></span><span class="cal-event-dot lesson"></span>';
            } else if (hasDeadlines) {
                indicators = '<span class="cal-event-dot deadline"></span>';
            } else if (hasLessons) {
                indicators = '<span class="cal-event-dot lesson"></span>';
            }

            html += `
                <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                    data-date="${dateKey}">
                    <span class="cal-day-number">${day}</span>
                    ${indicators}
                </div>
            `;
        }

        const remainingDays = 42 - (startDay + totalDays);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        return html;
    }

    bindCalendarEvents() {
        document.getElementById('cal-prev-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.getElementById('cal-next-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        this.container.querySelectorAll('.cal-day:not(.other-month)').forEach(day => {
            day.addEventListener('click', () => {
                this.selectedDate = day.dataset.date;
                this.render();
                this.renderSelectedEvents();
            });
        });
    }

    renderSelectedEvents() {
        const container = document.getElementById('cal-selected-events');
        if (!container || !this.selectedDate) return;

        const events = this.app.getEventsForDate(this.selectedDate);
        const dateObj = new Date(this.selectedDate);
        const dateStr = dateObj.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });

        if (events.length === 0) {
            container.innerHTML = `
                <p><strong>${dateStr}</strong></p>
                <p class="text-muted" style="font-size: 0.85rem; margin-top: 5px;">
                    <i class="fas fa-check-circle"></i> Нет запланированных событий
                </p>
            `;
            return;
        }

        const deadlines = events.filter(e => e.type === 'deadline');
        const lessons = events.filter(e => e.type === 'lesson');

        let html = `<p style="margin-bottom: 15px;"><strong>${dateStr}</strong></p>`;

        // ✅ Дедлайны курсов
        if (deadlines.length > 0) {
            html += `<p style="font-size: 0.8rem; color: var(--danger); margin-bottom: 8px;">
                <i class="fas fa-flag"></i> Дедлайны курсов
            </p>`;
            deadlines.forEach(event => {
                html += `
                    <div class="cal-event-item deadline" onclick="app.openCourseDetail(${event.course.id})">
                        <i class="fas fa-flag"></i>
                        <span>${event.title.replace('📅 Дедлайн: ', '')}</span>
                    </div>
                `;
            });
        }

        // ✅ Уроки
        if (lessons.length > 0) {
            html += `<p style="font-size: 0.8rem; color: var(--success); margin: 15px 0 8px;">
                <i class="fas fa-book-open"></i> Уроки
            </p>`;
            lessons.forEach(event => {
                const completedClass = event.completed ? 'completed' : '';
                html += `
                    <div class="cal-event-item lesson ${completedClass}" 
                         onclick="app.openCourseDetail(${event.course.id})">
                        <i class="fas fa-book-open"></i>
                        <span class="${completedClass ? 'text-muted' : ''}">
                            ${event.title.replace('📚 ', '')}
                            ${event.completed ? ' (✓ Пройден)' : ''}
                        </span>
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    }

    bindEvents() {}

    refresh() {
        this.render();
        if (this.selectedDate) {
            this.renderSelectedEvents();
        }
    }
}

window.CalendarManager = CalendarManager;