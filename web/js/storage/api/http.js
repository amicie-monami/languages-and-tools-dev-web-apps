// HTTP API реализация 
class HttpApiService extends ApiServiceInterface {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
        this.name = "http";
    }

    // ============ ЧАТЫ ============
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
    
// Исправленный метод markChatAsRead в HttpApiService
async markChatAsRead(chatId) {
    try {
        console.log('Marking chat as read:', chatId);
        
        if (!chatId || chatId === 'undefined' || chatId === 'null') {
            console.warn('Invalid chat ID for markChatAsRead:', chatId);
            return; // Не бросаем ошибку, просто не делаем запрос
        }
        
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/read`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            console.warn('Failed to mark chat as read:', response.status);
            // Не бросаем ошибку для этого метода - это не критично
            return;
        }
        
        const result = await response.json();
        console.log('Chat marked as read successfully:', result);
        
    } catch (error) {
        console.warn('Error marking chat as read (non-critical):', error);
        // Не перебрасываем ошибку - это не должно ломать инициализацию чата
    }
}

async createChat(chatData) {
    try {
        console.log('🔧 Creating chat with data:', chatData);
        
        const existingChats = await this.getChats();
        console.log('🔧 Existing chats:', existingChats);
        
        const response = await fetch(`${this.baseUrl}/chats`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participant_ids: [chatData.userId],
                name: chatData.name,
                is_group: false,
                avatar_url: chatData.avatarUrl
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Create chat error:', response.status, errorText);
            throw new Error(`Failed to create chat: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Chat created/returned from API:', result);
        
        const expectedUserId = chatData.userId;
        const resultParticipants = result.participants || [];
        const hasExpectedUser = resultParticipants.some(p => p.user_id === expectedUserId);
        
        if (!hasExpectedUser) {
            console.error('⚠️ WARNING: Created chat does not contain expected user!', {
                expected: expectedUserId,
                actual: resultParticipants
            });
        }
        
        // Преобразуем ответ сервера в формат, ожидаемый фронтендом
        return {
            id: result.id,
            userId: chatData.userId, // ВАЖНО: сохраняем оригинальный userId
            name: result.name,
            avatarUrl: result.avatar_url,
            type: result.is_group ? 'group' : 'private',
            lastMessage: null,
            unreadCount: 0,
            isPinned: false,
            isMuted: false
        };
        
    } catch (error) {
        console.error('💥 Error in createChat:', error);
        throw error;
    }
}

    // ============ СООБЩЕНИЯ ============
async getMessages(chatId, offset = 0, limit = 50) {
    try {
        console.log('Loading messages for chat:', chatId);
        
        if (!chatId || chatId === 'undefined') {
            console.error('Invalid chat ID:', chatId);
            return [];
        }
        
        const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages?offset=${offset}&limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            console.error('Get messages error:', response.status);
            if (response.status === 422 || response.status === 404) {
                return []; // Чат не найден или недоступен - возвращаем пустые сообщения
            }
            throw new Error(`Failed to load messages: ${response.status}`);
        }
        
        const messages = await response.json();
        console.log('Messages loaded:', messages);
        
        // Убеждаемся что возвращаем массив
        if (!Array.isArray(messages)) {
            console.warn('Messages is not an array:', messages);
            return [];
        }
        
        return messages;
        
    } catch (error) {
        console.error('Error loading messages:', error);
        return []; // В случае ошибки возвращаем пустой массив
    }
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

    // ============ ПОЛЬЗОВАТЕЛИ ============
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

    async getAllUsers() {
        const response = await fetch(`${this.baseUrl}/users`, {
            headers: this.getAuthHeaders()
        });
        return await response.json();
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

    // ============ КОНТАКТЫ ============
    async getContacts() {
        try {
            const response = await fetch(`${this.baseUrl}/contacts`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error getting contacts:', response.status, error);
                throw new Error(`Failed to get contacts: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error in getContacts:', error);
            throw error;
        }
    }

    async isContact(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/contacts/${userId}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Пользователь не найден - это ошибка
                    throw new Error('User not found');
                }
                // Другие ошибки сервера
                throw new Error(`Server error: ${response.status}`);
            }
            
            // Читаем и анализируем тело ответа
            const data = await response.json();
            console.log(`isContact data:`, data);
            return data.is_contact === true;

        } catch (error) {
            console.error('Error checking contact status:', error);
            return false; // По умолчанию считаем что не контакт
        }
    }

    async addContact(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/contacts`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error adding contact:', response.status, error);
                throw new Error(`Failed to add contact: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error in addContact:', error);
            throw error;
        }
    }
    
    async removeContact(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/contacts/${userId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 404) {
                // Контакт уже не найден - это нормально для удаления
                console.log(`Contact ${userId} was not found (already removed?)`);
                return true;
            } else if (!response.ok) {
                const error = await response.text();
                console.error('Error removing contact:', response.status, error);
                throw new Error(`Failed to remove contact: ${response.status}`);
            }
            
            // Проверяем есть ли тело ответа
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return true;
        } catch (error) {
            console.error('Error in removeContact:', error);
            throw error;
        }
    }

    // ============ УТИЛИТЫ ============
    getAuthHeaders() {
        try {
            const session = localStorage.getItem('messenger_session');
            if (session) {
                const sessionData = JSON.parse(session);
                return { 'Authorization': `Bearer ${sessionData.access_token}` };
            }
        } catch (error) {
            console.error('Error getting auth headers:', error);
        }
        return {};
    }
}