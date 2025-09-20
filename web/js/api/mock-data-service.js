// mock-data-service.js
class MockDataService {
    constructor() {
        this.users = this.generateUsers();
        this.chats = this.generateChats();
        this.messages = this.generateMessages();
        this.currentUser = this.users[0]; 
        this.contacts = this.generateContacts();
    }

    generateContacts() {
        return [
            { userId: 2, addedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, 
            { userId: 3, addedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }  
        ];
    }

    async getContacts() {
        await this.delay(200);
        
        return this.contacts.map(contact => {
            const user = this.users.find(u => u.id === contact.userId);
            return {
                ...user,
                addedDate: contact.addedDate
            };
        });
    }

    async addContact(userId) {
        await this.delay(300);
        
        const existingContact = this.contacts.find(c => c.userId === userId);
        if (!existingContact) {
            this.contacts.push({
                userId: userId,
                addedDate: new Date()
            });
            return true;
        }
        return false;
    }
    
    async removeContact(userId) {
        await this.delay(300);
        
        this.contacts = this.contacts.filter(c => c.userId !== userId);
        return true;
    }

    async isContact(userId) {
        await this.delay(200);
        return this.contacts.some(contact => contact.userId === userId);
    }

    async toggleChatPin(chatId) {
        await this.delay(200);
        
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.isPinned = !chat.isPinned;
        }
        return chat;
    }
    
    async toggleChatMute(chatId) {
        await this.delay(200);
        
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.isMuted = !chat.isMuted;
        }
        return chat;
    }
    
    async deleteChat(chatId) {
        await this.delay(300);
        
        this.chats = this.chats.filter(c => c.id !== chatId);
        this.messages.delete(chatId);
        return true;
    }
    
    generateUsers() {
        return [
            {
                id: 1,
                name: "You",
                username: "me",
                avatarUrl: "assets/me.png",
                bio: "Sample bio text",
                phone: "+7 123 456 7890",
                email: "me@example.com",
                lastSeen: new Date(),
                isOnline: true
            },
            {
                id: 2,
                name: "Anna Smirnova",
                username: "anna_s",
                avatarUrl: "assets/anna.png",
                bio: "UI/UX Designer",
                phone: "+7 987 654 3210",
                email: "anna@example.com",
                lastSeen: new Date(Date.now() - 5 * 60 * 1000), 
                isOnline: true
            },
            {
                id: 3,
                name: "Maxim Petrov",
                username: "max_dev",
                avatarUrl: "assets/max.png",
                bio: "Fullstack developer",
                phone: "+7 555 123 4567",
                email: "max@example.com",
                lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), 
                isOnline: false
            }
        ];
    }

    generateChats() {
        return [
            {
                id: 1,
                userId: 2, 
                type: 'private',
                name: "Anna Smirnova",
                avatarUrl: "assets/anna.png",
                lastMessage: {
                    text: "Hi! How's the project going?",
                    time: new Date(Date.now() - 10 * 60 * 1000), 
                    senderId: 2,
                    isRead: false
                },
                unreadCount: 2,
                isPinned: false,
                isMuted: false
            },
            {
                id: 2,
                userId: 3, 
                type: 'private',
                name: "Maxim Petrov",
                avatarUrl: "assets/max.png",
                lastMessage: {
                    text: "Please check this code",
                    time: new Date(Date.now() - 2 * 60 * 60 * 1000), 
                    senderId: 1, 
                    isRead: true
                },
                unreadCount: 0,
                isPinned: true,
                isMuted: false
            }
        ];
    }

    generateMessages() {
        const messages = new Map();
        messages.set(1, [
            {
                id: 1,
                chatId: 1,
                senderId: 2,
                senderName: "Anna",
                text: "Hi! How's the project going?",
                time: new Date(Date.now() - 60 * 60 * 1000), 
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 2,
                chatId: 1,
                senderId: 1,
                senderName: "You",
                text: "Going well, thanks!",
                time: new Date(Date.now() - 55 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            }
        ]);

        messages.set(2, [
            {
                id: 6,
                chatId: 2,
                senderId: 3,
                senderName: "Maxim",
                text: "Do you have time to look at the code?",
                time: new Date(Date.now() - 3 * 60 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            }
        ]);

        return messages;
    }

    // API for components
    async getChats(offset = 0, limit = 50) {
        await this.delay(300);
        
        return this.chats
            .slice(offset, offset + limit)
            .sort((a, b) => {
                // Pinned chats first
                if (a.isPinned !== b.isPinned) {
                    return a.isPinned ? -1 : 1;
                }
                // Then by last message time
                return b.lastMessage.time - a.lastMessage.time;
            });
    }

    async getMessages(chatId, offset = 0, limit = 50) {
        await this.delay(200);
        
        const chatMessages = this.messages.get(chatId) || [];
        return chatMessages.slice(offset, offset + limit);
    }

    async sendMessage(chatId, text) {
        await this.delay(100);
        
        const newMessage = {
            id: Date.now(),
            chatId: chatId,
            senderId: this.currentUser.id,
            senderName: this.currentUser.name,
            text: text,
            time: new Date(),
            type: 'text',
            isRead: false,
            isEdited: false
        };

        // Add message to chat
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        this.messages.get(chatId).push(newMessage);

        // Update last message in chat
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = {
                text: text,
                time: new Date(),
                senderId: this.currentUser.id,
                isRead: false
            };
        }

        return newMessage;
    }

    markChatAsRead(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.unreadCount = 0;
            if (chat.lastMessage) {
                chat.lastMessage.isRead = true;
            }
        }
    }

    async getUser(userId) {
        await this.delay(100);
        return this.users.find(u => u.id === userId);
    }

    async searchUsers(query) {
        await this.delay(400);
        
        return this.users.filter(user => 
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase())
        );
    }

    getCurrentUser() {
        return this.currentUser;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    simulateIncomingMessage(chatId) {
        const responses = [
            "Got it!",
            "I agree with you",
            "Interesting idea...",
            "What do you think about this?",
            "Okay, deal!",
            "Maybe we can meet to discuss?",
            "Send me the link, I'll check it",
            "👍"
        ];

        setTimeout(() => {
            const chat = this.chats.find(c => c.id === chatId);
            if (!chat) return;

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const user = this.users.find(u => u.id === chat.userId);
            
            const newMessage = {
                id: Date.now(),
                chatId: chatId,
                senderId: user.id,
                senderName: user.name,
                text: randomResponse,
                time: new Date(),
                type: 'text',
                isRead: false,
                isEdited: false
            };

            if (!this.messages.has(chatId)) {
                this.messages.set(chatId, []);
            }
            this.messages.get(chatId).push(newMessage);

            chat.lastMessage = {
                text: randomResponse,
                time: new Date(),
                senderId: user.id,
                isRead: false
            };
            chat.unreadCount++;

            document.dispatchEvent(new CustomEvent('newMessage', {
                detail: { chatId, message: newMessage }
            }));

        }, 1000 + Math.random() * 2000); 
    }
}

window.mockDataService = new MockDataService();
