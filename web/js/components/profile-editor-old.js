/* 
ProfileEditor - координирует компоненты
ProfileFormValidator - валидация полей
AvatarUploader - загрузка аватара
ProfileSaveManager - сохранение данных
*/
class ProfileEditor {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ProfileDataLoader();
        this.formValidator = new ProfileFormValidator();
        this.avatarUploader = new AvatarUploader();
        this.saveManager = new ProfileSaveManager();
        this.userData = null;
        this.hasChanges = false;
    }

    async init(container, data) {
        this.container = container;
        await this.loadUserData();
        this.render();
        this.setupComponents();
        this.setupEvents();
    }

    async loadUserData() {
        try {
            this.userData = await this.dataLoader.getCurrentUserProfile();
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    render() {
        if (this.userData) {
            this.fillForm();
        }
    }

    fillForm() {
        const form = this.container.querySelector('.profile-edit-form');
        if (form) {
            form.querySelector('#edit-name').value = this.userData.name;
            form.querySelector('#edit-username').value = this.userData.username;
            
            const bioField = form.querySelector('#edit-bio')
            bioField.value = this.userData.bio || '';
            if (this.formValidator) {
                this.formValidator.adjustTextareaHeight(bioField);
            }
        }

        const avatarPreview = form.querySelector('.avatar-preview');
        if (avatarPreview) {
            avatarPreview.src = this.userData.avatarUrl;
        }
    }

    setupComponents() {
        this.formValidator.init(this.container, {
            onValidationChange: (isValid) => this.updateSaveButton(),
            onFieldChange: () => {
                this.hasChanges = true;
                this.updateSaveButton();
            }
        });

        this.avatarUploader.init(this.container, {
            onAvatarChange: (avatarData) => {
                this.hasChanges = true;
                this.updateSaveButton();
            }
        });

        this.saveManager.init(this.container, {
            onSaveStart: () => this.handleSaveStart(),
            onSaveSuccess: () => this.handleSaveSuccess(),
            onSaveError: (error) => this.handleSaveError(error)
        });
    }

    setupEvents() {
        const cancelButton = this.container.querySelector('.back-button');
        const saveButton = this.container.querySelector('.save-button');

        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.handleCancel());
        }

        if (saveButton) {
            saveButton.addEventListener('click', () => this.handleSave());
        }
    }

    updateSaveButton() {
        const saveButton = this.container.querySelector('.save-button');
        const isValid = this.formValidator.isFormValid();
        
        if (saveButton) {
            saveButton.disabled = !this.hasChanges || !isValid;
        }
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
        const formData = this.collectFormData();
        await this.saveManager.saveProfile(formData);
    }

    collectFormData() {
        const form = this.container.querySelector('.profile-edit-form');
        const formData = {
            name: form.querySelector('#edit-name').value.trim(),
            username: form.querySelector('#edit-username').value.trim(),
            bio: form.querySelector('#edit-bio').value.trim()
        };

        const avatarData = this.avatarUploader.getAvatarData();
        if (avatarData) {
            formData.avatarUrl = avatarData.url;
        }

        return formData;
    }

    handleSaveStart() {
        this.hasChanges = false;
        this.updateSaveButton();
    }

    handleSaveSuccess() {
        console.log('Profile saved successfully');
        setTimeout(() => this.goBackToProfile(), 1000);
    }

    handleSaveError(error) {
        console.error('Save error:', error);
    }

    goBackToProfile() {
        window.app.leftPanel.goBack();
    }

    destroy() {
        this.formValidator?.destroy();
        this.avatarUploader?.destroy();
        this.saveManager?.destroy();
    }
}

// ProfileFormValidator - отвечает только за валидацию форм
class ProfileFormValidator {
    constructor() {
        this.container = null;
        this.callbacks = {};
        this.boundHandlers = {};
        this.MIN_USERNAME_LENGTH = 2
        this.MAX_USERNAME_LENGTH = 16
    }

    init(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.setupValidation();
    }

    setupValidation() {
        const form = this.container.querySelector('.profile-edit-form');
        const inputs = form.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            this.boundHandlers[input.id] = {
                input: (e) => this.handleInput(e),
                blur: (e) => this.handleBlur(e)
            };

            input.addEventListener('input', this.boundHandlers[input.id].input);
            input.addEventListener('blur', this.boundHandlers[input.id].blur);
        
            if (input.id === 'edit-bio') {
                this.boundHandlers[input.id].keydown = (e) => this.handleBioKeydown(e);
                input.addEventListener('keydown', this.boundHandlers[input.id].keydown);
            }
        });
    }

    handleBioKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Блокируем Enter
            return false;
        }
    }

    handleInput(event) {
        const input = event.target;
        if (input.id === 'edit-bio') {
            this.adjustTextareaHeight(input);
        }    

        this.updateCharCounter(input);
        this.validateField(input);
        
        if (this.callbacks.onFieldChange) {
            this.callbacks.onFieldChange();
        }

        if (this.callbacks.onValidationChange) {
            this.callbacks.onValidationChange(this.isFormValid());
        }
    }

    adjustTextareaHeight(textarea) {
        // Сбрасываем высоту для правильного расчета
        textarea.style.height = 'auto';
        
        // Рассчитываем количество строк
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const padding = parseInt(window.getComputedStyle(textarea).paddingTop) + 
                       parseInt(window.getComputedStyle(textarea).paddingBottom);
        
        // Устанавливаем высоту по содержимому
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(60, scrollHeight); // Минимум 60px
        
        // Ограничиваем максимальную высоту (например, 4 строки)
        const maxHeight = lineHeight * 4 + padding;
        textarea.style.height = Math.min(newHeight, maxHeight) + 'px';
        
        // Показываем скролл если превышена максимальная высота
        if (scrollHeight > maxHeight) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }

    handleBlur(event) {
        this.validateField(event.target);
    }

    updateCharCounter(input) {
        const maxLength = input.getAttribute('maxlength');
        if (!maxLength) return;
        
        const formGroup = input.closest('.form-group');
        let counter = formGroup.querySelector('.char-counter');
        
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'char-counter';
            formGroup.appendChild(counter);
        }
        
        const currentLength = input.value.length;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength) {
            formGroup.classList.add('over-limit');
        } else {
            formGroup.classList.remove('over-limit');
        }
    }

    validateField(input) {
        const formGroup = input.closest('.form-group');
        const value = input.value.trim();
        let isValid = true;
        
        // Базовая валидация
        if (input.hasAttribute('required') && !value) {
            isValid = false;
        }
        
        // Специфичная валидация
        if (input.id === 'edit-username') {
            isValid = /^[a-zA-Z0-9_]+$/.test(value) && value.length >= this.MIN_USERNAME_LENGTH;
        } else if (input.id === 'edit-name') {
            isValid = value.length >= 1 && value.length <= 50;
        }
        
        // Обновляем состояние поля
        formGroup.classList.remove('error', 'success');
        if (value && isValid) {
            formGroup.classList.add('success');
            formGroup.classList.add('changed');
            setTimeout(() => formGroup.classList.remove('changed'), 300);
        } else if (value && !isValid) {
            formGroup.classList.add('error');
        }
        
        return isValid;
    }

    isFormValid() {
        const form = this.container.querySelector('.profile-edit-form');
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        return Array.from(inputs).every(input => this.validateField(input));
    }

    destroy() {
        const form = this.container?.querySelector('.profile-edit-form');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (this.boundHandlers[input.id]) {
                    input.removeEventListener('input', this.boundHandlers[input.id].input);
                    input.removeEventListener('blur', this.boundHandlers[input.id].blur);
                   
                    if (input.id === 'edit-bio' && this.boundHandlers[input.id].keydown) {
                        input.removeEventListener('keydown', this.boundHandlers[input.id].keydown);
                    }
                }
            });

        }
        this.boundHandlers = {};
    }
}

// AvatarUploader - отвечает только за загрузку аватара
class AvatarUploader {
    constructor() {
        this.container = null;
        this.callbacks = {};
        this.avatarData = null;
        this.boundHandlers = {};
    }

    init(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this.setupUploader();
    }

    setupUploader() {
        const uploadButton = this.container.querySelector('.upload-button');
        const fileInput = this.container.querySelector('#edit-avatar');
        const avatarPreview = this.container.querySelector('.avatar-preview');
        
        if (uploadButton && fileInput) {
            this.boundHandlers.uploadClick = () => fileInput.click();
            this.boundHandlers.fileChange = (e) => this.handleFileChange(e);

            uploadButton.addEventListener('click', this.boundHandlers.uploadClick);
            fileInput.addEventListener('change', this.boundHandlers.fileChange);
        }
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            // Проверяем тип файла
            if (!file.type.startsWith('image/')) {
                alert('Выберите изображение');
                return;
            }

            // Проверяем размер (например, не более 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Размер файла не должен превышать 5MB');
                return;
            }

            const imageUrl = URL.createObjectURL(file);
            const avatarPreview = this.container.querySelector('.avatar-preview');
            
            if (avatarPreview) {
                avatarPreview.src = imageUrl;
            }
            
            this.avatarData = {
                url: imageUrl,
                file: file
            };
            
            if (this.callbacks.onAvatarChange) {
                this.callbacks.onAvatarChange(this.avatarData);
            }
        }
    }

    getAvatarData() {
        return this.avatarData;
    }

    destroy() {
        const uploadButton = this.container?.querySelector('.upload-button');
        const fileInput = this.container?.querySelector('#edit-avatar');
        
        if (uploadButton && this.boundHandlers.uploadClick) {
            uploadButton.removeEventListener('click', this.boundHandlers.uploadClick);
        }
        
        if (fileInput && this.boundHandlers.fileChange) {
            fileInput.removeEventListener('change', this.boundHandlers.fileChange);
        }
        
        this.boundHandlers = {};
        this.avatarData = null;
    }
}

// ProfileSaveManager - отвечает только за сохранение
class ProfileSaveManager {
    constructor() {
        this.container = null;
        this.callbacks = {};
    }

    init(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
    }

    async saveProfile(formData) {
        const saveButton = this.container.querySelector('.save-button');
        
        // Валидация
        if (!formData.name) {
            alert('Имя не может быть пустым');
            return;
        }

        if (!formData.username) {
            alert('Username не может быть пустым');
            return;
        }

        try {
            // Показываем состояние загрузки
            this.setLoadingState(true);
            
            if (this.callbacks.onSaveStart) {
                this.callbacks.onSaveStart();
            }

            // Сохраняем данные
            await this.updateUserProfile(formData);
            
            // Успех
            saveButton.textContent = 'Сохранено!';
            
            if (this.callbacks.onSaveSuccess) {
                this.callbacks.onSaveSuccess();
            }
            
        } catch (error) {
            saveButton.textContent = 'Ошибка';
            
            if (this.callbacks.onSaveError) {
                this.callbacks.onSaveError(error);
            }
            
            setTimeout(() => {
                saveButton.textContent = 'Сохранить';
            }, 300);
        } finally {
            this.setLoadingState(false);
        }
    }

    setLoadingState(isLoading) {
        const saveButton = this.container.querySelector('.save-button');
        
        if (isLoading) {
            saveButton.classList.add('loading');
            saveButton.disabled = true;
        } else {
            saveButton.classList.remove('loading');
        }
    }

    async updateUserProfile(formData) {
        const currentUser = window.mockDataService.getCurrentUser();
        
        if (formData.avatarUrl) {
            currentUser.avatarUrl = formData.avatarUrl;
        }
        
        Object.assign(currentUser, {
            name: formData.name,
            username: formData.username,
            bio: formData.bio
        });
        
        // Имитируем задержку сети
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    destroy() {
        // Cleanup если нужно
    }
}