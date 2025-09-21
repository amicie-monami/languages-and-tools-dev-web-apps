class ChatsList {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ChatsListDataLoader();
        this.renderer = new ChatsListRenderer();
        this.chats = [];
        this.instanceId = Date.now() + Math.random();
        this.boundHandlers = {}; // ВАЖНО: инициализируем сразу
        this.isProcessingClick = false;
        console.log("ChatsList instance created:", this.instanceId);
    }

    async init(container, data) {
        this.container = container;
        await this.loadData();
        this.render();
        this.setupEvents();
        console.log("chatsList.init()")
    }

    async loadData() {
        try {
            this.chats = await this.dataLoader.getAll();
        } catch (error) {
            console.error('Chats loading error:', error);
            this.chats = [];
        }
    }

	render() {
        console.log(`[${this.instanceId}] ChatsList: render()`);
        this.updateProfileAvatar();
        this.renderer.render(this.chats, this.container);
    }

    setupEvents() {
        console.log(`[${this.instanceId}] ChatsList: setupEvents()`);
        
        // СНАЧАЛА удаляем старые
        this.removeEventListeners();
        
        // Создаем новые bound функции
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

                    // Отмечаем как прочитанный
                    window.mockDataService.markChatAsRead(chatId);

                    setTimeout(async () => {
                        await this.refresh()
                        this.setActiveChat(chatId)
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

    setActiveChat(chatId) {
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
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = {
                text: message.text,
                time: message.time,
                senderId: message.senderId,
                isRead: true
            };
            
            // Перерисовываем только этот элемент
            this.updateChatItemInDOM(chatId);
        }
    }

    updateChatItemInDOM(chatId) {
        const chatElement = this.container.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const chat = this.chats.find(c => c.id === chatId);
            if (chat) {
                // Обновляем содержимое элемента
                const newElement = this.renderer.createChatItem(chat);
                chatElement.replaceWith(newElement);
            }
        }
    }
    
	
    // sets up chat selection and navigation event handlers
    // setupEvents() {
	// 	console.log('ChatsList: setupEvents()');
	// 	this.removeEventListeners();

    //     this.boundHandlers.clickHandler = (event) => {
    //         console.log('ChatsList: click event triggered');
			
	// 		if (event.target.classList.contains('chats-profile-avatar')) {
	// 			event.stopPropagation(); // ВАЖНО!
	// 			this.eventBus.emit('profile-requested');
	// 			return;
	// 		}
			
	// 		// handles left-click
	// 		this.container.addEventListener('click', (event) => {
	// 			if (event.target.classList.contains('chats-profile-avatar')) {
	// 				this.eventBus.emit('profile-requested');
	// 				return;
	// 			}
	
	// 			if (event.target.classList.contains('search-input')) {
	// 				if (window.app.leftPanel.getCurrentComponentName() !== 'search') {
	// 					window.app.leftPanel.loadComponent('search');
	// 				}
	// 				return;
	// 			}
	
	// 			const chatItem = event.target.closest('.chat-item');
	// 			if (chatItem) {
	// 				const chatId = parseInt(chatItem.dataset.chatId);
	// 				const chat = this.chats.find(c => c.id === chatId);
					
	// 				if (chat) {
	// 					this.eventBus.emit('chat-selected', {
	// 						id: chat.id,
	// 						userId: chat.userId,
	// 						name: chat.name,
	// 						avatarUrl: chat.avatarUrl,
	// 						type: chat.type
	// 					});
	// 				}
	
	// 				setTimeout(() => this.refresh(), 100);
	// 			}
	// 		});
    //     };
		
 
	// 	};

    //     this.boundHandlers.documentClickHandler = (event) => {
	// 		// ПРОВЕРЯЕМ что клик НЕ по аватарке
	// 		if (!event.target.classList.contains('chats-profile-avatar')) {
	// 			console.log('ChatsList: document click for context menu');
	// 			this.hideContextMenu();
	// 		}
    //         console.log('ChatsList: document click for context menu');
    //         this.hideContextMenu();
    //     };

	// 	this.container.addEventListener('click', this.boundHandlers.clickHandler);
    //     this.container.addEventListener('contextmenu', this.boundHandlers.contextMenuHandler);
    //     document.addEventListener('click', this.boundHandlers.documentClickHandler);
    // }

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
                    await window.mockDataService.toggleChatPin(chatId);
                    break;
                case 'mute':
                    await window.mockDataService.toggleChatMute(chatId);
                    break;
                case 'delete':
                    if (confirm('Delete chat? This action cannot be undone.')) {
                        await window.mockDataService.deleteChat(chatId);
                    }
                    break;
            }
            
            await this.refresh();
            
        } catch (error) {
            console.error('Action processing error:', error);
        }
    }

    updateProfileAvatar() {
        const profileAvatar = this.container.querySelector('.chats-profile-avatar');
        if (profileAvatar) {
            const currentUser = window.mockDataService.getCurrentUser();
            profileAvatar.src = currentUser.avatarUrl;
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
        this.boundHandlers = {};
    }
}

class ChatsListDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }
    
    async getAll(offset = 0, limit = 50) {
        return await this.mockService.getChats(offset, limit);
    }
}

class ChatsListRenderer {
    render(chats, container) {
        const chatsList = container.querySelector('#chats-list ul');
        if (!chatsList) {
            console.error('#chats-list ul element not found');
            return;
        }

        chatsList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            chatsList.appendChild(chatItem);
        });
    }

    // В ChatsListRenderer.createChatItem()
    createChatItem(chat) {
        const li = document.createElement('li');
        li.className = 'chat-item';
        li.dataset.chatId = chat.id;
        
        // Добавляем классы состояния
        if (chat.isPinned) li.classList.add('pinned');
        if (chat.unreadCount > 0) li.classList.add('unread');
        
        const timeStr = this.formatTime(chat.lastMessage.time);
        const unreadBadge = chat.unreadCount > 0 ? 
            `<span class="unread-count${chat.isMuted ? ' muted' : ''}">${chat.unreadCount}</span>` : '';
        const pinnedIcon = chat.isPinned ? '<span class="pinned-icon">📌</span>' : '';
        const mutedIcon = chat.isMuted ? '<span class="muted-icon">🔇</span>' : '';
        
        // Определяем статус сообщения
        const messageStatus = this.getMessageStatus(chat.lastMessage);
        
        li.innerHTML = `
            <div class="chat-avatar">
                <img src="${chat.avatarUrl}" alt="${chat.name}">
                ${this.getOnlineIndicator(chat)}
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-time">${timeStr}</div>
                </div>
                <div class="chat-footer">
                    <div class="last-message">
                        ${messageStatus}${this.formatLastMessage(chat)}
                    </div>
                    <div class="chat-badges">
                        ${pinnedIcon}${mutedIcon}${unreadBadge}
                    </div>
                </div>
            </div>
        `;
        
        return li;
    }

    getOnlineIndicator(chat) {
        // Проверяем онлайн статус пользователя
        const user = window.mockDataService.users.find(u => u.id === chat.userId);
        return user && user.isOnline ? '<span class="online-indicator"></span>' : '';
    }

    getMessageStatus(message) {
        if (message.senderId === 1) { // Текущий пользователь
            return message.isRead ? 
                '<span class="message-status read">✓✓</span>' : 
                '<span class="message-status sent">✓</span>';
        }
        return '';
    }

    // Улучшенное форматирование времени
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) {
            return 'сейчас';
        } else if (minutes < 60) {
            return `${minutes}м`;
        } else if (hours < 24) {
            return `${hours}ч`;
        } else if (days === 1) {
            return 'вчера';
        } else if (days < 7) {
            return `${days}д`;
        } else {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    }

    // formats last message with sender context
    formatLastMessage(chat) {
        const msg = chat.lastMessage;
        let prefix = '';
        
        if (chat.type === 'group' && msg.senderName) {
            prefix = `${msg.senderName}: `;
        } else if (msg.senderId === 1) { // current user ID
            prefix = 'You: ';
        }
        
        return `${prefix}${msg.text}`;
    }
}