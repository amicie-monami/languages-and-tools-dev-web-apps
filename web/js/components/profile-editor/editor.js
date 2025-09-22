// Обновленный ProfileEditor с dependency injection
class ProfileEditor {
    constructor(eventBus, apiService, userService) {
        this.eventBus = eventBus;
        this.apiService = apiService;
        this.userService = userService;
        this.container = null;
        this.dataLoader = new ProfileDataLoader(apiService);
        this.formValidator = new ProfileFormValidator();
        this.avatarUploader = new AvatarUploader();
        this.saveManager = new ProfileSaveManager(apiService, eventBus);
        this.userData = null;
        this.hasChanges = false;
        this.isLoading = false;
    }

    async init(container, data) {
        this.container = container;
        
        try {
            // показываем простое состояние загрузки
            this.setSimpleLoadingState(true);
            
            await this.loadUserData();
            
            // устанавливаем аватар
            this.setAvatarPreview();
            
            this.render();
            this.setupComponents();
            
            this.formValidator.storeOriginalValues();

            this.setupEvents();
            this.isLoading = false;
            this.updateLoadingState();
            
        } catch (error) {
            console.error('Ошибка инициализации редактора профиля:', error);
            this.showErrorMessage('Не удалось загрузить данные профиля');
            this.setSimpleLoadingState(false);
        }
    }

    // Новый метод для установки превью аватара
    setAvatarPreview() {
        const avatarPreview = this.container.querySelector('.avatar-preview');
        if (avatarPreview && this.userData) {
            avatarPreview.src = this.userData.avatarUrl || 'assets/placeholder.png';
            // Сохраняем оригинальный URL для AvatarUploader
            this.avatarUploader.originalAvatarUrl = this.userData.avatarUrl || 'assets/placeholder.png';
        }
    }

    // состояние загрузки без валидации
    setSimpleLoadingState(isLoading) {
        const form = this.container?.querySelector('.profile-edit-form');
        const saveButton = this.container?.querySelector('.save-button');
        
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, button');
            inputs.forEach(input => {
                input.disabled = isLoading;
            });
        }
        
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = isLoading ? 'Загрузка...' : 'Сохранить';
        }
    }

    async loadUserData() {
        try {
            this.userData = await this.dataLoader.getCurrentUserProfile();
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            throw error;
        }
    }

    render() {
        if (this.userData) {
            this.fillForm();
        }
    }

    fillForm() {
        const form = this.container.querySelector('.profile-edit-form');
        if (form && this.userData) {
            // Заполняем поля формы
            const nameField = form.querySelector('#edit-name');
            const usernameField = form.querySelector('#edit-username');
            const bioField = form.querySelector('#edit-bio');
            const avatarPreview = form.querySelector('.avatar-preview');

            if (nameField) nameField.value = this.userData.name || '';
            if (usernameField) usernameField.value = this.userData.username || '';
            if (bioField) {
                bioField.value = this.userData.bio || '';
                // Настраиваем высоту textarea
                if (this.formValidator) {
                    this.formValidator.adjustTextareaHeight(bioField);
                }
            }

            // Аватар уже установлен в setAvatarPreview(), но на всякий случай
            if (avatarPreview && !avatarPreview.src) {
                avatarPreview.src = this.userData.avatarUrl || 'assets/placeholder.png';
            }
        }
    }

    setupComponents() {
        // Настраиваем валидатор формы
        this.formValidator.init(this.container, {
            onValidationChange: (isValid) => this.updateSaveButton(),
            onFieldChange: () => {
                this.updateHasChanges();
            }
        });

        // Настраиваем загрузчик аватаров
        this.avatarUploader.init(this.container, {
            onAvatarChange: (avatarData) => {
                this.updateHasChanges();         
            }
        });

        // Настраиваем менеджер сохранения
        this.saveManager.init(this.container, {
            onSaveStart: () => this.handleSaveStart(),
            onSaveSuccess: (updatedUser) => this.handleSaveSuccess(updatedUser),
            onSaveError: (error) => this.handleSaveError(error)
        });
    }

    updateHasChanges() {
        const formHasChanges = this.formValidator.hasAnyChanges();
        const avatarHasChanges = this.avatarUploader.getAvatarData() !== null;
        
        this.hasChanges = formHasChanges || avatarHasChanges;
        this.updateSaveButton();
    }

    setupEvents() {
        const backButton = this.container.querySelector('.back-button');
        const saveButton = this.container.querySelector('.save-button');

        if (backButton) {
            backButton.addEventListener('click', () => this.handleCancel());
        }

        if (saveButton) {
            saveButton.addEventListener('click', () => this.handleSave());
        }

        // Обработка закрытия страницы с несохраненными изменениями
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    handleBeforeUnload(event) {
        if (this.hasChanges) {
            event.preventDefault();
            event.returnValue = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?';
            return event.returnValue;
        }
    }

    updateSaveButton() {
        const saveButton = this.container.querySelector('.save-button');
        const isValid = this.formValidator.isFormValid();
        
        if (saveButton) {
            saveButton.disabled = !this.hasChanges || !isValid || this.isLoading;
            
            // Обновляем текст кнопки
            if (this.isLoading) {
                saveButton.textContent = 'Сохранение...';
            } else if (!this.hasChanges) {
                saveButton.textContent = 'Сохранить';
            } else if (!isValid) {
                saveButton.textContent = 'Исправьте ошибки';
            } else {
                saveButton.textContent = 'Сохранить изменения';
            }
        }
    }

    updateLoadingState() {
        const form = this.container.querySelector('.profile-edit-form');
        const saveButton = this.container.querySelector('.save-button');
        
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, button');
            inputs.forEach(input => {
                input.disabled = this.isLoading;
            });
        }
        
        this.updateSaveButton();
    }

    handleCancel() {
        if (this.hasChanges) {
            if (confirm('У вас есть несохраненные изменения. Отменить редактирование?')) {
                this.goBackToProfile();
            }
        } else {
            this.goBackToProfile();
        }
    }

    async handleSave() {
        if (!this.hasChanges || !this.formValidator.isFormValid()) {
            return;
        }

        try {
            const formData = this.collectFormData();
            await this.saveManager.saveProfile(formData);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showErrorMessage('Не удалось сохранить профиль');
        }
    }

    collectFormData() {
        const form = this.container.querySelector('.profile-edit-form');
        const formData = {
            name: form.querySelector('#edit-name').value.trim(),
            username: form.querySelector('#edit-username').value.trim(),
            bio: form.querySelector('#edit-bio').value.trim()
        };

        // Добавляем данные аватара если он был изменен
        const avatarData = this.avatarUploader.getAvatarData();
        if (avatarData) {
            formData.avatar = avatarData;
        }

        return formData;
    }

    handleSaveStart() {
        this.isLoading = true;
        this.hasChanges = false;
        this.updateLoadingState();
    }

    handleSaveSuccess(updatedUser) {
        console.log('Profile saved successfully:', updatedUser);
        
        // Обновляем локальные данные
        this.userData = updatedUser;
        this.hasChanges = false;
        this.isLoading = false;
        
        // Показываем уведомление об успехе
        this.showSuccessMessage('Профиль успешно сохранен');
        
        // Уведомляем другие компоненты об обновлении профиля
        this.eventBus.emit('profile-updated', { user: updatedUser });
        
        // Возвращаемся к профилю через небольшую задержку
        setTimeout(() => {
            this.goBackToProfile();
        }, 1500);
    }

    handleSaveError(error) {
        console.error('Save error:', error);
        this.isLoading = false;
        this.updateLoadingState();
        
        // Показываем конкретную ошибку если есть
        let errorMessage = 'Не удалось сохранить профиль';
        if (error.message === 'Username already taken') {
            errorMessage = 'Этот username уже занят';
        } else if (error.message === 'Invalid username format') {
            errorMessage = 'Неверный формат username';
        }
        
        this.showErrorMessage(errorMessage);
    }

    goBackToProfile() {
        // Убираем обработчик beforeunload
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        window.app.leftPanel.goBack();
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `profile-editor-notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            error: '#dc3545',
            success: '#28a745',
            info: '#007bff'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Удаление через 4 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    destroy() {
        // Убираем обработчик beforeunload
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        // Очищаем компоненты
        this.formValidator?.destroy();
        this.avatarUploader?.destroy();
        this.saveManager?.destroy();
    }
}