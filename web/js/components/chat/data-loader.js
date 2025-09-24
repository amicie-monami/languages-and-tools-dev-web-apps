// Обновленный ChatDataLoader с API
class ChatDataLoader {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async getMessages(chatId, offset = 0, limit = 50) {
        try {
            return this.apiService.getMessages(chatId, offset, limit);
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    }

    // Дополнительные методы для работы с сообщениями
    async getMessagesBefore(chatId, messageId, limit = 20) {
        try {
            return await this.apiService.getMessagesBefore(chatId, messageId, limit);
        } catch (error) {
            console.error('Error loading messages before:', error);
            return [];
        }
    }

    async searchMessages(chatId, query, limit = 50) {
        try {
            return await this.apiService.searchMessages(chatId, query, limit);
        } catch (error) {
            console.error('Error searching messages:', error);
            return [];
        }
    }
}

// Обновленный MessageSender с API
class MessageSender {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async send(chatId, text) {
        try {
            const message = await this.apiService.sendMessage(chatId, text);
            
            // Имитируем автоответ (в реальном приложении это будет приходить через WebSocket)
            this.simulateAutoReply(chatId);
            
            return message;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async sendFile(chatId, file) {
        try {
            return await this.apiService.sendFile(chatId, file);
        } catch (error) {
            console.error('Error sending file:', error);
            throw error;
        }
    }

    async editMessage(messageId, newText) {
        try {
            return await this.apiService.editMessage(messageId, newText);
        } catch (error) {
            console.error('Error editing message:', error);
            throw error;
        }
    }

    async deleteMessage(messageId) {
        try {
            return await this.apiService.deleteMessage(messageId);
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    // Имитация автоответа (временно, пока нет реального WebSocket)
    simulateAutoReply(chatId) {
        // Используем тот же механизм что и в MockDataService
        if (window.mockDataService && typeof window.mockDataService.simulateIncomingMessage === 'function') {
            window.mockDataService.simulateIncomingMessage(chatId);
        }
    }
}

// Обновленный ChatRenderer
class ChatRenderer {
    constructor(currentUserId = null) {
        this.currentUserId = currentUserId;
    }

    // Метод для установки ID текущего пользователя
    setCurrentUserId(userId) {
        this.currentUserId = userId;
    }

    renderMessages(messages, container) {
        const messagesList = container.querySelector('#messages-list');
        if (!messagesList) {
            console.error('Элемент #messages-list не найден');
            return;
        }

        messagesList.innerHTML = '';

        // Группируем сообщения по дням
        const groupedMessages = this.groupMessagesByDate(messages);
        
        groupedMessages.forEach(group => {
            // Добавляем разделитель дня
            if (group.date) {
                const dateElement = this.createDateSeparator(group.date);
                messagesList.appendChild(dateElement);
            }
            
            // Добавляем сообщения
            group.messages.forEach(message => {
                const messageElement = this.createMessageElement(message);
                messagesList.appendChild(messageElement);
            });
        });
    }

    groupMessagesByDate(messages) {
        const groups = [];
        let currentGroup = null;
        
        messages.forEach(message => {
            const messageDate = new Date(message.time).toDateString();
            
            if (!currentGroup || currentGroup.date !== messageDate) {
                currentGroup = {
                    date: messageDate,
                    messages: []
                };
                groups.push(currentGroup);
            }
            
            currentGroup.messages.push(message);
        });
        
        return groups;
    }

    createDateSeparator(dateString) {
        const div = document.createElement('div');
        div.className = 'date-separator';
        
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let displayText;
        if (date.toDateString() === today.toDateString()) {
            displayText = 'Сегодня';
        } else if (date.toDateString() === yesterday.toDateString()) {
            displayText = 'Вчера';
        } else {
            displayText = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
        
        div.innerHTML = `<span>${displayText}</span>`;
        div.style.cssText = `
            text-align: center;
            margin: 16px 0;
            color: #888;
            font-size: 14px;
            position: relative;
        `;
        
        return div;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        
        // ИСПРАВЛЕНО: Правильное определение исходящих сообщений
        const isOutgoing = this.currentUserId ? 
            message.senderId === this.currentUserId : 
            false; 
        
        console.log(`Message from ${message.senderId}, current user: ${this.currentUserId}, isOutgoing: ${isOutgoing}`);
        
        div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        div.dataset.messageId = message.id;
        
        const timeStr = this.formatTime(message.time);
        const statusIcon = isOutgoing ? this.getMessageStatusIcon(message) : '';
        
        div.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.formatMessageText(message.text)}</div>
                <div class="message-meta">
                    <span class="message-time">${timeStr}</span>
                    ${statusIcon}
                    ${message.isEdited ? '<span class="edited-indicator">изменено</span>' : ''}
                </div>
            </div>
        `;
        
        // Добавляем контекстное меню для своих сообщений
        if (isOutgoing) {
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showMessageContextMenu(e, message);
            });
        }
        
        return div;
    }

    // Исправленный метод formatMessageText в ChatRenderer (data-loader.js)
    formatMessageText(text) {
        // Проверяем что text не undefined/null и является строкой
        if (!text || typeof text !== 'string') {
            console.warn('formatMessageText received invalid text:', text);
            return '';
        }
        
        // Простая обработка ссылок и переносов строк
        return text
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }

    getMessageStatusIcon(message) {
        if (message.isRead) {
            return '<span class="message-status read">✓✓</span>';
        } else {
            return '<span class="message-status sent">✓</span>';
        }
    }

    showMessageContextMenu(event, message) {
        // Простое контекстное меню для сообщений
        const menu = document.createElement('div');
        menu.className = 'message-context-menu';
        menu.style.cssText = `
            position: fixed;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 4px 0;
            z-index: 1000;
            min-width: 150px;
        `;
        
        menu.innerHTML = `
            <div class="context-item" data-action="edit">Редактировать</div>
            <div class="context-item" data-action="delete">Удалить</div>
            <div class="context-item" data-action="copy">Копировать</div>
        `;
        
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        document.body.appendChild(menu);
        
        // Убираем меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}