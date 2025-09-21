// Обновленный AvatarUploader
class AvatarUploader {
    constructor() {
        this.container = null;
        this.callbacks = {};
        this.avatarData = null;
        this.originalAvatarUrl = null;
        this.boundHandlers = {};
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    }

    init(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        
        const avatarPreview = container.querySelector('.avatar-preview');
        if (avatarPreview) {
            this.originalAvatarUrl = avatarPreview.src;
        }
        
        this.setupUploader();
    }

    setupUploader() {
        const uploadButton = this.container.querySelector('.upload-button');
        const fileInput = this.container.querySelector('#edit-avatar');
        
        if (uploadButton && fileInput) {
            this.boundHandlers.uploadClick = () => fileInput.click();
            this.boundHandlers.fileChange = (e) => this.handleFileChange(e);
            this.boundHandlers.dragOver = (e) => this.handleDragOver(e);
            this.boundHandlers.dragLeave = (e) => this.handleDragLeave(e);
            this.boundHandlers.drop = (e) => this.handleDrop(e);

            uploadButton.addEventListener('click', this.boundHandlers.uploadClick);
            fileInput.addEventListener('change', this.boundHandlers.fileChange);
            
            // Добавляем поддержку drag & drop
            const avatarPreview = this.container.querySelector('.avatar-preview');
            if (avatarPreview) {
                avatarPreview.addEventListener('dragover', this.boundHandlers.dragOver);
                avatarPreview.addEventListener('dragleave', this.boundHandlers.dragLeave);
                avatarPreview.addEventListener('drop', this.boundHandlers.drop);
            }
        }
    }

    hasAvatarChanged() {
        if (!this.avatarData) return false;
        return this.avatarData.url !== this.originalAvatarUrl;
    }

    // возвращаем данные только если аватар изменился
    getAvatarData() {
        return this.hasAvatarChanged() ? this.avatarData : null;
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.style.opacity = '0.7';
        event.currentTarget.style.transform = 'scale(1.05)';
    }

    handleDragLeave(event) {
        event.currentTarget.style.opacity = '1';
        event.currentTarget.style.transform = 'scale(1)';
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.style.opacity = '1';
        event.currentTarget.style.transform = 'scale(1)';
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Валидация типа файла
        if (!this.allowedTypes.includes(file.type)) {
            alert('Поддерживаются только изображения: JPEG, PNG, GIF, WebP');
            return;
        }

        // Валидация размера файла
        if (file.size > this.maxFileSize) {
            alert('Размер файла не должен превышать 5MB');
            return;
        }

        // Создаем preview
        this.createImagePreview(file);
    }

    createImagePreview(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const avatarPreview = this.container.querySelector('.avatar-preview');
            
            if (avatarPreview) {
                avatarPreview.src = imageUrl;
                
                // Добавляем эффект изменения
                avatarPreview.style.transition = 'transform 0.3s ease';
                avatarPreview.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    avatarPreview.style.transform = 'scale(1)';
                }, 300);
            }
            
            this.avatarData = {
                url: imageUrl,
                file: file,
                name: file.name,
                size: file.size,
                type: file.type
            };
            
            if (this.callbacks.onAvatarChange) {
                this.callbacks.onAvatarChange(this.avatarData);
            }
        };
        
        reader.onerror = () => {
            alert('Ошибка при чтении файла');
        };
        
        reader.readAsDataURL(file);
    }

    getAvatarData() {
        return this.avatarData;
    }

    clearAvatar() {
        this.avatarData = null;
        const avatarPreview = this.container.querySelector('.avatar-preview');
        if (avatarPreview) {
            avatarPreview.src = 'assets/placeholder.png';
        }
    }

    destroy() {
        const uploadButton = this.container?.querySelector('.upload-button');
        const fileInput = this.container?.querySelector('#edit-avatar');
        const avatarPreview = this.container?.querySelector('.avatar-preview');
        
        if (uploadButton && this.boundHandlers.uploadClick) {
            uploadButton.removeEventListener('click', this.boundHandlers.uploadClick);
        }
        
        if (fileInput && this.boundHandlers.fileChange) {
            fileInput.removeEventListener('change', this.boundHandlers.fileChange);
        }
        
        if (avatarPreview) {
            if (this.boundHandlers.dragOver) {
                avatarPreview.removeEventListener('dragover', this.boundHandlers.dragOver);
            }
            if (this.boundHandlers.dragLeave) {
                avatarPreview.removeEventListener('dragleave', this.boundHandlers.dragLeave);
            }
            if (this.boundHandlers.drop) {
                avatarPreview.removeEventListener('drop', this.boundHandlers.drop);
            }
        }
        
        this.boundHandlers = {};
        this.avatarData = null;
    }
}