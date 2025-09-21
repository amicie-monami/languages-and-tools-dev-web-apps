// Улучшенный ProfileFormValidator с исправленной логикой подсветки
class ProfileFormValidator {
    constructor() {
        this.container = null;
        this.callbacks = {};
        this.boundHandlers = {};
        this.MIN_USERNAME_LENGTH = 2;
        this.MAX_USERNAME_LENGTH = 30;
        this.MAX_NAME_LENGTH = 50;
        this.MAX_BIO_LENGTH = 200;
        this.usernameCheckTimeout = null;
        this.originalValues = {}; // хранение исходных значений
        this.isInitializing = false; // флаг для предотвращения ложного срабатывания при инициализации
    }

    init(container, callbacks) {
        console.log('[DEBUG] ProfileFormValidator.init()');
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
                blur: (e) => this.handleBlur(e),
                focus: (e) => this.handleFocus(e)
            };

            input.addEventListener('input', this.boundHandlers[input.id].input);
            input.addEventListener('blur', this.boundHandlers[input.id].blur);
            input.addEventListener('focus', this.boundHandlers[input.id].focus);
        
            if (input.id === 'edit-bio') {
                this.boundHandlers[input.id].keydown = (e) => this.handleBioKeydown(e);
                input.addEventListener('keydown', this.boundHandlers[input.id].keydown);
            }
        });
    }

    // метод для сохранения исходных значений
    storeOriginalValues() {
        console.log('[DEBUG] ProfileFormValidator.storeOriginalValues()');
        this.isInitializing = true; // устанавливаем флаг инициализации
        
        const form = this.container?.querySelector('.profile-edit-form');
        if (form) {
            this.originalValues = {
                name: form.querySelector('#edit-name')?.value || '',
                username: form.querySelector('#edit-username')?.value || '',
                bio: form.querySelector('#edit-bio')?.value || ''
            };
            console.log('[DEBUG] Stored original values:', this.originalValues);
            
            // Очищаем все статусы полей при инициализации
            const formGroups = form.querySelectorAll('.form-group');
            formGroups.forEach(group => this.clearFieldStatus(group));
        } else {
            console.warn('[DEBUG] Form not found when storing original values');
        }
        
        // Снимаем флаг инициализации через небольшую задержку
        setTimeout(() => {
            this.isInitializing = false;
        }, 100);
    }

    hasFieldChanged(fieldId, currentValue) {
        const fieldMap = {
            'edit-name': 'name',
            'edit-username': 'username', 
            'edit-bio': 'bio'
        };
        
        const originalKey = fieldMap[fieldId];
        const originalValue = this.originalValues[originalKey];
        const hasChanged = originalKey && originalValue !== currentValue;
        
        console.log(`[DEBUG] hasFieldChanged(${fieldId}):`, {
            originalValue,
            currentValue,
            hasChanged
        });
        
        return hasChanged;
    }

    handleInput(event) {
        const input = event.target;
        console.log(`[DEBUG] handleInput(${input.id}): "${input.value}"`);
        
        // Если мы в процессе инициализации, не обрабатываем изменения
        if (this.isInitializing) {
            console.log('[DEBUG] Skipping input handling during initialization');
            return;
        }
        
        if (input.id === 'edit-bio') {
            this.adjustTextareaHeight(input);
        }

        this.updateCharCounter(input);
        
        if (input.id === 'edit-username') {
            this.validateUsernameRealTime(input);
        } else {
            this.validateField(input);
        }
        
        if (this.callbacks.onFieldChange) {
            console.log('[DEBUG] Calling onFieldChange callback');
            this.callbacks.onFieldChange();
        }

        if (this.callbacks.onValidationChange) {
            const isValid = this.isFormValid();
            console.log('[DEBUG] Calling onValidationChange:', isValid);
            this.callbacks.onValidationChange(isValid);
        }
    }

    validateField(input) {
        const formGroup = input.closest('.form-group');
        const value = input.value.trim();
        const hasChanged = this.hasFieldChanged(input.id, value);
        let isValid = true;
        let errorMessage = '';
        
        console.log(`[DEBUG] validateField(${input.id}):`, {
            value,
            hasChanged,
            originalValues: this.originalValues,
            isInitializing: this.isInitializing
        });
        
        // Базовая валидация обязательных полей
        if (input.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Это поле обязательно';
        }
        
        // Специфичная валидация по полям
        if (value && input.id === 'edit-username') {
            if (!this.validateUsernameFormat(value)) {
                isValid = false;
                if (value.length < this.MIN_USERNAME_LENGTH) {
                    errorMessage = `Минимум ${this.MIN_USERNAME_LENGTH} символа`;
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    errorMessage = 'Только буквы, цифры и _';
                }
            }
        } else if (value && input.id === 'edit-name') {
            if (value.length > this.MAX_NAME_LENGTH) {
                isValid = false;
                errorMessage = `Максимум ${this.MAX_NAME_LENGTH} символов`;
            }
        } else if (input.id === 'edit-bio') {
            if (value.length > this.MAX_BIO_LENGTH) {
                isValid = false;
                errorMessage = `Максимум ${this.MAX_BIO_LENGTH} символов`;
            }
        }
        
        // Определяем статус поля - КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
        if (!isValid) {
            // Поле невалидно - показываем ошибку
            this.setFieldStatus(formGroup, 'error', errorMessage);
        } else if (hasChanged && isValid) {
            // Поле изменилось и валидно - показываем успех (зеленый)
            this.setFieldStatus(formGroup, 'success');
        } else {
            // Поле не изменилось или вернулось к исходному значению - убираем статусы (серое)
            this.clearFieldStatus(formGroup);
        }
        
        console.log(`[DEBUG] Field ${input.id} final status:`, {
            isValid,
            hasChanged,
            finalStatus: !isValid ? 'error' : (hasChanged ? 'success' : 'none')
        });
        
        return isValid;
    }

    hasAnyChanges() {
        const form = this.container?.querySelector('.profile-edit-form');
        if (!form) {
            console.log('[DEBUG] hasAnyChanges: form not found');
            return false;
        }

        const nameChanged = this.hasFieldChanged('edit-name', form.querySelector('#edit-name')?.value || '');
        const usernameChanged = this.hasFieldChanged('edit-username', form.querySelector('#edit-username')?.value || '');
        const bioChanged = this.hasFieldChanged('edit-bio', form.querySelector('#edit-bio')?.value || '');

        console.log('[DEBUG] hasAnyChanges:', {
            nameChanged,
            usernameChanged,
            bioChanged,
            result: nameChanged || usernameChanged || bioChanged
        });

        return nameChanged || usernameChanged || bioChanged;
    }

    validateUsernameRealTime(input) {
        // Очищаем предыдущий timeout
        if (this.usernameCheckTimeout) {
            clearTimeout(this.usernameCheckTimeout);
        }

        const formGroup = input.closest('.form-group');
        const value = input.value.trim();
        const hasChanged = this.hasFieldChanged(input.id, value);
        
        console.log(`[DEBUG] validateUsernameRealTime: hasChanged=${hasChanged}, value="${value}"`);
        
        // Если поле не изменилось - убираем статусы
        if (!hasChanged) {
            this.clearFieldStatus(formGroup);
            return;
        }
        
        // Базовая валидация
        if (!this.validateUsernameFormat(value)) {
            this.setFieldStatus(formGroup, 'error');
            return;
        }

        // Показываем состояние проверки
        this.setFieldStatus(formGroup, 'checking');
        
        // Проверяем доступность username через API с задержкой
        this.usernameCheckTimeout = setTimeout(async () => {
            try {
                const isAvailable = await window.apiService.checkUsernameAvailability(value);
                if (isAvailable) {
                    this.setFieldStatus(formGroup, 'success');
                } else {
                    this.setFieldStatus(formGroup, 'error', 'Этот username уже занят');
                }
            } catch (error) {
                console.error('Error checking username:', error);
                this.setFieldStatus(formGroup, 'error', 'Ошибка проверки username');
            }
        }, 500);
    }

    // метод для очистки статуса поля
    clearFieldStatus(formGroup) {
        console.log('[DEBUG] clearFieldStatus');
        formGroup.classList.remove('error', 'success', 'checking');
        
        const statusIcon = formGroup.querySelector('.field-status');
        if (statusIcon) {
            statusIcon.remove();
        }
        
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    setFieldStatus(formGroup, status, message = '') {
        console.log(`[DEBUG] setFieldStatus: ${status}`, message);
        formGroup.classList.remove('error', 'success', 'checking');
        formGroup.classList.add(status);
        
        let statusIcon = formGroup.querySelector('.field-status');
        if (!statusIcon) {
            statusIcon = document.createElement('div');
            statusIcon.className = 'field-status';
            formGroup.appendChild(statusIcon);
        }
        
        statusIcon.className = `field-status ${status}`;
        
        let errorMessage = formGroup.querySelector('.error-message');
        if (status === 'error' && message) {
            if (!errorMessage) {
                errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                formGroup.appendChild(errorMessage);
            }
            errorMessage.textContent = message;
        } else if (errorMessage) {
            errorMessage.remove();
        }
    }

    handleFocus(event) {
        // При фокусе не убираем статусы - пользователь может просто кликнуть на поле
        // Убираем только если поле пустое и обязательное
    }

    handleBlur(event) {
        this.validateField(event.target);
    }

    handleBioKeydown(event) {
        if (event.key === 'Enter') {
            // Разрешаем Enter в биографии, но ограничиваем количество строк
            const lines = event.target.value.split('\n');
            if (lines.length >= 4) {
                event.preventDefault();
                return false;
            }
        }
    }

    validateUsernameFormat(username) {
        if (username.length < this.MIN_USERNAME_LENGTH) return false;
        if (username.length > this.MAX_USERNAME_LENGTH) return false;
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
        return true;
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const padding = parseInt(window.getComputedStyle(textarea).paddingTop) + 
                       parseInt(window.getComputedStyle(textarea).paddingBottom);
        
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(60, scrollHeight);
        
        // Ограничиваем максимальную высоту (4 строки)
        const maxHeight = lineHeight * 4 + padding;
        textarea.style.height = Math.min(newHeight, maxHeight) + 'px';
        
        if (scrollHeight > maxHeight) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }

    updateCharCounter(input) {
        const maxLength = this.getMaxLength(input.id);
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
        
        // Цветовая индикация приближения к лимиту
        if (currentLength > maxLength * 0.9) {
            counter.style.color = '#ff6b6b';
        } else if (currentLength > maxLength * 0.75) {
            counter.style.color = '#ffa726';
        } else {
            counter.style.color = '#6b7280';
        }
        
        if (currentLength > maxLength) {
            formGroup.classList.add('over-limit');
        } else {
            formGroup.classList.remove('over-limit');
        }
    }

    getMaxLength(fieldId) {
        switch (fieldId) {
            case 'edit-name': return this.MAX_NAME_LENGTH;
            case 'edit-username': return this.MAX_USERNAME_LENGTH;
            case 'edit-bio': return this.MAX_BIO_LENGTH;
            default: return null;
        }
    }

    isFormValid() {
        const form = this.container.querySelector('.profile-edit-form');
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        
        let isValid = true;
        
        for (const input of inputs) {
            if (!this.validateField(input)) {
                isValid = false;
            }
        }
        
        // Дополнительная проверка на наличие ошибок
        const errorGroups = form.querySelectorAll('.form-group.error');
        if (errorGroups.length > 0) {
            isValid = false;
        }
        
        return isValid;
    }

    destroy() {
        const form = this.container?.querySelector('.profile-edit-form');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                if (this.boundHandlers[input.id]) {
                    input.removeEventListener('input', this.boundHandlers[input.id].input);
                    input.removeEventListener('blur', this.boundHandlers[input.id].blur);
                    input.removeEventListener('focus', this.boundHandlers[input.id].focus);
                   
                    if (input.id === 'edit-bio' && this.boundHandlers[input.id].keydown) {
                        input.removeEventListener('keydown', this.boundHandlers[input.id].keydown);
                    }
                }
            });
        }
        
        if (this.usernameCheckTimeout) {
            clearTimeout(this.usernameCheckTimeout);
        }
        
        this.boundHandlers = {};
    }
}