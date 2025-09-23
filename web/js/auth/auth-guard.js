// js/auth/auth-guard.js - Сервис проверки авторизации
class AuthGuard {
    constructor() {
        this.storage = new AuthStorage();
        this.currentUser = null;
    }

    // Основной метод проверки авторизации
    checkAuth() {
        try {
            const session = this.storage.getSession();
            if (!session) {
                console.log('No session found');
                return false;
            }

            // Проверяем не истекла ли сессия
            if (session.expiresAt && session.expiresAt < Date.now()) {
                console.log('Session expired');
                this.clearAuth();
                return false;
            }

            this.currentUser = session.user;
            console.log('Valid session found for:', this.currentUser.username);
            return true;
        } catch (error) {
            console.error('Error checking auth:', error);
            this.clearAuth();
            return false;
        }
    }

    // Очистка авторизации
    clearAuth() {
        this.storage.clearSession();
        this.currentUser = null;
    }

    // Перенаправление на страницу авторизации
    redirectToAuth() {
        console.log('Redirecting to auth page');
        window.location.href = 'auth.html';
    }

    // Выход из системы
    logout() {
        if (confirm('Выйти из аккаунта?')) {
            this.clearAuth();
            this.redirectToAuth();
        }
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }

    // Проверка авторизован ли пользователь
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Middleware для защищенных маршрутов
    requireAuth(callback) {
        if (this.checkAuth()) {
            callback();
        } else {
            this.redirectToAuth();
        }
    }
}

// Создаем глобальный экземпляр
window.authGuard = new AuthGuard();