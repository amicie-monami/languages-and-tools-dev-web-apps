// js/auth/auth-manager.js
class AuthManager {
    constructor() {
        this.validator = new AuthValidator();
        this.storage = new AuthStorage();
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    init() {
        // Проверяем есть ли сохраненная сессия
        this.checkExistingSession();
        
        if (this.isAuthenticated) {
            // Перенаправляем на главную страницу если уже авторизован
            this.redirectToApp();
        } else {
            // Настраиваем обработчики форм
            this.setupEventListeners();
        }
    }

    checkExistingSession() {
        const savedSession = this.storage.getSession();
        if (savedSession && savedSession.token && savedSession.expiresAt > Date.now()) {
            this.currentUser = savedSession.user;
            this.isAuthenticated = true;
            console.log('Найдена активная сессия для:', this.currentUser.username);
        }
    }

    setupEventListeners() {
        // Переключение между формами
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Обработка форм
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Валидация в реальном времени
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        this.clearErrors();
    }

    showLoginForm() {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        this.clearErrors();
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        // Валидация
        if (!this.validator.validateLogin(username, password)) {
            this.showError('Заполните все поля');
            return;
        }

        this.showLoading('Выполняется вход...');

        try {
            // Имитация API запроса
            await this.delay(1500);
            
            const loginResult = await this.attemptLogin(username, password);
            
            if (loginResult.success) {
                this.handleLoginSuccess(loginResult.user);
            } else {
                this.showError(loginResult.error);
            }
        } catch (error) {
            this.showError('Ошибка подключения к серверу');
            console.error('Login error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        // Валидация
        const validation = this.validator.validateRegistration({
            name, username, email, password, confirmPassword
        });

        if (!validation.isValid) {
            this.showError(validation.errors[0]);
            return;
        }

        this.showLoading('Создание аккаунта...');

        try {
            await this.delay(2000);
            
            const registerResult = await this.attemptRegister({
                name, username, email, password
            });
            
            if (registerResult.success) {
                this.handleLoginSuccess(registerResult.user);
            } else {
                this.showError(registerResult.error);
            }
        } catch (error) {
            this.showError('Ошибка создания аккаунта');
            console.error('Registration error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async attemptLogin(username, password) {
        // Имитация проверки логина (в реальности - API запрос)
        
        // Демо-пользователи для тестирования
        const demoUsers = [
            {
                id: 1,
                name: 'Вы',
                username: 'me',
                email: 'me@example.com',
                password: '123456',
                avatarUrl: 'assets/me.png'
            },
            {
                id: 2,
                name: 'Анна Смирнова',
                username: 'anna_s',
                email: 'anna@example.com',
                password: 'anna123',
                avatarUrl: 'assets/anna.png'
            }
        ];

        const user = demoUsers.find(u => 
            (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
            return {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatarUrl
                }
            };
        } else {
            return {
                success: false,
                error: 'Неверный логин или пароль'
            };
        }
    }

    async attemptRegister(userData) {
        // Имитация регистрации (в реальности - API запрос)
        
        // Проверяем не занят ли username
        const existingUsers = ['me', 'anna_s', 'max_dev', 'liza_k'];
        if (existingUsers.includes(userData.username.toLowerCase())) {
            return {
                success: false,
                error: 'Username уже занят'
            };
        }

        // Создаем нового пользователя
        const newUser = {
            id: Date.now(),
            name: userData.name,
            username: userData.username,
            email: userData.email,
            avatarUrl: 'assets/placeholder.png',
            bio: '',
            isOnline: true
        };

        return {
            success: true,
            user: newUser
        };
    }

    handleLoginSuccess(user) {
        this.currentUser = user;
        this.isAuthenticated = true;

        // Сохраняем сессию
        this.storage.saveSession({
            user: user,
            token: this.generateToken(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 дней
        });

        console.log('Успешная авторизация:', user.username);
        
        // Перенаправляем на главную страницу
        this.redirectToApp();
    }

    redirectToApp() {
        // Анимация успеха
        this.showSuccess('Добро пожаловать!');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    generateToken() {
        // Простая генерация токена (в реальности должен приходить с сервера)
        return 'token_' + Math.random().toString(36).substr(2) + Date.now();
    }

    showLoading(message = 'Загрузка...') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('auth-error').classList.add('hidden');
        
        const loading = document.getElementById('auth-loading');
        loading.classList.remove('hidden');
        loading.querySelector('p').textContent = message;
    }

    hideLoading() {
        document.getElementById('auth-loading').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    }

    showError(message) {
        const error = document.getElementById('auth-error');
        error.querySelector('p').textContent = message;
        error.classList.remove('hidden');
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            error.classList.add('hidden');
        }, 5000);
    }

    showSuccess(message) {
        const loading = document.getElementById('auth-loading');
        loading.classList.remove('hidden');
        loading.querySelector('p').textContent = message;
        
        const spinner = loading.querySelector('.loading-spinner');
        spinner.innerHTML = '✅';
        spinner.style.border = 'none';
        spinner.style.animation = 'none';
        spinner.style.fontSize = '30px';
        spinner.style.display = 'flex';
        spinner.style.alignItems = 'center';
        spinner.style.justifyContent = 'center';
    }

    clearErrors() {
        document.getElementById('auth-error').classList.add('hidden');
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            group.classList.remove('error', 'success');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    }

    validateField(input) {
        const value = input.value.trim();
        const formGroup = input.parentNode;
        
        let isValid = true;
        let errorMessage = '';

        switch (input.type) {
            case 'email':
                if (!this.validator.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Неверный формат email';
                }
                break;
            case 'password':
                if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Минимум 6 символов';
                }
                break;
        }

        if (input.id === 'register-username' && value.length < 2) {
            isValid = false;
            errorMessage = 'Минимум 2 символа';
        }

        this.setFieldStatus(formGroup, isValid, errorMessage);
    }

    setFieldStatus(formGroup, isValid, errorMessage = '') {
        formGroup.classList.remove('error', 'success');
        
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) existingError.remove();

        if (!isValid && errorMessage) {
            formGroup.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = errorMessage;
            formGroup.appendChild(errorDiv);
        } else if (isValid && formGroup.querySelector('input').value.trim()) {
            formGroup.classList.add('success');
        }
    }

    clearFieldError(input) {
        const formGroup = input.parentNode;
        formGroup.classList.remove('error');
        const errorMsg = formGroup.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Публичные методы для использования в приложении
    logout() {
        this.storage.clearSession();
        this.currentUser = null;
        this.isAuthenticated = false;
        window.location.href = 'auth.html';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}