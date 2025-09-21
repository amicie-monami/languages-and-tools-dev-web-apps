// Обновленный ProfileSaveManager с API
class ProfileSaveManager {
    constructor(apiService, eventBus) {
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.container = null;
        this.callbacks = {};
    }

    init(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
    }

    async saveProfile(formData) {
        const saveButton = this.container.querySelector('.save-button');
        
        // Валидация на клиенте
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            // Уведомляем о начале сохранения
            if (this.callbacks.onSaveStart) {
                this.callbacks.onSaveStart();
            }

            // Показываем состояние загрузки
            this.setLoadingState(true);
            
            // Подготавливаем данные для отправки
            const updateData = await this.prepareUpdateData(formData);
            
            // Сохраняем профиль через API
            const updatedUser = await this.apiService.updateCurrentUser(updateData);
            
            // Успех
            this.setLoadingState(false);
            saveButton.textContent = 'Сохранено!';
            
            if (this.callbacks.onSaveSuccess) {
                this.callbacks.onSaveSuccess(updatedUser);
            }
            
        } catch (error) {
            console.error('Error saving profile:', error);
            this.setLoadingState(false);
            saveButton.textContent = 'Ошибка';
            
            if (this.callbacks.onSaveError) {
                this.callbacks.onSaveError(error);
            }
            
            // Возвращаем исходный текст через 3 секунды
            setTimeout(() => {
                saveButton.textContent = 'Сохранить';
            }, 3000);
        }
    }

    validateFormData(formData) {
        if (!formData.name || formData.name.length < 1) {
            alert('Имя не может быть пустым');
            return false;
        }

        if (!formData.username || formData.username.length < 2) {
            alert('Username должен содержать минимум 2 символа');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            alert('Username может содержать только буквы, цифры и подчеркивания');
            return false;
        }

        if (formData.bio && formData.bio.length > 200) {
            alert('Биография не может быть длиннее 200 символов');
            return false;
        }

        return true;
    }

    async prepareUpdateData(formData) {
        const updateData = {
            name: formData.name,
            username: formData.username,
            bio: formData.bio
        };

        // Обрабатываем аватар если он был изменен
        if (formData.avatar) {
            try {
                // Загружаем аватар через API
                const avatarUrl = await this.uploadAvatar(formData.avatar);
                updateData.avatarUrl = avatarUrl;
            } catch (error) {
                console.error('Error uploading avatar:', error);
                throw new Error('Не удалось загрузить аватар');
            }
        }

        return updateData;
    }

    async uploadAvatar(avatarData) {
        if (avatarData.file) {
            // Реальная загрузка файла
            return await this.apiService.uploadAvatar(avatarData.file);
        } else if (avatarData.url) {
            // Уже есть URL (например, blob URL)
            return avatarData.url;
        }
        
        throw new Error('Invalid avatar data');
    }

    setLoadingState(isLoading) {
        const saveButton = this.container.querySelector('.save-button');
        
        if (saveButton) {
            if (isLoading) {
                saveButton.classList.add('loading');
                saveButton.disabled = true;
            } else {
                saveButton.classList.remove('loading');
            }
        }
    }

    destroy() {
        this.container = null;
        this.callbacks = {};
    }
}

