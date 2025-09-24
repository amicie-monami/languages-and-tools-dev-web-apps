// Обновленный Profile компонент с dependency injection
class Profile {
    constructor(eventBus, apiService, userService) {
        this.eventBus = eventBus;
        this.apiService = apiService;
        this.userService = userService;
        this.container = null;
        this.dataLoader = new ProfileDataLoader(apiService);
        this.renderer = new ProfileRenderer(apiService);
        this.userData = null;
        this.isOwnProfile = true;
        this.contactsManager = new ContactsManager(apiService, eventBus);
        this.unsubscribeFromUserUpdates = null;
        
        // Debugging
        this.instanceId = Date.now() + Math.random();
        console.log(`Profile instance created: ${this.instanceId}`);
    }

    async init(container, data) {
        console.log(`[${this.instanceId}] Profile: init()`);
        this.container = container;

        const userId = data?.userId;
        this.isOwnProfile = !userId;
        this.previousComponent = data?.from || 'chats-list'; 
        
        await this.loadUserData(userId);

        this.setProfileAvatar()

        this.render();
        this.setupEvents();
        
        // Подписываемся на обновления статуса пользователя
        if (!this.isOwnProfile) {
            this.subscribeToUserUpdates();
        }
    }
    
    setProfileAvatar() {
        const avatar = this.container.querySelector('.profile-avatar');
        if (avatar && this.userData) {
            avatar.src = this.userData.avatarUrl || 'assets/placeholder.png';
        }
    }

    async loadUserData(userId = null) {
        try {
            if (userId) {
                // Загружаем профиль другого пользователя
                this.userData = await this.dataLoader.getUserProfile(userId);
                // Также загружаем его в UserService для статуса
                await this.userService.loadUsers([userId]);
            } else {
                // Загружаем свой профиль
                this.userData = await this.dataLoader.getCurrentUserProfile();
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            this.showErrorMessage('Не удалось загрузить профиль');
        }
    }

    async render() {
        console.log(`[${this.instanceId}] Profile: render() isOwn=${this.isOwnProfile}`);
        
        this.renderer.render(this.userData, this.container, this.isOwnProfile);
        
        // ВАЖНО: Устанавливаем обработчики ДЛЯ КНОПОК ПОСЛЕ их создания
        if (!this.isOwnProfile) {
            // Устанавливаем обработчики для кнопок действий
            this.renderer.setMessageClickHandler((e) => this.openChatWithUser());
            this.renderer.setContactActionHandler((e) => this.handleContactAction(e));
        }
        
        if (this.isOwnProfile) {
            await this.loadAndRenderContacts();
        }
        
        this.updateUserStatus();
    }

    // Обновляет статус пользователя в профиле
    updateUserStatus() {
        if (!this.isOwnProfile && this.userData) {
            const status = this.container.querySelector('.status');
            if (status) {
                const isOnline = this.userService.getUserStatus(this.userData.id);
                const user = this.userService.getUser(this.userData.id);
                
                if (isOnline) {
                    status.textContent = 'В сети';
                    status.className = 'status online';
                } else if (user && user.lastSeen) {
                    status.textContent = this.formatLastSeen(user.lastSeen);
                    status.className = 'status offline';
                } else {
                    status.textContent = 'Был в сети давно';
                    status.className = 'status offline';
                }
            }
        }
    }

    formatLastSeen(lastSeen) {
        const now = new Date();
        const diff = now - new Date(lastSeen);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) {
            return 'только что был в сети';
        } else if (minutes < 60) {
            return `был в сети ${minutes} мин назад`;
        } else if (hours < 24) {
            return `был в сети ${hours} ч назад`;
        } else if (days === 1) {
            return 'был в сети вчера';
        } else {
            return `был в сети ${days} дн назад`;
        }
    }

    // Подписываемся на обновления статуса пользователя
    subscribeToUserUpdates() {
        this.unsubscribeFromUserUpdates = this.userService.subscribe((event, data) => {
            if (event === 'user-status-changed' && data.userId === this.userData.id) {
                this.updateUserStatus();
            }
        });
    }

    async loadAndRenderContacts() {
        const contactsSection = this.container.querySelector('.contacts-list-section');
        if (contactsSection) {
            contactsSection.style.display = 'block';
            await this.contactsManager.render(this.container);
        }
    }

    setupEvents() {
        console.log(`[${this.instanceId}] Profile: setupEvents()`);
        
        this.boundHandlers = {
            backClick: (e) => {
                console.log('Profile: back button clicked');
                e.preventDefault(); // На всякий случай
                e.stopPropagation();
                window.app.leftPanel.goBack();
            },
            
            editClick: (e) => {
                console.log('Profile: edit button clicked');
                e.preventDefault();
                e.stopPropagation();
                window.app.leftPanel.loadComponent('profile-editor');
            }
        };
    
        // Добавляем обработчики только для кнопок, которые точно существуют
        const backButton = this.container.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', this.boundHandlers.backClick);
        }
    
        if (this.isOwnProfile) {
            const editButton = this.container.querySelector('.edit-profile-button');
            if (editButton) {
                editButton.addEventListener('click', this.boundHandlers.editClick);
            }
        }
        
        // НЕ добавляем обработчики для кнопок действий здесь - они добавляются в renderer.addUserActions()
    }

    // Исправленный метод handleContactAction в Profile
    async handleContactAction(event) {
        // ВАЖНО: Предотвращаем стандартное поведение
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.target;
        if (!button || button.disabled) return;
        
        const isRemove = button.classList.contains('remove-contact');
        const originalText = button.textContent;
        const userId = this.userData.id;
        
        console.log(`${isRemove ? 'Removing' : 'Adding'} contact ${userId}`);
        
        // Блокируем кнопку и показываем процесс
        button.disabled = true;
        button.textContent = isRemove ? 'Удаляем...' : 'Добавляем...';
        
        try {
            if (isRemove) {
                await this.apiService.removeContact(userId);
                console.log(`Successfully removed contact ${userId}`);
            } else {
                await this.apiService.addContact(userId);
                console.log(`Successfully added contact ${userId}`);
            }
            
            // Обновляем кнопку через рендерер (он сам проверит текущий статус)
            await this.renderer.updateContactButton(this.container, userId);
            
            // Уведомляем об изменении контактов
            this.eventBus.emit('contacts-updated');
            
            // Показываем сообщение об успехе
            this.showSuccessMessage(isRemove ? 
                'Контакт удален' : 
                'Контакт добавлен'
            );
            
        } catch (error) {
            console.error('Error handling contact action:', error);
            
            // Восстанавливаем кнопку
            button.disabled = false;
            button.textContent = originalText;
            
            // Показываем ошибку
            this.showErrorMessage(isRemove ? 
                'Не удалось удалить контакт' : 
                'Не удалось добавить контакт'
            );
        }
    }

    // В методе openChatWithUser добавьте больше логов:
    openChatWithUser(e) {
        console.log('%c🎯 openChatWithUser called', 'background: green; color: white;');
        
        if (e) {
            console.log('Event details:', e);
            e.preventDefault();
            e.stopPropagation();
            console.log('Event prevented and stopped');
        }
        
        console.log('Profile: Opening chat with user', this.userData.id);
        
        // Эмитим событие для создания/открытия чата
        this.eventBus.emit('open-chat-with-user', {
            userId: this.userData.id,
            userName: this.userData.name,
            userAvatar: this.userData.avatarUrl
        });

        // НЕ вызываем goBack сразу - пусть чат сначала загрузится
        console.log('%c🎯 Chat opening initiated', 'background: green; color: white;');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `profile-notification ${type}`;
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
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    destroy() {
        console.log(`[${this.instanceId}] Profile: destroy()`);
        
        if (this.boundHandlers) {
            const backButton = this.container?.querySelector('.back-button');
            if (backButton && this.boundHandlers.backClick) {
                backButton.removeEventListener('click', this.boundHandlers.backClick);
            }

            const editButton = this.container?.querySelector('.edit-profile-button');
            if (editButton && this.boundHandlers.editClick) {
                editButton.removeEventListener('click', this.boundHandlers.editClick);
            }

            const messageButton = this.container?.querySelector('.message-user-button');
            if (messageButton && this.boundHandlers.messageClick) {
                messageButton.removeEventListener('click', this.boundHandlers.messageClick);
            }

            const contactButton = this.container?.querySelector('#contact-action-button');
            if (contactButton && this.boundHandlers.contactActionClick) {
                contactButton.removeEventListener('click', this.boundHandlers.contactActionClick);
            }
        }
        
        // Отписываемся от обновлений пользователей
        if (this.unsubscribeFromUserUpdates) {
            this.unsubscribeFromUserUpdates();
        }
        
        this.boundHandlers = null;
    }

    showErrorMessage(message) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = 'profile-notification error';
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
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
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
}