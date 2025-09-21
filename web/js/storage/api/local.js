// Локальное хранилище (обертка над MockDataService)
class LocalApiService extends ApiServiceInterface {
    constructor() {
        super();
        this.mockService = window.mockDataService;
    }
    
    async getChats(offset = 0, limit = 50) {
        return await this.mockService.getChats(offset, limit);
    }
    
    async deleteChat(chatId) {
        return await this.mockService.deleteChat(chatId);
    }
    
    async toggleChatPin(chatId) {
        return await this.mockService.toggleChatPin(chatId);
    }
    
    async toggleChatMute(chatId) {
        return await this.mockService.toggleChatMute(chatId);
    }
    
    async markChatAsRead(chatId) {
        return this.mockService.markChatAsRead(chatId);
    }

    async markMessageAsRead(messageId) {
        // Находим сообщение и помечаем как прочитанное
        for (const [chatId, messages] of this.mockService.messages) {
            const message = messages.find(m => m.id === messageId);
            if (message) {
                message.isRead = true;
                
                // Обновляем lastMessage в чате если это последнее сообщение
                const chat = this.mockService.chats.find(c => c.id === chatId);
                if (chat && chat.lastMessage && messages[messages.length - 1].id === messageId) {
                    chat.lastMessage.isRead = true;
                    chat.unreadCount = Math.max(0, chat.unreadCount - 1);
                }
                
                return true;
            }
        }
        return false;
    }
    
    async getMessages(chatId, offset = 0, limit = 50) {
        return await this.mockService.getMessages(chatId, offset, limit);
    }
    
    async sendMessage(chatId, text) {
        return await this.mockService.sendMessage(chatId, text);
    }
    
    async getCurrentUser() {
        return this.mockService.getCurrentUser();
    }
    
    async getUser(userId) {
        return await this.mockService.getUser(userId);
    }

    async getUsersStatus(userIds) {
        const statusMap = {};
        userIds.forEach(userId => {
            const user = this.mockService.users.find(u => u.id === userId);
            statusMap[userId] = user ? user.isOnline : false;
        });
        return statusMap;
    }
    
    async getAllUsers() {
        return this.mockService.users;
    }
    
    async searchUsers(query) {
        return await this.mockService.searchUsers(query);
    }
    
    async getContacts() {
        return await this.mockService.getContacts();
    }
    
    async addContact(userId) {
        return await this.mockService.addContact(userId);
    }
    
    async removeContact(userId) {
        return await this.mockService.removeContact(userId);
    }
    
    async isContact(userId) {
        return await this.mockService.isContact(userId);
    }

    async createChat(chatData) {
        const newChat = {
            id: Date.now(),
            userId: chatData.userId,
            type: chatData.type || 'private',
            name: chatData.name,
            avatarUrl: chatData.avatarUrl,
            lastMessage: null,
            unreadCount: 0,
            isPinned: false,
            isMuted: false
        };
        
        // Добавляем в список чатов
        this.mockService.chats.unshift(newChat);
        
        return newChat;
    }
    
    async getMessagesBefore(chatId, messageId, limit = 20) {
        const messages = this.mockService.messages.get(chatId) || [];
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return [];
        
        const start = Math.max(0, messageIndex - limit);
        return messages.slice(start, messageIndex);
    }
    
    async searchMessages(chatId, query, limit = 50) {
        const messages = this.mockService.messages.get(chatId) || [];
        return messages
            .filter(message => message.text.toLowerCase().includes(query.toLowerCase()))
            .slice(0, limit);
    }
    
    async sendFile(chatId, file) {
        // Имитация загрузки файла
        await this.mockService.delay(1000);
        
        const message = {
            id: Date.now(),
            chatId: chatId,
            senderId: 1,
            senderName: "Вы",
            text: `Файл: ${file.name}`,
            time: new Date(),
            type: 'file',
            fileData: {
                name: file.name,
                size: file.size,
                type: file.type
            },
            isRead: false,
            isEdited: false
        };
        
        if (!this.mockService.messages.has(chatId)) {
            this.mockService.messages.set(chatId, []);
        }
        this.mockService.messages.get(chatId).push(message);
        
        return message;
    }
    
    async editMessage(messageId, newText) {
        for (const [chatId, messages] of this.mockService.messages) {
            const message = messages.find(m => m.id === messageId);
            if (message && message.senderId === 1) { // Можем редактировать только свои
                message.text = newText;
                message.isEdited = true;
                message.editedAt = new Date();
                return message;
            }
        }
        throw new Error('Message not found or cannot be edited');
    }
    
    async deleteMessage(messageId) {
        for (const [chatId, messages] of this.mockService.messages) {
            const messageIndex = messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1 && messages[messageIndex].senderId === 1) {
                messages.splice(messageIndex, 1);
                return true;
            }
        }
        throw new Error('Message not found or cannot be deleted');
    }
    
    async getUsersByIds(userIds) {
        return this.mockService.users.filter(user => userIds.includes(user.id));
    }

    async searchUsers(query) {
        await this.mockService.delay(400); // Имитируем задержку сети
        
        const results = this.mockService.users.filter(user => {
            const searchText = query.toLowerCase();
            return user.name.toLowerCase().includes(searchText) ||
                   user.username.toLowerCase().includes(searchText) ||
                   (user.bio && user.bio.toLowerCase().includes(searchText));
        });
        
        // Сортируем результаты по релевантности
        return this.sortSearchResults(results, query);
    }
    
    sortSearchResults(results, query) {
        const queryLower = query.toLowerCase();
        
        return results.sort((a, b) => {
            // Приоритет: точное совпадение username > точное совпадение имени > частичное совпадение
            const aUsernameExact = a.username.toLowerCase() === queryLower;
            const bUsernameExact = b.username.toLowerCase() === queryLower;
            
            if (aUsernameExact && !bUsernameExact) return -1;
            if (!aUsernameExact && bUsernameExact) return 1;
            
            const aNameExact = a.name.toLowerCase() === queryLower;
            const bNameExact = b.name.toLowerCase() === queryLower;
            
            if (aNameExact && !bNameExact) return -1;
            if (!aNameExact && bNameExact) return 1;
            
            // Сортируем по онлайн статусу (онлайн пользователи выше)
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            
            // По алфавиту
            return a.name.localeCompare(b.name);
        });
    }
    
    async globalSearch(query) {
        await this.mockService.delay(600);
        
        const users = await this.searchUsers(query);
        
        // В будущем здесь будет поиск по сообщениям, чатам и т.д.
        return {
            users: users,
            chats: [], // Поиск по названиям чатов
            messages: [] // Поиск по сообщениям
        };
    }
    
    async searchUsersAdvanced(query, filters = {}) {
        let results = await this.searchUsers(query);
        
        // Применяем фильтры
        if (filters.onlineOnly) {
            results = results.filter(user => user.isOnline);
        }
        
        if (filters.contactsOnly) {
            const contacts = await this.getContacts();
            const contactIds = new Set(contacts.map(c => c.id));
            results = results.filter(user => contactIds.has(user.id));
        }
        
        if (filters.excludeContacts) {
            const contacts = await this.getContacts();
            const contactIds = new Set(contacts.map(c => c.id));
            results = results.filter(user => !contactIds.has(user.id));
        }
        
        return results;
    }

    async updateCurrentUser(userData) {
        await this.mockService.delay(800); // Имитируем задержку сохранения
        
        // Проверяем доступность username если он изменился
        const currentUser = this.mockService.getCurrentUser();
        if (userData.username !== currentUser.username) {
            const isAvailable = await this.checkUsernameAvailability(userData.username);
            if (!isAvailable) {
                throw new Error('Username already taken');
            }
        }
        
        // Обновляем данные пользователя
        Object.assign(currentUser, {
            name: userData.name,
            username: userData.username,
            bio: userData.bio,
            ...(userData.avatarUrl && { avatarUrl: userData.avatarUrl })
        });
        
        // Обновляем пользователя в списке users
        const userIndex = this.mockService.users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            this.mockService.users[userIndex] = { ...currentUser };
        }
        
        console.log('User updated:', currentUser);
        return currentUser;
    }
    
    async uploadAvatar(file) {
        await this.mockService.delay(1200); // Имитируем загрузку файла
        
        // В реальном приложении здесь был бы запрос к серверу
        // Для демо создаем blob URL
        const avatarUrl = URL.createObjectURL(file);
        
        console.log(`Avatar uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        return avatarUrl;
    }
    
    async checkUsernameAvailability(username) {
        await this.mockService.delay(300);
        
        // Проверяем что username не занят другим пользователем
        const existingUser = this.mockService.users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.id !== this.mockService.currentUser.id
        );
        
        return !existingUser;
    }
}