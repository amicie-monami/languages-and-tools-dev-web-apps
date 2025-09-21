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
        this.render();
        this.setupEvents();
        
        // Подписываемся на обновления статуса пользователя
        if (!this.isOwnProfile) {
            this.subscribeToUserUpdates();
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

    render() {
        console.log(`[${this.instanceId}] Profile: render() isOwn=${this.isOwnProfile}`);
       
        if (this.userData) {
            this.renderer.render(this.userData, this.container, this.isOwnProfile);
            
            // Показываем контакты только для своего профиля
            if (this.isOwnProfile) {
                this.loadAndRenderContacts();
            } else {
                // Для чужого профиля показываем актуальный статус
                this.updateUserStatus();
            }
        }
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
                e.stopPropagation();
                window.app.leftPanel.goBack();
            },
            
            editClick: () => {
                console.log('Profile: edit button clicked');
                window.app.leftPanel.loadComponent('profile-editor');
            },
            
            messageClick: () => {
                console.log('Profile: message button clicked');
                this.openChatWithUser();
            },
            
            contactActionClick: async (e) => {
                console.log('Profile: contact action clicked');
                await this.handleContactAction(e);
            }
        };

        const backButton = this.container.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', this.boundHandlers.backClick);
        }

        if (this.isOwnProfile) {
            const editButton = this.container.querySelector('.edit-profile-button');
            if (editButton) {
                editButton.addEventListener('click', this.boundHandlers.editClick);
            }
        } else {
            const messageButton = this.container.querySelector('.message-user-button');
            if (messageButton) {
                messageButton.addEventListener('click', this.boundHandlers.messageClick);
            }
            
            const contactButton = this.container.querySelector('#contact-action-button');
            if (contactButton) {
                contactButton.addEventListener('click', this.boundHandlers.contactActionClick);
            }
        }
    }

    async handleContactAction(event) {
        const button = event.target;
        if (!button || button.disabled) return;
        
        const isRemove = button.classList.contains('remove-contact');
        const originalText = button.textContent;
        
        // Блокируем кнопку и показываем процесс
        button.disabled = true;
        button.textContent = isRemove ? 'Удаляем...' : 'Добавляем...';
        
        try {
            if (isRemove) {
                await this.apiService.removeContact(this.userData.id);
            } else {
                await this.apiService.addContact(this.userData.id);
            }
            
            // Обновляем кнопку через рендерер
            await this.renderer.updateContactButton(this.container, this.userData.id);
            
            // Уведомляем об изменении контактов
            this.eventBus.emit('contacts-updated');
            
            this.showSuccessMessage(isRemove ? 'Контакт удален' : 'Контакт добавлен');
            
        } catch (error) {
            console.error('Ошибка управления контактом:', error);
            button.textContent = 'Ошибка';
            this.showErrorMessage('Не удалось выполнить действие');
            
            // Возвращаем исходный текст через 2 секунды
            setTimeout(async () => {
                await this.renderer.updateContactButton(this.container, this.userData.id);
            }, 2000);
        }
    }

    openChatWithUser() {
        this.eventBus.emit('open-chat-with-user', {
            userId: this.userData.id,
            userName: this.userData.name,
            userAvatar: this.userData.avatarUrl // ИСПРАВЛЕНО: было avatar
        });

        window.app.leftPanel.goBack();
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
}