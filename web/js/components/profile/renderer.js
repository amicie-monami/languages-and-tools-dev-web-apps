// Обновленный ProfileRenderer с API
class ProfileRenderer {
    constructor(apiService) {
        this.apiService = apiService;
    }

    render(userData, container, isOwnProfile) {
        this.fillMainSection(userData, container);
        this.fillBiographySection(userData, container);
        this.fillContactInfoSection(userData, container);
        
        if (isOwnProfile) {
            this.addEditButton(container);
            this.addLogoutButton(container); 
        } else {
            this.addUserActions(userData, container);
        }
    }

    addEditButton(container) {
        const headerActions = container.querySelector('.header-actions');
        if (headerActions) {
            const editButton = document.createElement('button');
            editButton.type = 'button';  // ВАЖНО!
            editButton.className = 'edit-profile-button';
            editButton.innerHTML = '✏️';
            editButton.title = 'Редактировать профиль';
            headerActions.appendChild(editButton);
        }
    }

// Исправленный ProfileRenderer - добавляем обработчик ПОСЛЕ создания кнопки
async addUserActions(userData, container) {
    const actionsSection = container.querySelector('.profile-actions');
    if (!actionsSection) return;

    actionsSection.innerHTML = `
        <button type="button" class="message-user-button">
            Написать сообщение
        </button>
        <button type="button" class="contact-action-button" id="contact-action-button">
            Загрузка...
        </button>
    `;

    // Проверяем статус контакта и обновляем кнопку
    await this.updateContactButton(container, userData.id);
    
    actionsSection.style.display = 'block';

    // КРИТИЧЕСКИ ВАЖНО: Добавляем обработчики ПОСЛЕ создания кнопок!
    this.attachActionButtonHandlers(container);
}

    // Новый метод для добавления обработчиков к кнопкам действий
    attachActionButtonHandlers(container) {
        const messageButton = container.querySelector('.message-user-button');
        const contactButton = container.querySelector('#contact-action-button');

        // Удаляем старые обработчики если есть
        if (messageButton && this.boundMessageHandler) {
            messageButton.removeEventListener('click', this.boundMessageHandler);
        }
        if (contactButton && this.boundContactHandler) {
            contactButton.removeEventListener('click', this.boundContactHandler);
        }

        // Создаем новые bound функции
        this.boundMessageHandler = (e) => {
            console.log('Profile: message button clicked');
            e.preventDefault(); 
            e.stopPropagation(); 
            // Вызываем обработчик из Profile компонента
            if (this.onMessageClick) {
                this.onMessageClick(e);
            }
        };

        this.boundContactHandler = (e) => {
            console.log('Profile: contact action clicked');
            e.preventDefault();
            e.stopPropagation();
            // Вызываем обработчик из Profile компонента
            if (this.onContactAction) {
                this.onContactAction(e);
            }
        };

        // Добавляем новые обработчики
        if (messageButton) {
            messageButton.addEventListener('click', this.boundMessageHandler);
        }
        if (contactButton) {
            contactButton.addEventListener('click', this.boundContactHandler);
        }
    }

    // Добавляем методы для установки callback'ов
    setMessageClickHandler(handler) {
        this.onMessageClick = handler;
    }

    setContactActionHandler(handler) {
        this.onContactAction = handler;
    }

    addLogoutButton(container) {
        const headerActions = container.querySelector('.header-actions');
        if (headerActions) {
            const logoutButton = document.createElement('button');
            logoutButton.type = 'button';  // ВАЖНО!
            logoutButton.className = 'logout-button';
            logoutButton.innerHTML = '🚪';
            logoutButton.title = 'Выйти из аккаунта';
            
            logoutButton.addEventListener('click', () => {
                // Используем AuthGuard для выхода
                window.authGuard.logout();
            });
            
            headerActions.appendChild(logoutButton);
        }
    }
  
    renderActionButtons(container, isOwnProfile) {
        const actionsContainer = container.querySelector('.profile-actions');
    
        if (isOwnProfile) {
            if (actionsContainer) {
                actionsContainer.style.display = 'none';
            }
            
            const headerActions = container.querySelector('.header-actions');
            if (headerActions) {
                // ИСПРАВЛЕНО: Добавляем type="button"!
                headerActions.innerHTML = `
                    <button type="button" class="edit-profile-button" title="Редактировать профиль">⚙️</button>
                `;
            }
        } else {
            if (actionsContainer) {
                actionsContainer.style.display = 'block';
                // ИСПРАВЛЕНО: Добавляем type="button" к каждой кнопке!
                actionsContainer.innerHTML = `
                    <button type="button" class="message-user-button">Написать сообщение</button>
                    <button type="button" class="contact-action-button" id="contact-action-button">
                        Проверяем...
                    </button>
                `;
            }

            // Асинхронно обновляем кнопку контакта
            this.updateContactButton(container, this.currentUserId);
        }
    }

    fillMainSection(userData, container) {
        const avatar = container.querySelector('.profile-avatar');
        const name = container.querySelector('.profile-name');
        const username = container.querySelector('.username');
        const status = container.querySelector('.status');
        
        if (avatar) avatar.src = userData.avatarUrl || 'assets/placeholder.png';
        if (name) name.textContent = userData.name;
        if (username) username.textContent = `@${userData.username}`;
        if (status) status.textContent = userData.isOnline ? 'В сети' : 'Был в сети давно';
    }

    fillBiographySection(userData, container) {
        const biographySection = container.querySelector('.biography-section');
        const biography = container.querySelector('.profile-biography');
        
        if (userData.bio && userData.bio.trim()) {
            if (biography) biography.textContent = userData.bio;
            if (biographySection) biographySection.style.display = 'block';
        } else {
            if (biographySection) biographySection.style.display = 'none';
        }
    }

    fillContactInfoSection(userData, container) {
        // Заполнение контактной информации если нужно
        // Пока оставляем пустым
    }

    async updateContactButton(container, userId) {
        const contactButton = container.querySelector('#contact-action-button');
        if (!contactButton) {
            console.log('Contact button not found');
            return;
        }

        console.log('Checking contact status for user:', userId);
        contactButton.disabled = true;
        contactButton.textContent = 'Проверяем...';

        try {
            const isContact = await this.apiService.isContact(userId);
            console.log(`User ${userId} is contact:`, isContact);
            
            contactButton.disabled = false;
            
            if (isContact) {
                contactButton.textContent = 'Удалить из контактов';
                contactButton.className = 'contact-action-button remove-contact';
            } else {
                contactButton.textContent = 'Добавить в контакты';
                contactButton.className = 'contact-action-button add-contact';
            }
        } catch (error) {
            console.error('Error checking contact status:', error);
            contactButton.textContent = 'Ошибка проверки';
            contactButton.disabled = true;
            
            // Через 3 секунды попробовать еще раз
            setTimeout(() => {
                if (contactButton.textContent === 'Ошибка проверки') {
                    this.updateContactButton(container, userId);
                }
            }, 3000);
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