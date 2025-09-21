class Chat {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ChatDataLoader();
        this.renderer = new ChatRenderer();
        this.messageSender = new MessageSender();
        this.chatData = null;
        this.messages = [];
        this.isInitialized = false;
    }

    async init(container, chatData) {
        this.container = container;
        this.chatData = chatData;
        
        this.removeEventListeners();

        if (!chatData) {
            console.error('Данные чата не переданы');
            return;
        }

        window.mockDataService.markChatAsRead(chatData.id);

        await this.loadMessages();
        this.render();
        this.setupEvents();
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
        // Обновляем заголовок чата
        this.updateChatHeader();
        
        // Рендерим сообщения
        this.renderer.renderMessages(this.messages, this.container);
        
        // Прокручиваем в конец
        this.scrollToBottom();
    }

    updateChatHeader() {
        const avatar = this.container.querySelector('.chat-user-avatar');
        const name = this.container.querySelector('.chat-user-name');
        const status = this.container.querySelector('.chat-user-status');
        
        if (avatar) avatar.src = this.chatData.avatarUrl;
        if (name) name.textContent = this.chatData.name;
        if (status) status.textContent = 'В сети'; // можно брать из данных
    }

    setupEvents() {
        if (this.isInitialized) {
            this.removeEventListeners();
        }

        const userAvatar = this.container.querySelector('.chat-user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', () => {
                console.log('Клик по аватарке пользователя, chatData:', this.chatData); // Отладка
                this.eventBus.emit('user-profile-requested', {
                    userId: this.chatData.userId
                });
            });
        }

        const sendButton = this.container.querySelector('#send-button');
        const messageInput = this.container.querySelector('#message-input');
        
        // Создаем bound методы для возможности их удаления
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
        
        // Сохраняем ссылку на обработчик для удаления
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
        const text = messageInput.value.trim();
        
        if (!text) return;

        try {
            // Если это временный чат - создаем постоянный
            if (this.chatData.isTemporary) {
                await this.createPermanentChat(text);
            }
            
            const newMessage = await this.messageSender.send(this.chatData.id, text);
            this.messages.push(newMessage);
            this.render();
            messageInput.value = '';
            
            this.eventBus.emit('message-sent', {
                chatId: this.chatData.id,
                message: newMessage
            });
            
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
        }
    }

    async createPermanentChat(firstMessage) {
        // Создаем постоянный чат в MockDataService
        const permanentChat = {
            id: Date.now(),
            userId: this.chatData.userId,
            type: 'private',
            name: this.chatData.name,
            avatarUrl: this.chatData.avatarUrl,
            lastMessage: {
                text: firstMessage,
                time: new Date(),
                senderId: 1,
                isRead: true
            },
            unreadCount: 0,
            isPinned: false,
            isMuted: false
        };
        
        // Добавляем в список чатов
        window.mockDataService.chats.unshift(permanentChat);
        
        // Обновляем данные текущего чата
        this.chatData = permanentChat;
    }

    scrollToBottom() {
        const messagesContainer = this.container.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    removeEventListeners() {
        // Удаляем обработчики если они были установлены ранее
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
    }
    
    destroy() {
        this.removeEventListeners();
    }
}

class ChatDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }

    async getMessages(chatId, offset = 0, limit = 50) {
        return await this.mockService.getMessages(chatId, offset, limit);
    }
}

class ChatRenderer {
    renderMessages(messages, container) {
        const messagesList = container.querySelector('#messages-list');
        if (!messagesList) {
            console.error('Элемент #messages-list не найден');
            return;
        }

        messagesList.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesList.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isOutgoing = message.senderId === 1; // текущий пользователь
        
        div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        div.dataset.messageId = message.id;
        
        const timeStr = this.formatTime(message.time);
        
        div.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;
        
        return div;
    }

    formatTime(date) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

class MessageSender {
    constructor() {
        this.mockService = window.mockDataService;
    }

    async send(chatId, text) {
        return await this.mockService.sendMessage(chatId, text);
    }
}