// Базовый интерфейс для всех API провайдеров
class ApiServiceInterface {
    // Чаты
    async getChats(offset = 0, limit = 50) {
        throw new Error('Method must be implemented');
    }
    
    async deleteChat(chatId) {
        throw new Error('Method must be implemented');
    }
    
    async toggleChatPin(chatId) {
        throw new Error('Method must be implemented');
    }
    
    async toggleChatMute(chatId) {
        throw new Error('Method must be implemented');
    }
    
    async markChatAsRead(chatId) {
        throw new Error('Method must be implemented');
    }
    
    // Сообщения
    async getMessages(chatId, offset = 0, limit = 50) {
        throw new Error('Method must be implemented');
    }

    async markMessageAsRead(messageId) {
        throw new Error('Method must be implemented');
    }
    
    async sendMessage(chatId, text) {
        throw new Error('Method must be implemented');
    }

    // Создание чата
    async createChat(chatData) {
        throw new Error('Method must be implemented');
    }
    
    // Дополнительные методы для сообщений
    async getMessagesBefore(chatId, messageId, limit = 20) {
        throw new Error('Method must be implemented');
    }
    
    async searchMessages(chatId, query, limit = 50) {
        throw new Error('Method must be implemented');
    }
    
    async sendFile(chatId, file) {
        throw new Error('Method must be implemented');
    }
    
    async editMessage(messageId, newText) {
        throw new Error('Method must be implemented');
    }
    
    async deleteMessage(messageId) {
        throw new Error('Method must be implemented');
    }
    
    // Получение пользователей по массиву ID
    async getUsersByIds(userIds) {
        throw new Error('Method must be implemented');
    }
    
    // Пользователи
    async getCurrentUser() {
        throw new Error('Method must be implemented');
    }
    
    async getUser(userId) {
        throw new Error('Method must be implemented');
    }
    
    async searchUsers(query) {
        throw new Error('Method must be implemented');
    }

    // Получение статусов пользователей
    async getUsersStatus(userIds) {
        throw new Error('Method must be implemented');
    }
    
    // Получение всех пользователей для кеширования
    async getAllUsers() {
        throw new Error('Method must be implemented');
    }

    // Контакты
    async getContacts() {
        throw new Error('Method must be implemented');
    }
    
    async addContact(userId) {
        throw new Error('Method must be implemented');
    }
    
    async removeContact(userId) {
        throw new Error('Method must be implemented');
    }
    
    async isContact(userId) {
        throw new Error('Method must be implemented');
    }

    // Глобальный поиск (для будущего расширения)
    async globalSearch(query) {
        throw new Error('Method must be implemented');
    }
    
    // Поиск с фильтрами
    async searchUsersAdvanced(query, filters = {}) {
        throw new Error('Method must be implemented');
    }

    // Обновление профиля
    async updateCurrentUser(userData) {
        throw new Error('Method must be implemented');
    }
    
    // Загрузка аватара
    async uploadAvatar(file) {
        throw new Error('Method must be implemented');
    }
    
    // Проверка доступности username
    async checkUsernameAvailability(username) {
        throw new Error('Method must be implemented');
    }
}

