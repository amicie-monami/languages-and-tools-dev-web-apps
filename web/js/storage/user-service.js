// user-service.js - Сервис для управления пользователями
class UserService {
    constructor(apiService, eventBus) {
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.users = new Map(); // userId -> user object
        this.statusCache = new Map(); // userId -> online status
        this.subscribers = new Set(); // компоненты, подписанные на обновления
    }

    // Загружает пользователей по ID
    async loadUsers(userIds) {
        const missingIds = userIds.filter(id => !this.users.has(id));
        
        if (missingIds.length > 0) {
            try {
                // Загружаем недостающих пользователей
                const users = await this.apiService.getUsersByIds(missingIds);
                users.forEach(user => {
                    this.users.set(user.id, user);
                    this.statusCache.set(user.id, user.isOnline);
                });
            } catch (error) {
                console.error('Error loading users:', error);
            }
        }
    }

    // Получает пользователя из кеша
    getUser(userId) {
        return this.users.get(userId);
    }

    // Получает онлайн статус пользователя
    getUserStatus(userId) {
        return this.statusCache.get(userId) || false;
    }

    // Обновляет статус пользователя (для WebSocket обновлений)
    updateUserStatus(userId, isOnline) {
        this.statusCache.set(userId, isOnline);
        
        // Обновляем в объекте пользователя тоже
        const user = this.users.get(userId);
        if (user) {
            user.isOnline = isOnline;
            user.lastSeen = isOnline ? new Date() : user.lastSeen;
        }
        
        // Уведомляем подписчиков
        this.notifySubscribers('user-status-changed', { userId, isOnline });
    }

    // Подписка компонента на обновления
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback); // функция отписки
    }

    // Уведомление подписчиков
    notifySubscribers(event, data) {
        this.subscribers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in user service subscriber:', error);
            }
        });
    }

    // Очистка кеша (для тестов или смены пользователя)
    clearCache() {
        this.users.clear();
        this.statusCache.clear();
    }

    // Предзагрузка всех пользователей (для небольших систем)
    async preloadAllUsers() {
        try {
            const users = await this.apiService.getAllUsers();
            users.forEach(user => {
                this.users.set(user.id, user);
                this.statusCache.set(user.id, user.isOnline);
            });
        } catch (error) {
            console.error('Error preloading users:', error);
        }
    }
}