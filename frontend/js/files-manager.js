// Files Manager Module - Управление файлами и заметками для SkillLvlUp

class FilesManager {
    constructor(app) {
        this.app = app;
        this.activeLesson = null;
        this.modal = null;
    }

    init() {
        this.modal = document.getElementById('lesson-files-modal');
        this.bindEvents();
    }

    open(course, lesson) {
        this.activeLesson = lesson;
        this.activeCourse = course;

        if (!this.modal) return;

        document.getElementById('files-lesson-info').innerHTML = `
            <h4>${lesson.title}</h4>
            <p>${course.title}</p>
        `;

        document.getElementById('lesson-notes').value = lesson.notes || '';
        this.renderFilesList();
        this.modal.style.display = 'flex';
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.activeLesson = null;
        this.activeCourse = null;
    }

    renderFilesList() {
        const container = document.getElementById('files-list');
        
        if (!this.activeLesson || !this.activeLesson.files || this.activeLesson.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file"></i>
                    <p>Файлы не загружены</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activeLesson.files.map((file, index) => {
            const fileType = this.getFileType(file.name);
            return `
                <div class="file-item">
                    <div class="file-icon ${fileType}">
                        <i class="fas ${this.getFileIcon(fileType)}"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${file.size} • ${new Date(file.uploadDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div class="file-actions">
                        <button class="file-action-btn" onclick="app.filesManager.downloadFile(${index})" title="Скачать">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action-btn delete" onclick="app.filesManager.deleteFile(${index})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    saveNotes() {
        if (!this.activeLesson) return;
        
        this.activeLesson.notes = document.getElementById('lesson-notes').value;
        this.app.saveToStorage();
        this.app.showToast('Заметки сохранены!', 'success');
    }

    handleFileUpload(files) {
        if (!this.activeLesson) return;
        
        if (!this.activeLesson.files) {
            this.activeLesson.files = [];
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: this.formatFileSize(file.size),
                    uploadDate: new Date().toISOString(),
                    content: e.target.result
                };
                this.activeLesson.files.push(fileData);
                this.app.saveToStorage();
                this.renderFilesList();
                this.app.renderLessonList();
                this.app.showToast(`Файл "${file.name}" загружен!`, 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    downloadFile(fileIndex) {
        if (!this.activeLesson || !this.activeLesson.files[fileIndex]) return;
        
        const file = this.activeLesson.files[fileIndex];
        const link = document.createElement('a');
        link.href = file.content;
        link.download = file.name;
        link.click();
        this.app.showToast('Файл загружен!', 'success');
    }

    deleteFile(fileIndex) {
        if (!this.activeLesson || !this.activeLesson.files[fileIndex]) return;
        
        if (confirm('Вы уверены, что хотите удалить этот файл?')) {
            this.activeLesson.files.splice(fileIndex, 1);
            this.app.saveToStorage();
            this.renderFilesList();
            this.app.renderLessonList();
            this.app.showToast('Файл удален!', 'success');
        }
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'doc';
        if (ext === 'txt') return 'txt';
        if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
        return 'txt';
    }

    getFileIcon(type) {
        const icons = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word',
            txt: 'fa-file-alt',
            image: 'fa-file-image'
        };
        return icons[type] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    bindEvents() {
        if (!this.modal) return;

        // Close modal
        document.getElementById('close-files-modal')?.addEventListener('click', () => {
            this.close();
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target.id === 'lesson-files-modal') {
                this.close();
            }
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });

        // Save notes
        document.getElementById('save-lesson-notes')?.addEventListener('click', () => {
            this.saveNotes();
        });

        // File upload
        document.getElementById('file-upload-area')?.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('browse-files-btn')?.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
            e.target.value = '';
        });

        // Drag and drop
        const uploadArea = document.getElementById('file-upload-area');
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = '#e0e7ff';
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#d1d5db';
            uploadArea.style.background = '#f9fafb';
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#d1d5db';
            uploadArea.style.background = '#f9fafb';
            this.handleFileUpload(e.dataTransfer.files);
        });
    }
}

// Export for use in app.js
window.FilesManager = FilesManager;