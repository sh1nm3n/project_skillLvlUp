// frontend/api-service.js
class ApiService {
    constructor(baseUrl = 'http://localhost:3000/api') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка запроса');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) this.setToken(data.token);
        return data;
    }

    async register(name, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        if (data.token) this.setToken(data.token);
        return data;
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async updateProfile(name, email) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, email })
        });
    }

    // Courses
    async getCourses(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await this.request(`/courses${params ? '?' + params : ''}`);
    }

    async getCourse(id) {
        return await this.request(`/courses/${id}`);
    }

    async createCourse(data) {
        return await this.request('/courses', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCourse(id, data) {
        return await this.request(`/courses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCourse(id) {
        return await this.request(`/courses/${id}`, { method: 'DELETE' });
    }

    // Lessons
    async getLessons(courseId) {
        return await this.request(`/courses/${courseId}/lessons`);
    }

    async createLesson(courseId, data) {
        return await this.request(`/courses/${courseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateLesson(id, data) {
        return await this.request(`/courses/lessons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async toggleLessonComplete(id) {
        return await this.request(`/courses/lessons/${id}/complete`, {
            method: 'PATCH'
        });
    }

    async updateLessonNotes(id, notes) {
        return await this.request(`/courses/lessons/${id}/notes`, {
            method: 'PUT',
            body: JSON.stringify({ notes })
        });
    }

    async deleteLesson(id) {
        return await this.request(`/courses/lessons/${id}`, { method: 'DELETE' });
    }

    // Files
    async uploadFile(lessonId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseUrl}/courses/lessons/${lessonId}/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    }

    async deleteFile(fileId) {
        return await this.request(`/courses/files/${fileId}`, { method: 'DELETE' });
    }

    // Reports
    async getStats() {
        return await this.request('/reports/stats');
    }

    async getDeadlines() {
        return await this.request('/reports/deadlines');
    }

    async exportReport() {
        const response = await fetch(`${this.baseUrl}/reports/export`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        return await response.blob();
    }
}

// ✅ Экспорт для глобального доступа
window.ApiService = ApiService;