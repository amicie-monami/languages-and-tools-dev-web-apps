// Profile.js - Компонент профиля
class Profile {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ProfileDataLoader();
        this.renderer = new ProfileRenderer();
        this.userData = null;
        this.isOwnProfile = true;
        this.contactsManager = new ContactsManager();
        // debugg
        this.instanceId = Date.now() + Math.random();
        console.log(`Profile instance created: ${this.instanceId}`);
    }

    async init(container, data) {
        console.log(`[${this.instanceId}] Profile: init()`);
        this.container = container;

        const userId = data?.userId;
        this.isOwnProfile = !userId;
    
        this.previousComponent = data?.from || 'chats-list'; 
        await this.loadUserData(data?.userId);

        this.render();
        this.setupEvents();
    }

    async loadUserData(userId = null) {
        try {
            if (userId) {
                this.userData = await this.dataLoader.getUserProfile(userId);
            } else {
                this.userData = await this.dataLoader.getCurrentUserProfile();
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    render() {
        console.log(`[${this.instanceId}] Profile: render() isOwn=${!this.userData}`);
       
        if (this.userData) {
            this.renderer.render(this.userData, this.container, this.isOwnProfile);
            
            // Показываем контакты только для своего профиля
            if (this.isOwnProfile) {
                this.loadAndRenderContacts();
            }
        }
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
        // bound function for cleanup
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
            contactActionClick: async () => {
                console.log('Profile: contact action clicked');
                await this.handleContactAction();
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

    setupContactActions() {
        const contactButton = this.container.querySelector('#contact-action-button');
        if (contactButton) {
            contactButton.addEventListener('click', async () => {
                await this.handleContactAction();
            });
        }
    }

    async handleContactAction() {
        const button = this.container.querySelector('#contact-action-button');
        if (!button || button.disabled) return;
        
        const isRemove = button.classList.contains('remove-contact');
        button.disabled = true;
        button.textContent = isRemove ? 'Удаляем...' : 'Добавляем...';
        
        try {
            if (isRemove) {
                await window.mockDataService.removeContact(this.userData.id);
            } else {
                await window.mockDataService.addContact(this.userData.id);
            }
            
            // Обновляем кнопку
            this.renderer.updateContactButton(this.container);
            this.eventBus.emit('contacts-updated');
            
        } catch (error) {
            console.error('Ошибка управления контактом:', error);
            button.textContent = 'Ошибка';
            setTimeout(() => {
                this.renderer.updateContactButton(this.container);
            }, 2000);
        }
    }

    openChatWithUser() {
        // Ищем существующий чат с этим пользователем
        this.eventBus.emit('open-chat-with-user', {
            userId: this.userData.id,
            userName: this.userData.name,
            userAvatar: this.userData.avatarUrl
        });

        window.app.leftPanel.goBack();
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
        this.boundHandlers = null;
    }
}

class ProfileDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }

    async getCurrentUserProfile() {
        return this.mockService.getCurrentUser();
    }

    async getUserProfile(userId) {
        return await this.mockService.getUser(userId);
    }
}

class ProfileRenderer {
    render(userData, container, isOwnProfile) {
        this.currentUserId = userData.id; // Сохраняем ID для использования в кнопках
    
        console.log('Render profile, userData:', userData); // Отладка
    
        const avatar = container.querySelector('.profile-avatar');
        if (avatar && userData.avatarUrl) {
            avatar.src = userData.avatarUrl;
        }
        
        const name = container.querySelector('.profile-name');
        const username = container.querySelector('.username');
        const bio = container.querySelector('.profile-biography');
        const status = container.querySelector('.status');

        if (name) name.textContent = userData.name;
        if (username) username.textContent = `@${userData.username}`;
        if (bio) bio.textContent = userData.bio;
        if (status) status.textContent = userData.isOnline ? 'В сети' : this.formatLastSeen(userData.lastSeen);

        const profileTitle = container.querySelector('.profile-title'); // Добавьте эту строку

        // Изменяем заголовок в зависимости от типа профиля
        if (profileTitle) {
            profileTitle.textContent = isOwnProfile ? 'Ваш профиль' : 'Профиль пользователя';
        }

        // Добавляем кнопки в зависимости от типа профиля
        this.renderActionButtons(container, isOwnProfile);
        // Показываем/скрываем контактную информацию
        this.toggleContactsVisibility(container, isOwnProfile);
    }
  
    renderActionButtons(container, isOwnProfile) {
        const actionsContainer = container.querySelector('.profile-actions');
    
        if (isOwnProfile) {
            if (actionsContainer) {
                actionsContainer.style.display = 'none';
            }
            
            const headerActions = container.querySelector('.header-actions');
            if (headerActions) {
                headerActions.innerHTML = `
                    <button class="edit-profile-button" title="Редактировать профиль">⚙️</button>
                `;
            }
        } else {
            if (actionsContainer) {
                actionsContainer.style.display = 'block'
                actionsContainer.innerHTML = `
                    <button class="message-user-button">Написать сообщение</button>
                    <button class="contact-action-button" id="contact-action-button">
                        Проверяем...
                    </button>
                `;
            }

            this.updateContactButton(container);
        }
    }

    async updateContactButton(container) {
        const button = container.querySelector('#contact-action-button');
        if (!button) return;
        
        // Получаем ID пользователя из данных профиля
        const userId = this.getCurrentUserId(container);
        if (!userId) return;
        
        try {
            const isContact = await window.mockDataService.isContact(userId);
            
            if (isContact) {
                button.textContent = 'Удалить из контактов';
                button.className = 'contact-action-button remove-contact';
            } else {
                button.textContent = 'Добавить в контакты';
                button.className = 'contact-action-button add-contact';
            }
            
            button.disabled = false;
        } catch (error) {
            console.error('Ошибка проверки контакта:', error);
            button.textContent = 'Ошибка';
            button.disabled = true;
        }
    }

    getCurrentUserId(container) {
        // Получаем userId из данных профиля - нужно передавать его в рендерер
        return this.currentUserId;
    }

    toggleContactsVisibility(container, isOwnProfile) {
        const contactsSection = container.querySelector('.contacts-section');
        if (contactsSection) {
            // Показываем контакты только для своего профиля
            contactsSection.style.display = isOwnProfile ? 'block' : 'none';
        }
    }

    formatLastSeen(lastSeen) {
        const now = new Date();
        const diff = now - lastSeen;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `был(а) ${minutes} минут назад`;
        } else if (hours < 24) {
            return `был(а) ${hours} часов назад`;
        } else if (days === 1) {
            return 'был(а) вчера';
        } else {
            return `был(а) ${days} дней назад`;
        }
    }
}