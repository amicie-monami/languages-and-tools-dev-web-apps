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
        this.currentUserId = null; 
    }

    async init(container, chatData) {
        this.container = container;
        this.chatData = chatData;
        
        this.removeEventListeners();

        if (!chatData) {
            console.error('Данные чата не переданы');
            return;
        }

        // Получаем ID текущего пользователя
        try {
            const currentUser = await this.apiService.getCurrentUser();
            this.currentUserId = currentUser.id;
            
            // Устанавливаем ID в renderer
            this.renderer.setCurrentUserId(this.currentUserId);
            
            console.log('Current user ID set to:', this.currentUserId);
        } catch (error) {
            console.error('Failed to get current user:', error);
        }

        this.setChatAvatar();

        // Загружаем пользователя чата через UserService
        if (chatData.userId) {
            await this.userService.loadUsers([chatData.userId]);
        }

        await this.loadMessages();

        try {
            if (chatData.id && chatData.id !== 'undefined') {
                await this.apiService.markChatAsRead(chatData.id);
            }
        } catch (error) {
            console.warn('Failed to mark chat as read:', error);
        }

        this.render();
        this.setupEvents();
        this.subscribeToUserUpdates();
    }

    addNewMessage(messageData) {
        // Проверяем дубликаты
        if (this.messages.find(msg => msg.id === messageData.id)) {
            return;
        }
        
        this.messages.push(messageData);
        this.messages.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        // Рендерим только новое сообщение, а не весь чат
        this.renderNewMessage(messageData);
        this.scrollToBottom();
    }

    renderNewMessage(messageData) {
        const messagesContainer = this.container.querySelector('.messages-list');
        const messageElement = this.createMessageElement(messageData);
        messagesContainer.appendChild(messageElement);
    }

    createMessageElement(messageData) {
        const div = document.createElement('div');
        div.className = `message ${messageData.senderId === this.currentUserId ? 'outgoing' : 'incoming'}`;
        div.innerHTML = `
            <div class="message-content">
                <div class="message-text">${messageData.text}</div>
                <div class="message-time">${this.formatTime(messageData.time)}</div>
            </div>
        `;
        return div;
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.container.querySelector('.messages-list');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 10);
    }

    // Добавьте метод для звука уведомления (опционально):
    playNotificationSound() {
        try {
            // Создаем простой звук уведомления
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Игнорируем ошибки звука
        }
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
        
        // Обновляем аватар
        if (avatar && this.chatData) {
            avatar.src = this.chatData.avatarUrl || 'assets/placeholder.png';
        }
        
        // Обновляем имя - берем из chatData
        if (name) {
            name.textContent = this.chatData.name || 'Неизвестный пользователь';
        }
        
        // Обновляем статус через UserService если userId есть
        if (status && this.chatData.userId) {
            try {
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
            } catch (error) {
                // Если UserService не может получить данные, показываем базовый статус
                status.textContent = 'Офлайн';
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
        this.removeEventListeners();
    
        // Обработчики для аватара и имени пользователя
        const userAvatar = this.container.querySelector('.chat-user-avatar');
        const userName = this.container.querySelector('.chat-user-name');
        
        [userAvatar, userName].forEach(element => {
            if (element) {
                element.style.cursor = 'pointer';
                element.addEventListener('click', () => {
                    this.eventBus.emit('user-profile-requested', {
                        userId: this.chatData.userId
                    });
                });
            }
        });
    
        // Обработчики для отправки сообщений
        const sendButton = this.container.querySelector('#send-button');
        const messageInput = this.container.querySelector('#message-input');
        
        // Единый обработчик отправки
        this.sendMessageHandler = () => {
            this.sendMessage();
        };
    
        this.keyPressHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };
        
        this.inputHandler = (e) => {
            const text = e.target.value.trim();
            if (sendButton) {
                sendButton.disabled = text.length === 0;
            }
        };
        
        if (sendButton) {
            sendButton.addEventListener('click', this.sendMessageHandler);
        }
        
        if (messageInput) {
            messageInput.addEventListener('keydown', this.keyPressHandler);
            messageInput.addEventListener('input', this.inputHandler);
            
            // // Проверяем начальное состояние
            // const initialText = messageInput.value.trim();
            // if (sendButton) {
            //     sendButton.disabled = initialText.length === 0;
            // }
        }
        
        this.isInitialized = true;
    }

    async sendMessage() {
        console.log(`sendMessage: isSending = ${this.isSending}`, 'background: #222; color: #bada55');

        if (this.isSending) {
            console.log('Message sending already in progress, skipping');
            return;
        }

        this.isSending = true;

        const messageInput = this.container.querySelector('#message-input');
        const sendButton = this.container.querySelector('#send-button');
        const text = messageInput.value.trim();
    
        if (!text ) {
            this.isSending = false;
            return;
        } 

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
            this.isSending = false;
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
        const sendButton = this.container?.querySelector('#send-button');
        const messageInput = this.container?.querySelector('#message-input');
        
        if (sendButton && this.sendMessageHandler) {
            sendButton.removeEventListener('click', this.sendMessageHandler);
        }
        
        if (messageInput) {
            if (this.keyPressHandler) {
                messageInput.removeEventListener('keydown', this.keyPressHandler);
            }
            if (this.inputHandler) {
                messageInput.removeEventListener('input', this.inputHandler);
            }
        }
        
        // Убираем обработчики с аватарки и имени
        const userAvatar = this.container?.querySelector('.chat-user-avatar');
        const userName = this.container?.querySelector('.chat-user-name');
        
        [userAvatar, userName].forEach(element => {
            if (element) {
                element.style.cursor = '';
                // Более надежный способ удаления обработчиков
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
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