class ChatsList {
    constructor(eventBus, apiService, userService) {
        this.eventBus = eventBus;
        this.container = null;
        this.apiService = apiService
        this.userService = userService;
        
        this.dataLoader = new ChatsListDataLoader(apiService);
        this.renderer = new ChatsListRenderer(apiService);
        
        this.usersStatus = {};
        this.chats = [];
        
        this.instanceId = Date.now() + Math.random();
        this.boundHandlers = {}; 
        this.isProcessingClick = false;
        console.log("ChatsList instance created:", this.instanceId);
    }

    async init(container, data) {
        this.container = container;
        await this.setProfileAvatar();
        await this.loadData();
        this.render();
        this.setupEvents();
        this.subscribeToUserUpdates();
        console.log("[ChatsList] init()");
    }

    async loadData() {
        try {
            this.chats = await this.dataLoader.getAll();
            const userIds = this.chats.map(chat => chat.userId);
            await this.userService.loadUsers(userIds);
            
        } catch (error) {
            console.error('Chats loading error:', error);
            this.chats = [];
        }
    }

    render() {
        console.log(`[${this.instanceId}] ChatsList: render()`);
        this.renderer.render(this.chats, this.container, this.userService);
    }

    setupEvents() {
        console.log(`[${this.instanceId}] ChatsList: setupEvents()`);
        
        // удаляем старые
        this.removeEventListeners();        
        // создаем новые bound функции
        this.boundHandlers = {
            documentClickHandler: (event) => {
                this.hideContextMenu();
            },

            clickHandler: (event) => {
                console.log(`[${this.instanceId}] ChatsList: click event triggered`);
                this.hideContextMenu();
                
                if (this.isProcessingClick) {
                    console.log(`[${this.instanceId}] Click ignored - already processing`);
                    return;
                }
                
                if (event.target.classList.contains('chats-profile-avatar')) {
                    event.stopPropagation();
                    this.eventBus.emit('profile-requested');
                    return;
                }

				if (event.target.classList.contains('search-input')) {
					if (window.app.leftPanel.getCurrentComponentName() !== 'search') {
						window.app.leftPanel.loadComponent('search');
					}
					return;
				}

                const chatItem = event.target.closest('.chat-item');
                if (chatItem) {
                    this.isProcessingClick = true;
                    
                    const chatId = parseInt(chatItem.dataset.chatId);
                    const chat = this.chats.find(c => c.id === chatId);
                    
                    if (chat) {
                        console.log(`[${this.instanceId}] Emitting chat-selected:`, chatId);
                        this.eventBus.emit('chat-selected', {
                            id: chat.id,
                            userId: chat.userId,
                            name: chat.name,
                            avatarUrl: chat.avatarUrl,
                            type: chat.type
                        });
                    }

                    
                    setTimeout(async () => {
                        await this.refresh()
                        await this.setActiveChat(chatId)
                    }, 0);

                    setTimeout(() => {
                        this.isProcessingClick = false;
                    }, 500);
                }
            },

            contextMenuHandler: (event) => {
                const chatItem = event.target.closest('.chat-item');
                if (chatItem) {
                    event.preventDefault();
                    const chatId = parseInt(chatItem.dataset.chatId);
                    const chat = this.chats.find(c => c.id === chatId);
                    
                    if (chat) {
                        this.showContextMenu(event, chat, chatItem);
                    }
                }
            },
        };

        // Добавляем обработчики
        if (this.container) {
            this.container.addEventListener('click', this.boundHandlers.clickHandler);
            this.container.addEventListener('contextmenu', this.boundHandlers.contextMenuHandler);
        }
    

        document.addEventListener('click', this.boundHandlers.documentClickHandler);
        console.log(`[${this.instanceId}] Event listeners added`);
    }

    // Новый метод - устанавливает аватар сразу с правильным src
    async setProfileAvatar() {
        const profileAvatar = this.container.querySelector('.chats-profile-avatar');
        if (!profileAvatar) return;
        
        try {
            const currentUser = await this.apiService.getCurrentUser();
            // Устанавливаем аватар пользователя или fallback на placeholder
            profileAvatar.src = currentUser.avatarUrl || 'assets/placeholder.png';
        } catch (error) {
            console.error('Error loading current user avatar:', error);
            // В случае ошибки показываем placeholder
            profileAvatar.src = 'assets/placeholder.png';
        }
    }

    async setActiveChat(chatId) {
        await this.apiService.markChatAsRead(chatId)
        // Убираем активный класс у всех чатов
        const allChatItems = this.container.querySelectorAll('.chat-item');
        allChatItems.forEach(item => item.classList.remove('active'));
        
        // Добавляем активный класс текущему чату
        const activeChat = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        if (activeChat) {
            activeChat.classList.add('active');
        }
    }

    updateSingleChat(chatId, message) {
        console.log(`[${this.instanceId}] Updating single chat:`, chatId);
        
        const chatIndex = this.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
            const chat = this.chats[chatIndex];
            
            // Обновляем последнее сообщение
            chat.lastMessage = {
                text: message.text,
                time: message.time,
                senderId: message.senderId,
                isRead: true
            };
            
            // Перемещаем чат в начало массива (если не закреплен)
            if (!chat.isPinned && chatIndex > 0) {
                const updatedChat = this.chats.splice(chatIndex, 1)[0];
                this.chats.unshift(updatedChat);
            }
            
            // Перерисовываем элемент
            this.updateChatItemInDOM(chatId);
            
            // Перемещаем в DOM (если не закреплен)
            if (!chat.isPinned) {
                this.moveChatToTop(chatId);
            }
            
        } else {
            console.log(`[${this.instanceId}] Chat ${chatId} not found, refreshing list`);
            this.refresh();
        }
    }

    // В класс ChatsList добавьте метод
    moveChatToTop(chatId) {
        const chatElement = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        const chatsList = this.container.querySelector('#chats-list ul');
        
        if (chatElement && chatsList && !chatElement.previousElementSibling?.classList?.contains('pinned')) {
            // Если чат не закреплен и не первый среди незакрепленных, перемещаем его
            const firstNonPinned = chatsList.querySelector('.chat-item:not(.pinned)');
            if (firstNonPinned && firstNonPinned !== chatElement) {
                chatsList.insertBefore(chatElement, firstNonPinned);
            }
        }
    }

    updateChatItemInDOM(chatId) {
        const chatElement = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const chat = this.chats.find(c => c.id === chatId);
            if (chat) {
                const newElement = this.renderer.createChatItem(chat, this.userService);
                chatElement.replaceWith(newElement);
            }
        }
    }
    
    showContextMenu(event, chat, chatElement) {
        this.hideContextMenu();
        
        const menu = this.createContextMenu(chat);
        document.body.appendChild(menu);
        
        // positions menu with boundary checking
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (event.clientX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (event.clientY - rect.height) + 'px';
        }
    }

    createContextMenu(chat) {
        const menu = document.createElement('div');
        menu.className = 'chat-context-menu';
        menu.id = 'chat-context-menu';
        
        const pinText = chat.isPinned ? 'Unpin' : 'Pin';
        const muteText = chat.isMuted ? 'Enable notifications' : 'Mute notifications';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="pin" data-chat-id="${chat.id}">
                ${pinText}
            </div>
            <div class="context-menu-item" data-action="mute" data-chat-id="${chat.id}">
                ${muteText}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete" data-chat-id="${chat.id}">
                Delete chat
            </div>
        `;
        
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            const chatId = parseInt(e.target.dataset.chatId);
            
            if (action && chatId) {
                this.handleContextMenuAction(action, chatId);
            }
            
            this.hideContextMenu();
        });
        
        return menu;
    }

    hideContextMenu() {
        const existingMenu = document.getElementById('chat-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }
    
    async handleContextMenuAction(action, chatId) {
        try {
            switch (action) {
                case 'pin':
                    await this.apiService.toggleChatPin(chatId);
                    break;
                case 'mute':
                    await this.apiService.toggleChatMute(chatId);
                    break;
                case 'delete':
                    if (confirm('Delete chat? This action cannot be undone.')) {
                        await this.apiService.deleteChat(chatId);
                        this.eventBus.emit('chat-deleted', { chatId: chatId });
                    }
                    break;
            }
            
            await this.refresh();
            
        } catch (error) {
            console.error('Action processing error:', error);
        }
    }

    async updateProfileAvatar() {
        await this.setProfileAvatar()
    }

    // Подписываемся на обновления статусов пользователей
    subscribeToUserUpdates() {
        this.unsubscribeFromUserUpdates = this.userService.subscribe((event, data) => {
            if (event === 'user-status-changed') {
                // Обновляем только индикатор онлайн для конкретного пользователя
                this.updateUserStatusInDOM(data.userId, data.isOnline);
            }
        });
    }

    // Обновляет статус пользователя в DOM без полной перерисовки
    updateUserStatusInDOM(userId, isOnline) {
        const chat = this.chats.find(c => c.userId === userId);
        if (chat) {
            const chatElement = this.container.querySelector(`[data-chat-id="${chat.id}"]`);
            if (chatElement) {
                const indicator = chatElement.querySelector('.online-indicator');
                if (isOnline && !indicator) {
                    // Добавляем индикатор
                    const avatar = chatElement.querySelector('.chat-avatar img');
                    if (avatar) {
                        const newIndicator = document.createElement('span');
                        newIndicator.className = 'online-indicator';
                        avatar.parentNode.appendChild(newIndicator);
                    }
                } else if (!isOnline && indicator) {
                    // Убираем индикатор
                    indicator.remove();
                }
            }
        }
    }

    async refresh() {
        console.log(`[${this.instanceId}] ChatsList: refresh() called`);
        await this.loadData();
        this.render();
    }

	removeEventListeners() {
        console.log(`[${this.instanceId}] ChatsList: removeEventListeners()`);
        
        if (this.boundHandlers.clickHandler && this.container) {
            this.container.removeEventListener('click', this.boundHandlers.clickHandler);
        }
        
        if (this.boundHandlers.contextMenuHandler && this.container) {
            this.container.removeEventListener('contextmenu', this.boundHandlers.contextMenuHandler);
        }
        
        if (this.boundHandlers.documentClickHandler) {
            document.removeEventListener('click', this.boundHandlers.documentClickHandler);
        }
    }


    destroy() {
        console.log(`[${this.instanceId}] ChatsList: destroy()`);
        this.removeEventListeners();
        // Отписываемся от обновлений пользователей
        if (this.unsubscribeFromUserUpdates) {
            this.unsubscribeFromUserUpdates();
        }
        this.boundHandlers = {};
    }
}



