// Calendar Module - Календарь для SkillLvlUp

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
        
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                           'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        
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
                <p class="text-muted" style="font-size: 0.85rem;">Выберите дату</p>
            </div>
        `;

        this.bindCalendarEvents();
    }

    renderDays(startDay, totalDays, month, year, today) {
        let html = '';
        
        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            html += `<div class="cal-day other-month">${day}</div>`;
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const currentDate = new Date(year, month, day);
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = currentDate.getTime() === today.getTime();
            const isSelected = this.selectedDate === dateKey;
            const events = this.app.getEventsForDate(dateKey);
            const hasEvents = events.length > 0;

            html += `
                <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                     data-date="${dateKey}">
                    <span class="cal-day-number">${day}</span>
                    ${hasEvents ? '<span class="cal-event-dot"></span>' : ''}
                </div>
            `;
        }

        // Next month days
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

        // Day click handlers
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
            month: 'long' 
        });

        if (events.length === 0) {
            container.innerHTML = `
                <p><strong>${dateStr}</strong></p>
                <p class="text-muted" style="font-size: 0.85rem; margin-top: 5px;">Нет событий</p>
            `;
            return;
        }

        container.innerHTML = `
            <p style="margin-bottom: 10px;"><strong>${dateStr}</strong></p>
            ${events.map(event => `
                <div class="cal-event-item ${event.type}">
                    <i class="fas ${event.type === 'deadline' ? 'fa-flag' : 'fa-book-open'}"></i>
                    <span>${event.title.replace(/^[^\s]+\s/, '')}</span>
                </div>
            `).join('')}
        `;
    }

    bindEvents() {
        // Events are bound in render
    }

    refresh() {
        this.render();
        if (this.selectedDate) {
            this.renderSelectedEvents();
        }
    }
}

// Export for use in app.js
window.CalendarManager = CalendarManager;