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
                name: "Вы",
                username: "me",
                avatarUrl: "assets/me.png",
                bio: "Черный черный черный черный черный черный черный негр",
                lastSeen: new Date(),
                isOnline: true
            },
            {
                id: 2,
                name: "Анна Смирнова",
                username: "anna_s",
                avatarUrl: "assets/anna.png",
                bio: "Дизайнер UI/UX. Люблю минимализм и хорошие шрифты.",
                lastSeen: new Date(Date.now() - 5 * 60 * 1000), 
                isOnline: true
            },
            {
                id: 3,
                name: "Максим Петров",
                username: "max_dev",
                avatarUrl: "assets/max.png",
                bio: "Fullstack разработчик. React, Node.js, PostgreSQL",
                lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), 
                isOnline: false
            },
            {
                id: 4,
                name: "Лиза Козлова",
                username: "liza_k",
                avatarUrl: "assets/liza.png",
                bio: "Маркетолог и путешественница ✈️",
                lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), 
                isOnline: false
            },
            {
                id: 5,
                name: "Группа JS разработчиков",
                username: "js_devs",
                avatarUrl: "assets/group_js.png",
                bio: "Обсуждаем JS, React, Vue и все что связано с фронтендом",
                isGroup: true,
                members: [1, 2, 3],
                isOnline: true
            }
        ];
    }

    generateChats() {
        return [
            {
                id: 1,
                userId: 2, 
                type: 'private',
                name: "Анна Смирнова",
                avatarUrl: "assets/anna.png",
                lastMessage: {
                    text: "Привет! Как проект продвигается? Я очень сильно застрял в этом измерении черного тмина и белых пальм. Не знаю, когда я выберусь отсюда, но запах чует, осталось мне не долго. Вестерн, ковбои, белая шапка и мокрые кеды - я бреду по миру и думаю о новом корсете. Пули глаз моих свистят по ветру и нансоят врагу поражающий в репу. Но не горжусь я своими делами, ведь нет души там, где нет песка. Песок - вода, речной воздух и мягкие медузы.",
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
                name: "Максим Петров",
                avatarUrl: "assets/max.png",
                lastMessage: {
                    text: "Посмотри этот код, пожалуйста",
                    time: new Date(Date.now() - 2 * 60 * 60 * 1000), 
                    senderId: 1, 
                    isRead: true
                },
                unreadCount: 0,
                isPinned: true,
                isMuted: false
            },
            // {
            //     id: 3,
            //     userId: 4, // Лиза
            //     type: 'private',
            //     name: "Лиза Козлова",
            //     avatarUrl: "liza.png",
            //     lastMessage: {
            //         text: "Фото из Парижа!",
            //         time: new Date(Date.now() - 24 * 60 * 60 * 1000), 
            //         senderId: 4,
            //         isRead: true
            //     },
            //     unreadCount: 0,
            //     isPinned: false,
            //     isMuted: false
            // },
            // {
            //     id: 4,
            //     userId: 5, // Группа
            //     type: 'group',
            //     name: "JS разработчики",
            //     avatarUrl: "group_js.png",
            //     lastMessage: {
            //         text: "Кто-нибудь работал с WebRTC?",
            //         time: new Date(Date.now() - 30 * 60 * 1000), 
            //         senderId: 3,
            //         senderName: "Максим",
            //         isRead: false
            //     },
            //     unreadCount: 5,
            //     isPinned: false,
            //     isMuted: true
            // }
        ];
    }

    generateMessages() {
        const messages = new Map();
        messages.set(1, [
            {
                id: 1,
                chatId: 1,
                senderId: 2,
                senderName: "Анна",
                text: "Привет! Как проект продвигается? Я очень сильно застрял в этом измерении черного тмина и белых пальм. Не знаю, когда я выберусь отсюда, но запах чует, осталось мне не долго. Вестерн, ковбои, белая шапка и мокрые кеды - я бреду по миру и думаю о новом корсете. Пули глаз моих свистят по ветру и нансоят врагу поражающий в репу. Но не горжусь я своими делами, ведь нет души там, где нет песка. Песок - вода, речной воздух и мягкие медузы.",
                time: new Date(Date.now() - 60 * 60 * 1000), 
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 2,
                chatId: 1,
                senderId: 1,
                senderName: "Вы",
                text: "Привет! Зажигательный танец под вечер устроил чегорин. Все внимали и с тихой усладкой наблюдали за настоящей грацией - настоящей, понимаешь? Неподдельной, живой. Могучей. Такие столпы появляются раз в тысячелетие и зиждятся на чем-то не земном, не вообразимом. Он ест и пьет, мучит и пучит. Невозможно оторвать глаз. Загляденье, каких не видел усопший под пеплом везувия.",
                time: new Date(Date.now() - 55 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 3,
                chatId: 1,
                senderId: 2,
                senderName: "Анна",
                text: "Звучит интересно! Расскажешь подробнее?",
                time: new Date(Date.now() - 50 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 4,
                chatId: 1,
                senderId: 1,
                senderName: "Вы",
                text: "Это мессенджер на чистом JS. Делаю архитектуру с компонентами",
                time: new Date(Date.now() - 45 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 5,
                chatId: 1,
                senderId: 2,
                senderName: "Анна",
                text: "Привет! Как проект продвигается?",
                time: new Date(Date.now() - 10 * 60 * 1000),
                type: 'text',
                isRead: false,
                isEdited: false
            }
        ]);

        messages.set(2, [
            {
                id: 6,
                chatId: 2,
                senderId: 3,
                senderName: "Максим",
                text: "Есть время посмотреть код?",
                time: new Date(Date.now() - 3 * 60 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 7,
                chatId: 2,
                senderId: 1,
                senderName: "Вы",
                text: "Конечно! Скидывай",
                time: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
                type: 'text',
                isRead: true,
                isEdited: false
            },
            {
                id: 8,
                chatId: 2,
                senderId: 1,
                senderName: "Вы",
                text: "Посмотри этот код, пожалуйста",
                time: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
                // pinned chats at the beginning
                if (a.isPinned !== b.isPinned) {
                    return a.isPinned ? -1 : 1;
                }
                // after by last msg time
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

        // Add a msg to the chat
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        this.messages.get(chatId).push(newMessage);

        // Update last msg in chat
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
            "Понятно!",
            "Согласен с тобой",
            "Интересная идея...",
            "А что ты об этом думаешь?",
            "Хорошо, договорились!",
            "Может встретимся обсудить?",
            "Пришли ссылку, посмотрю",
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