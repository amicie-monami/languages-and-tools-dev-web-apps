// js/auth/auth-validator.js
class AuthValidator {
    validateLogin(username, password) {
        if (!username || !password) {
            return false;
        }
        
        if (username.length < 2 || password.length < 6) {
            return false;
        }
        
        return true;
    }

    validateRegistration(data) {
        const { name, username, email, password, confirmPassword } = data;
        const errors = [];

        // Проверка имени
        if (!name || name.length < 2) {
            errors.push('Имя должно содержать минимум 2 символа');
        }

        // Проверка username
        if (!username || username.length < 2) {
            errors.push('Username должен содержать минимум 2 символа');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errors.push('Username может содержать только буквы, цифры и подчеркивания');
        }

        // Проверка email
        if (!email || !this.isValidEmail(email)) {
            errors.push('Введите корректный email');
        }

        // Проверка пароля
        if (!password || password.length < 6) {
            errors.push('Пароль должен содержать минимум 6 символов');
        }

        // Проверка подтверждения пароля
        if (password !== confirmPassword) {
            errors.push('Пароли не совпадают');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUsername(username) {
        return /^[a-zA-Z0-9_]{2,30}$/.test(username);
    }
}