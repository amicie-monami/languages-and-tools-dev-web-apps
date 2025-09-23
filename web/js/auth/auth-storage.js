// js/auth/auth-storage.js
class AuthStorage {
    constructor() {
        this.SESSION_KEY = 'messenger_session';
        this.REMEMBER_KEY = 'messenger_remember';
    }

    saveSession(sessionData) {
        try {
            const dataToSave = {
                ...sessionData,
                timestamp: Date.now()
            };
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(dataToSave));
            console.log('Session saved successfully');
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    getSession() {
        try {
            const savedData = localStorage.getItem(this.SESSION_KEY);
            if (!savedData) return null;

            const session = JSON.parse(savedData);
            
            // Проверяем не истекла ли сессия
            if (session.expiresAt && session.expiresAt < Date.now()) {
                this.clearSession();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error loading session:', error);
            this.clearSession();
            return null;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(this.SESSION_KEY);
            localStorage.removeItem(this.REMEMBER_KEY);
            console.log('Session cleared');
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }

    saveRememberMe(credentials) {
        try {
            localStorage.setItem(this.REMEMBER_KEY, JSON.stringify(credentials));
        } catch (error) {
            console.error('Error saving remember me:', error);
        }
    }

    getRememberMe() {
        try {
            const saved = localStorage.getItem(this.REMEMBER_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading remember me:', error);
            return null;
        }
    }

    // Утилиты для работы с токенами
    saveToken(token) {
        try {
            localStorage.setItem('messenger_token', token);
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    getToken() {
        try {
            return localStorage.getItem('messenger_token');
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    removeToken() {
        try {
            localStorage.removeItem('messenger_token');
        } catch (error) {
            console.error('Error removing token:', error);
        }
    }

    // Проверка доступности localStorage
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }
}