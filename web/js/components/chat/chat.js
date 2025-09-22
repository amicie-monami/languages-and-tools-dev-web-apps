// Обновленный Chat компонент с dependency injection
class Chat {
    constructor(eventBus, apiService, userService) {
        this.eventBus = eventBus;
        this.apiService = apiService;
        this.userService = userService;
        this.container = null;
        this.dataLoader = new ChatDataLoader(apiService);
        this.renderer = new ChatRenderer();
        this.messageSender = new MessageSender(apiService);
        this.chatData = null;
        this.messages = [];
        this.isInitialized = false;
        this.unsubscribeFromUserUpdates = null;
    }

    async init(container, chatData) {
        this.container = container;
        this.chatData = chatData;
        
        this.removeEventListeners();

        if (!chatData) {
            console.error('Данные чата не переданы');
            return;
        }

        this.setChatAvatar();

        // Отмечаем чат как прочитанный через API
        await this.apiService.markChatAsRead(chatData.id);

        // Загружаем пользователя чата через UserService
        await this.userService.loadUsers([chatData.userId]);

        await this.loadMessages();
        this.render();
        this.setupEvents();
        this.subscribeToUserUpdates();
    }

    setChatAvatar() {
        const avatar = this.container.querySelector('.chat-user-avatar');
        if (avatar && this.chatData) {
            avatar.src = this.chatData.avatarUrl || 'assets/placeholder.png';
        }
    }

    async loadMessages() {
        try {
            this.messages = await this.dataLoader.getMessages(this.chatData.id);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            this.messages = [];
        }
    }

    render() {
        this.updateChatHeader();
        this.renderer.renderMessages(this.messages, this.container);
        this.scrollToBottom();
    }

    updateChatHeader() {
        const avatar = this.container.querySelector('.chat-user-avatar');
        const name = this.container.querySelector('.chat-user-name');
        const status = this.container.querySelector('.chat-user-status');
        
        // обновляем автар если данные изменились
        if (avatar && this.chatData) {
            avatar.src = this.chatData.avatarUrl || 'assets/placeholder.png';
        }
        if (name) name.textContent = this.chatData.name;
        
        // Обновляем статус через UserService
        if (status) {
            const user = this.userService.getUser(this.chatData.userId);
            const isOnline = this.userService.getUserStatus(this.chatData.userId);
            
            if (isOnline) {
                status.textContent = 'В сети';
                status.className = 'chat-user-status online';
            } else if (user && user.lastSeen) {
                status.textContent = this.formatLastSeen(user.lastSeen);
                status.className = 'chat-user-status offline';
            } else {
                status.textContent = 'Был в сети давно';
                status.className = 'chat-user-status offline';
            }
        }
    }

    // Подписываемся на обновления статуса пользователя
    subscribeToUserUpdates() {
        this.unsubscribeFromUserUpdates = this.userService.subscribe((event, data) => {
            if (event === 'user-status-changed' && data.userId === this.chatData.userId) {
                // Обновляем только статус в шапке
                this.updateChatHeader();
            }
        });
    }

    formatLastSeen(lastSeen) {
        const now = new Date();
        const diff = now - new Date(lastSeen);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) {
            return 'Только что был в сети';
        } else if (minutes < 60) {
            return `Был в сети ${minutes} мин назад`;
        } else if (hours < 24) {
            return `Был в сети ${hours} ч назад`;
        } else if (days === 1) {
            return 'Был в сети вчера';
        } else {
            return `Был в сети ${days} дн назад`;
        }
    }

    setupEvents() {
        if (this.isInitialized) {
            this.removeEventListeners();
        }

        const userAvatar = this.container.querySelector('.chat-user-avatar');
        const userName = this.container.querySelector('.chat-user-name');
        
        // Клик по аватарке или имени для открытия профиля
        [userAvatar, userName].forEach(element => {
            if (element) {
                element.style.cursor = 'pointer';
                element.addEventListener('click', () => {
                    console.log('Клик по пользователю в чате, chatData:', this.chatData);
                    this.eventBus.emit('user-profile-requested', {
                        userId: this.chatData.userId
                    });
                });
            }
        });

        const sendButton = this.container.querySelector('#send-button');
        const messageInput = this.container.querySelector('#message-input');
        
        this.sendMessageHandler = () => this.sendMessage();
        this.keyPressHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };
        this.inputHandler = () => {
            const text = messageInput.value.trim();
            sendButton.disabled = text.length === 0;
        };
        
        if (sendButton) {
            sendButton.addEventListener('click', this.sendMessageHandler);
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', this.keyPressHandler);
            messageInput.addEventListener('input', this.inputHandler);
        }
        
        // Слушаем новые сообщения
        this.newMessageHandler = (event) => {
            if (event.detail.chatId === this.chatData.id) {
                this.messages.push(event.detail.message);
                this.render();
            }
        };
        
        document.addEventListener('newMessage', this.newMessageHandler);
        this.isInitialized = true;
    }

    async sendMessage() {
        const messageInput = this.container.querySelector('#message-input');
        const sendButton = this.container.querySelector('#send-button');
        const text = messageInput.value.trim();
        
        if (!text) return;

        // Блокируем интерфейс во время отправки
        messageInput.disabled = true;
        sendButton.disabled = true;
        sendButton.textContent = '...';

        try {
            let targetChatId = this.chatData.id;
            
            // Если это временный чат - создаем постоянный
            if (this.chatData.isTemporary) {
                targetChatId = await this.createPermanentChat(text);
            }
            
            const newMessage = await this.messageSender.send(targetChatId, text);
            this.messages.push(newMessage);
            this.render();
            messageInput.value = '';
            
            // Эмитим событие для обновления списка чатов
            this.eventBus.emit('message-sent', {
                chatId: targetChatId,
                message: newMessage
            });
            
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            this.showErrorMessage('Не удалось отправить сообщение');
        } finally {
            // Разблокируем интерфейс
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = '➤';
            messageInput.focus();
        }
    }

    async createPermanentChat(firstMessage) {
        try {
            // Создаем чат через API
            const newChat = await this.apiService.createChat({
                userId: this.chatData.userId,
                type: 'private',
                name: this.chatData.name,
                avatarUrl: this.chatData.avatarUrl
            });
            
            // Обновляем данные текущего чата
            this.chatData = {
                ...newChat,
                isTemporary: false
            };
            
            // Эмитим событие о создании чата
            this.eventBus.emit('chat-created', { chat: newChat });
            
            return newChat.id;
            
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            throw error;
        }
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc3545;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
        `;
        
        this.container.style.position = 'relative';
        this.container.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    scrollToBottom() {
        const messagesContainer = this.container.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    removeEventListeners() {
        if (this.sendMessageHandler) {
            const sendButton = this.container?.querySelector('#send-button');
            if (sendButton) {
                sendButton.removeEventListener('click', this.sendMessageHandler);
            }
        }
        
        if (this.keyPressHandler) {
            const messageInput = this.container?.querySelector('#message-input');
            if (messageInput) {
                messageInput.removeEventListener('keypress', this.keyPressHandler);
                messageInput.removeEventListener('input', this.inputHandler);
            }
        }
        
        if (this.newMessageHandler) {
            document.removeEventListener('newMessage', this.newMessageHandler);
        }

        // Убираем обработчики с аватарки и имени
        const userAvatar = this.container?.querySelector('.chat-user-avatar');
        const userName = this.container?.querySelector('.chat-user-name');
        [userAvatar, userName].forEach(element => {
            if (element) {
                element.style.cursor = '';
                element.replaceWith(element.cloneNode(true)); // Простой способ убрать все обработчики
            }
        });
    }
    
    destroy() {
        this.removeEventListeners();
        
        // Отписываемся от обновлений пользователей
        if (this.unsubscribeFromUserUpdates) {
            this.unsubscribeFromUserUpdates();
        }
    }
}