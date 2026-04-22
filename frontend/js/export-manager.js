// exportManager.js - Модуль экспорта отчетов (PDF/XLSX)

class ExportManager {
    constructor(app) {
        this.app = app;
        // ✅ Загружаем шрифт с поддержкой кириллицы
        this.cyrillicFont = null;
    }

    // ✅ Метод для загрузки шрифта с поддержкой кириллицы
    async loadCyrillicFont() {
        if (this.cyrillicFont) return this.cyrillicFont;

        // Используем шрифт Roboto с поддержкой кириллицы
        const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        
        try {
            const response = await fetch(fontUrl);
            const fontBuffer = await response.arrayBuffer();
            const fontBase64 = btoa(
                new Uint8Array(fontBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            
            this.cyrillicFont = fontBase64;
            return fontBase64;
        } catch (error) {
            console.error('Ошибка загрузки шрифта:', error);
            // Возвращаем встроенный шрифт (без кириллицы)
            return null;
        }
    }

    // ✅ ЭКСПОРТ В PDF
    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        
        // ✅ Показываем индикатор загрузки
        this.app.showToast('Генерация PDF...', 'info');
        
        try {
            // ✅ Загружаем шрифт с кириллицей
            await this.loadCyrillicFont();
            
            const doc = new jsPDF();
            
            // ✅ Добавляем шрифт с поддержкой кириллицы
            if (this.cyrillicFont) {
                doc.addFileToVFS('Roboto-Regular.ttf', this.cyrillicFont);
                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.setFont('Roboto');
            }

            // Заголовок
            doc.setFontSize(18);
            doc.setTextColor(79, 70, 229);
            doc.text('SkillLvlUp - Отчет об успеваемости', 14, 20);
            
            // Информация о пользователе
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`Пользователь: ${this.app.currentUser?.name || 'Не указано'}`, 14, 30);
            doc.text(`Email: ${this.app.currentUser?.email || 'Не указано'}`, 14, 36);
            doc.text(`Дата отчета: ${new Date().toLocaleDateString('ru-RU')}`, 14, 42);
            
            // Общая статистика
            const activeCourses = this.app.courses.filter(c => c.status === 'active').length;
            const completedLessons = this.app.courses.reduce((acc, c) => {
                const lessons = c.lessons || [];
                return acc + lessons.filter(l => l.completed).length;
            }, 0);
            const totalLessons = this.app.courses.reduce((acc, c) => acc + (c.lessons || []).length, 0);
            const avgProgress = this.app.courses.length > 0 
                ? Math.round(this.app.courses.reduce((acc, c) => acc + this.app.getCourseProgress(c), 0) / this.app.courses.length)
                : 0;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Общая статистика:', 14, 55);
            
            doc.setFontSize(10);
            doc.text(`• Активных курсов: ${activeCourses}`, 14, 63);
            doc.text(`• Пройдено уроков: ${completedLessons} из ${totalLessons}`, 14, 69);
            doc.text(`• Средний прогресс: ${avgProgress}%`, 14, 75);
            
            // Таблица курсов
            const tableData = this.app.courses.map(course => {
                const progress = this.app.getCourseProgress(course);
                const lessonsCount = (course.lessons || []).length;
                const completedLessons = course.lessons?.filter(l => l.completed).length || 0;
                const endDate = course.endDate || course.end_date;
                const status = progress === 100 ? 'Завершен' : 
                              new Date(endDate) < new Date() ? 'Просрочен' : 'В процессе';
                
                return [
                    course.title,
                    lessonsCount.toString(),
                    `${completedLessons}/${lessonsCount}`,
                    `${progress}%`,
                    status,
                    endDate ? new Date(endDate).toLocaleDateString('ru-RU') : 'Не указана'
                ];
            });
            
            doc.autoTable({
                startY: 85,
                head: [['Курс', 'Уроков', 'Пройдено', 'Прогресс', 'Статус', 'Дедлайн']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                    fillColor: [79, 70, 229],
                    font: this.cyrillicFont ? 'Roboto' : 'helvetica'
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3,
                    font: this.cyrillicFont ? 'Roboto' : 'helvetica'
                },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 15, halign: 'center' },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 20, halign: 'center' },
                    4: { cellWidth: 25, halign: 'center' },
                    5: { cellWidth: 30 }
                }
            });
            
            // Детализация по урокам
            let finalY = doc.lastAutoTable.finalY + 10;
            
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }
            
            doc.setFontSize(12);
            doc.text('Детализация по курсам:', 14, finalY);
            
            this.app.courses.forEach((course, index) => {
                if (finalY > 270) {
                    doc.addPage();
                    finalY = 20;
                }
                
                doc.setFont('Roboto', 'bold');
                doc.setFontSize(10);
                doc.text(`${index + 1}. ${course.title}`, 14, finalY + 10);
                
                doc.setFont('Roboto', 'normal');
                const lessons = course.lessons || [];
                let lessonY = finalY + 16;
                
                lessons.forEach((lesson, lIndex) => {
                    if (lessonY > 280) {
                        doc.addPage();
                        lessonY = 20;
                    }
                    
                    const status = lesson.completed ? '✓' : '○';
                    const lessonDate = lesson.lesson_date || lesson.date;
                    const dateStr = lessonDate ? new Date(lessonDate).toLocaleDateString('ru-RU') : '';
                    const duration = lesson.duration || 0;
                    
                    // ✅ ИСПРАВЛЕНО: явное указание шрифта и форматирование
                    const lessonText = `${lIndex + 1}. ${lesson.title} - ${duration} мин. | ${dateStr}`;
                    const splitText = doc.splitTextToSize(lessonText, 175);
                    
                    doc.setFont('Roboto', 'normal');
                    doc.text(splitText, 14, lessonY);
                    lessonY += (splitText.length * 5) + 2;
                });
                
                finalY = lessonY + 10;
            });
            
            // Сохранение файла
            const fileName = `SkillLvlUp_Отчет_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            this.app.showToast('PDF отчет успешно создан!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта PDF:', error);
            this.app.showToast('Ошибка создания PDF', 'error');
        }
    }

    // ✅ ЭКСПОРТ В XLSX (без изменений)
    exportToXLSX() {
        const wb = XLSX.utils.book_new();
        
        // Лист 1: Общая статистика
        const activeCourses = this.app.courses.filter(c => c.status === 'active').length;
        const completedLessons = this.app.courses.reduce((acc, c) => {
            const lessons = c.lessons || [];
            return acc + lessons.filter(l => l.completed).length;
        }, 0);
        const totalLessons = this.app.courses.reduce((acc, c) => acc + (c.lessons || []).length, 0);
        const avgProgress = this.app.courses.length > 0 
            ? Math.round(this.app.courses.reduce((acc, c) => acc + this.app.getCourseProgress(c), 0) / this.app.courses.length)
            : 0;
        
        const summaryData = [
            ['Пользователь', this.app.currentUser?.name || 'Не указано'],
            ['Email', this.app.currentUser?.email || 'Не указано'],
            ['Дата отчета', new Date().toLocaleDateString('ru-RU')],
            ['', ''],
            ['Активных курсов', activeCourses],
            ['Пройдено уроков', `${completedLessons} из ${totalLessons}`],
            ['Средний прогресс', `${avgProgress}%`],
            ['Всего курсов', this.app.courses.length]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Общая статистика');
        
        // Лист 2: Список курсов
        const coursesData = [['Название курса', 'Описание', 'Уроков', 'Пройдено', 'Прогресс %', 'Статус', 'Дата начала', 'Дата окончания']];
        
        this.app.courses.forEach(course => {
            const progress = this.app.getCourseProgress(course);
            const lessonsCount = (course.lessons || []).length;
            const completedLessons = course.lessons?.filter(l => l.completed).length || 0;
            const endDate = course.endDate || course.end_date;
            const startDate = course.startDate || course.start_date;
            const status = progress === 100 ? 'Завершен' : 
                          new Date(endDate) < new Date() ? 'Просрочен' : 'В процессе';
            
            coursesData.push([
                course.title,
                course.description || '',
                lessonsCount,
                completedLessons,
                progress,
                status,
                startDate ? new Date(startDate).toLocaleDateString('ru-RU') : '',
                endDate ? new Date(endDate).toLocaleDateString('ru-RU') : ''
            ]);
        });
        
        const wsCourses = XLSX.utils.aoa_to_sheet(coursesData);
        
        // Стилизация заголовков
        const range = XLSX.utils.decode_range(wsCourses['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!wsCourses[address]) continue;
            wsCourses[address].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4F46E5" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }
        
        XLSX.utils.book_append_sheet(wb, wsCourses, 'Курсы');
        
        // Лист 3: Детализация уроков
        const lessonsData = [['Курс', 'Урок', 'Длительность (мин)', 'Дата', 'Статус', 'Заметки']];
        
        this.app.courses.forEach(course => {
            const lessons = course.lessons || [];
            lessons.forEach(lesson => {
                const lessonDate = lesson.lesson_date || lesson.date;
                lessonsData.push([
                    course.title,
                    lesson.title,
                    lesson.duration || 0,
                    lessonDate ? new Date(lessonDate).toLocaleDateString('ru-RU') : '',
                    lesson.completed ? 'Пройден' : 'Не пройден',
                    lesson.notes ? 'Есть' : ''
                ]);
            });
        });
        
        const wsLessons = XLSX.utils.aoa_to_sheet(lessonsData);
        
        // Стилизация заголовков
        const lessonsRange = XLSX.utils.decode_range(wsLessons['!ref']);
        for (let C = lessonsRange.s.c; C <= lessonsRange.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!wsLessons[address]) continue;
            wsLessons[address].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "10B981" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }
        
        XLSX.utils.book_append_sheet(wb, wsLessons, 'Уроки');
        
        // Сохранение файла
        const fileName = `SkillLvlUp_Отчет_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        this.app.showToast('XLSX отчет успешно создан!', 'success');
    }
}

// Экспорт для использования в app.js
window.ExportManager = ExportManager;