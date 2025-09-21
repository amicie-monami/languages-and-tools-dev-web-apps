// HTTP API реализация (заглушка для будущего)
class HttpApiService extends ApiServiceInterface {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
    }
    
    async getChats(offset = 0, limit = 50) {
        const response = await fetch(`${this.baseUrl}/chats?offset=${offset}&limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async deleteChat(chatId) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async toggleChatPin(chatId) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/pin`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async toggleChatMute(chatId) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/mute`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async markChatAsRead(chatId) {
        await fetch(`${this.baseUrl}/chats/${chatId}/read`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
    }
    
    async getMessages(chatId, offset = 0, limit = 50) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages?offset=${offset}&limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async sendMessage(chatId, text) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        return await response.json();
    }
    
    async getCurrentUser() {
        const response = await fetch(`${this.baseUrl}/users/me`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async getUser(userId) {
        const response = await fetch(`${this.baseUrl}/users/${userId}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async searchUsers(query) {
        const response = await fetch(`${this.baseUrl}/users/search?q=${encodeURIComponent(query)}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }

    async getUsersStatus(userIds) {
        const response = await fetch(`${this.baseUrl}/users/status`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds })
        });
        return await response.json();
    }
    
    async getAllUsers() {
        const response = await fetch(`${this.baseUrl}/users`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async getContacts() {
        const response = await fetch(`${this.baseUrl}/contacts`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async addContact(userId) {
        const response = await fetch(`${this.baseUrl}/contacts`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        return await response.json();
    }
    
    async removeContact(userId) {
        const response = await fetch(`${this.baseUrl}/contacts/${userId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async isContact(userId) {
        const response = await fetch(`${this.baseUrl}/contacts/${userId}`, {
            headers: this.getAuthHeaders()
        });
        return response.ok;
    }
    
    getAuthHeaders() {
        // Здесь будет логика получения токена авторизации
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async createChat(chatData) {
        const response = await fetch(`${this.baseUrl}/chats`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chatData)
        });
        return await response.json();
    }
    
    async getMessagesBefore(chatId, messageId, limit = 20) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages/before/${messageId}?limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async searchMessages(chatId, query, limit = 50) {
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async sendFile(chatId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/files`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: formData
        });
        return await response.json();
    }
    
    async editMessage(messageId, newText) {
        const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
            method: 'PATCH',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: newText })
        });
        return await response.json();
    }
    
    async deleteMessage(messageId) {
        const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return response.ok;
    }
    
    async getUsersByIds(userIds) {
        const response = await fetch(`${this.baseUrl}/users/batch`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds })
        });
        return await response.json();
    }

    async searchUsers(query) {
        const response = await fetch(`${this.baseUrl}/users/search?q=${encodeURIComponent(query)}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async globalSearch(query) {
        const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }
    
    async searchUsersAdvanced(query, filters = {}) {
        const params = new URLSearchParams({
            q: query,
            ...filters
        });
        
        const response = await fetch(`${this.baseUrl}/users/search/advanced?${params}`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
    }

    async updateCurrentUser(userData) {
        const response = await fetch(`${this.baseUrl}/users/me`, {
            method: 'PATCH',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }
        
        return await response.json();
    }
    
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        
        const response = await fetch(`${this.baseUrl}/users/me/avatar`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }
        
        const result = await response.json();
        return result.avatarUrl;
    }
    
    async checkUsernameAvailability(username) {
        const response = await fetch(`${this.baseUrl}/users/username-check?username=${encodeURIComponent(username)}`, {
            headers: this.getAuthHeaders()
        });
        
        const result = await response.json();
        return result.available;
    }
}