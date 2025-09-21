// Обновленный ProfileRenderer с API
class ProfileRenderer {
    constructor(apiService) {
        this.apiService = apiService;
    }

    render(userData, container, isOwnProfile) {
        this.currentUserId = userData.id;
    
        console.log('Render profile, userData:', userData);
    
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
        if (bio) bio.textContent = userData.bio || 'Информация отсутствует';
        if (status) {
            if (isOwnProfile) {
                status.textContent = 'Это вы';
                status.className = 'status own';
            } else {
                status.textContent = userData.isOnline ? 'В сети' : this.formatLastSeen(userData.lastSeen);
                status.className = userData.isOnline ? 'status online' : 'status offline';
            }
        }

        const profileTitle = container.querySelector('.profile-title');
        if (profileTitle) {
            profileTitle.textContent = isOwnProfile ? 'Ваш профиль' : 'Профиль пользователя';
        }

        // Добавляем кнопки в зависимости от типа профиля
        this.renderActionButtons(container, isOwnProfile);
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
                actionsContainer.style.display = 'block';
                actionsContainer.innerHTML = `
                    <button class="message-user-button">Написать сообщение</button>
                    <button class="contact-action-button" id="contact-action-button">
                        Проверяем...
                    </button>
                `;
            }

            // Асинхронно обновляем кнопку контакта
            this.updateContactButton(container, this.currentUserId);
        }
    }

    async updateContactButton(container, userId) {
        const button = container.querySelector('#contact-action-button');
        if (!button || !userId) return;
        
        try {
            const isContact = await this.apiService.isContact(userId);
            
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

    toggleContactsVisibility(container, isOwnProfile) {
        const contactsSection = container.querySelector('.contacts-list-section');
        if (contactsSection) {
            contactsSection.style.display = isOwnProfile ? 'block' : 'none';
        }
    }

    formatLastSeen(lastSeen) {
        if (!lastSeen) return 'был в сети давно';
        
        const now = new Date();
        const diff = now - new Date(lastSeen);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `был ${minutes} минут назад`;
        } else if (hours < 24) {
            return `был ${hours} часов назад`;
        } else if (days === 1) {
            return 'был вчера';
        } else {
            return `был ${days} дней назад`;
        }
    }
}

