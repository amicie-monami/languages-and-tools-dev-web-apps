// message-service.js
class MessageService {
    constructor(apiService, eventBus) {
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.activeChatId = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Отслеживаем какой чат активен
        this.eventBus.on('chat-selected', (chatData) => {
            this.activeChatId = chatData.id;
            console.log(`MessageService: Active chat changed to ${this.activeChatId}`);
        });

        // Слушаем входящие сообщения
        document.addEventListener('newMessage', (event) => {
            this.handleIncomingMessage(event.detail);
        });
    }

    handleIncomingMessage(messageData) {
        const { chatId, message } = messageData;
        
        console.log(`MessageService: Incoming message for chat ${chatId}, active chat: ${this.activeChatId}`);
        
        // Если сообщение пришло в активный чат - помечаем как прочитанное
        if (chatId === this.activeChatId) {
            this.markMessageAsRead(message.id, chatId);
        }
        
        // Уведомляем компоненты об обновлении
        this.eventBus.emit('message-received', {
            chatId,
            message,
            isActiveChat: chatId === this.activeChatId
        });
    }

    async markMessageAsRead(messageId, chatId) {
        try {
            await this.apiService.markMessageAsRead(messageId);
            await this.apiService.markChatAsRead(chatId);
            console.log(`MessageService: Marked message ${messageId} as read`);
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    setActiveChat(chatId) {
        this.activeChatId = chatId;
    }

    clearActiveChat() {
        this.activeChatId = null;
    }
}