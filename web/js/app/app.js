// main application orchestrator managing panels and event flow
class App {
    constructor() {
        console.log("app.constructor")
        
        // Проверяем авторизацию перед инициализацией
        if (!this.checkAuth()) {
            this.redirectToAuth();
            return;
        }

        this.apiManager = new ApiManager();
        this.eventBus = new EventBus();
        this.apiService = this.apiManager.createApiService();
        this.userService = new UserService(this.apiService, this.eventBus);
        this.messageService = new MessageService(this.apiService, this.eventBus);
        
        this.leftPanel = new LeftPanelManager(
            '.left-container', 
            this.eventBus,
            this.apiService,
            this.userService
        );
        
        this.rightPanel = new RightPanelManager(
            '.right-container', 
            this.eventBus,
            this.apiService,
            this.userService
        );

        this.websocketClient = null;

        this.setupCommunication();
        this.setupLogout();
    }

    // Проверка авторизации
    checkAuth() {
        try {
            const sessionData = localStorage.getItem('messenger_session');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            
            // Проверяем не истекла ли сессия
            if (session.expiresAt && session.expiresAt < Date.now()) {
                this.clearAuth();
                return false;
            }

            // Устанавливаем текущего пользователя
            this.currentUser = session.user;
            console.log('Найдена активная сессия для:', this.currentUser.username);
            return true;
        } catch (error) {
            console.error('Error checking auth:', error);
            this.clearAuth();
            return false;
        }
    }

    // Очистка данных авторизации
    clearAuth() {
        try {
            localStorage.removeItem('messenger_session');
            localStorage.removeItem('messenger_token');
        } catch (error) {
            console.error('Error clearing auth:', error);
        }
    }

    // Перенаправление на страницу авторизации
    redirectToAuth() {
        console.log('Redirecting to auth page');
        window.location.href = 'auth.html';
    }

    // Настройка обработчика выхода
    setupLogout() {
        // Обработчик для выхода (Ctrl+L или Cmd+L)
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                this.logout();
            }
        });
    }

    // Выход из системы
    logout() {
        if (confirm('Выйти из аккаунта?')) {
            this.clearAuth();
            this.redirectToAuth();
        }
    }

    // Получение текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }

    async init() {
        console.log("app.init");

        await this.userService.preloadAllUsers();
        
        this.setupGlobalEvents();
        this.leftPanel.loadComponent('chats-list');
        
        this.simulateUserStatusUpdates();
        this.initWebSocket();
    }

    // Добавьте новый метод для инициализации WebSocket:
    async initWebSocket() {
        this.websocketClient = new WebSocketClient(this.apiService, this.eventBus);
        
        const connected = await this.websocketClient.connect();
        if (!connected) {
            console.warn('Failed to connect to WebSocket, will retry automatically');
        }
    }

    // handles global navigation events from data attributes 
    setupGlobalEvents() {
        document.addEventListener('click', (event) => {
            const route = event.target.dataset.route;
            const panel = event.target.dataset.panel;
            
            if (route && panel) {
                if (panel === 'left') {
                    this.leftPanel.loadComponent(route);
                } else if (panel === 'right') {
                    this.rightPanel.loadComponent(route);
                }
            }
        });

        document.addEventListener('submit', (event) => {
            // Предотвращаем отправку всех форм, кроме форм авторизации
            if (!event.target.classList.contains('auth-form')) {
                console.log('Prevented form submission:', event.target);
                event.preventDefault();
                event.stopPropagation();
            }
        });
        
        // Защита от случайных нажатий Enter
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                const isInMessageInput = event.target.classList.contains('message-input');
                const isInAuthForm = event.target.closest('.auth-form');
                
                if (!isInMessageInput && !isInAuthForm) {
                    event.preventDefault();
                }
            }
        });
    }

    // establishes cross-panel communication through event subscriptions
    setupCommunication() {
        this.eventBus.on('chat-selected', (chatData) => {
            this.rightPanel.loadComponent('chat', chatData);
        });

        // this.eventBus.on('message-received', (data) => {
        //     if (!data.isActiveChat) { // Обновляем список только если чат не активен
        //         const currentComponent = this.leftPanel.getCurrentComponent();
        //         if (currentComponent && currentComponent.constructor.name === 'ChatsList') {
        //             currentComponent.updateSingleChat(data.chatId, data.message);
        //         }
        //     }
        // });

        this.eventBus.on('message-sent', (data) => {
            console.log('Message sent, updating chat list');
            
            const currentComponent = this.leftPanel.getCurrentComponent();
            if (currentComponent && currentComponent.constructor.name === 'ChatsList') {
                const chat = currentComponent.chats.find(c => c.id === data.chatId);
                
                if (chat) {
                    currentComponent.updateSingleChat(data.chatId, data.message);
                } else {
                    console.log('New chat created, refreshing chat list');
                    currentComponent.refresh();
                }
            }
        });

        this.eventBus.on('user-profile-requested', (data) => {
            this.leftPanel.loadComponent('profile', { userId: data.userId });
        });

        this.eventBus.on('profile-requested', () => {
            this.leftPanel.loadComponent('profile');
        });

        this.eventBus.on('open-chat-with-user', (data) => {
            this.findOrCreateChat(data.userId, data.userName, data.userAvatar);
        });

        this.eventBus.on('profile-updated', () => {
            this.leftPanel.refreshCurrentComponent();
        });

        this.eventBus.on('contacts-updated', () => {
            const currentComponent = this.leftPanel.getCurrentComponentName();
            if (currentComponent === 'profile') {
                this.leftPanel.refreshCurrentComponent();
            }
        });

       this.eventBus.on('chat-deleted', (data) => {
            // Проверяем, был ли удален активный чат
            const currentChatComponent = this.rightPanel.getCurrentComponent();
            if (currentChatComponent && currentChatComponent.chatData && 
                currentChatComponent.chatData.id === data.chatId) {
                // Показываем пустое состояние
                this.rightPanel.showEmptyState();
            }
        });

        // WebSocket обработчики
        this.eventBus.on('websocket-connected', () => {
            console.log('App: WebSocket connected');
            // Можно показать индикатор подключения
        });
        
        this.eventBus.on('websocket-disconnected', () => {
            console.log('App: WebSocket disconnected');
            // Можно показать индикатор отключения
        });
        
        this.eventBus.on('websocket-new-message', (data) => {
            console.log('App: New message via WebSocket');
            
            if (data.message.senderId === data.userId) {
                console.log('------- Ignoring own message from WebSocket');
                return; 
            }

            this.leftPanel.components['chats-list'].updateSingleChat(data.chatId, data.message)

            if (this.rightPanel.currentComponent != null) {
                this.rightPanel.components[this.rightPanel.currentComponentName].addNewMessage(data.message)
            }
        });
        
        this.eventBus.on('websocket-update-chats', () => {
            // Обновляем список чатов
            const currentComponent = this.leftPanel.getCurrentComponent();
            if (currentComponent && currentComponent.constructor.name === 'ChatsList') {
                currentComponent.refresh();
            }
        });
        
        this.eventBus.on('websocket-user-status', (data) => {
            // Обновляем статус пользователя в UI
            this.userService.updateUserStatus(data.userId, data.isOnline);
        });
    }

    simulateUserStatusUpdates() {
        setInterval(() => {
            // Случайно меняем статус случайного пользователя
            const userIds = [2, 3, 4, 5];
            const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
            const randomStatus = Math.random() > 0.7; // 30% шанс быть онлайн
            
            this.userService.updateUserStatus(randomUserId, randomStatus);
        }, 10000); // каждые 10 секунд
    }

    // В методе findOrCreateChat добавить дополнительную проверку:
    async findOrCreateChat(userId, userName, userAvatar) {
        try {
            console.log('%c🎯 findOrCreateChat START', 'background: blue; color: white;', { userId, userName, userAvatar });
            
            // Получаем существующие чаты через API
            const existingChats = await this.apiService.getChats();
            console.log('📋 Existing chats:', existingChats);
            
            // Ищем существующий чат
            const existingChat = existingChats.find(chat => {
                return chat.type === 'private' && chat.userId === userId;
            });
            
            let chatData;
            if (existingChat) {
                console.log('📞 Found existing chat:', existingChat);
                chatData = existingChat;
            } else {
                console.log('➕ Creating new chat with user:', userId);
                
                try {
                    chatData = await this.apiService.createChat({
                        userId: userId,
                        type: 'private',
                        name: userName,
                        avatarUrl: userAvatar
                    });
                    
                    console.log('✅ Created new chat:', chatData);
                    
                } catch (createError) {
                    console.error('💥 Error creating chat:', createError);
                    throw createError;
                }
            }
            
            console.log('%c🎬 Loading chat in right panel', 'background: purple; color: white;', chatData);
            
            // Убеждаемся что правая панель чиста
            this.rightPanel.clear && this.rightPanel.clear();
            
            // Загружаем чат
            await this.rightPanel.loadComponent('chat', chatData);
            
            console.log('%c✅ Chat loaded successfully', 'background: green; color: white;');
            
        } catch (error) {
            console.error('%c💥 Error in findOrCreateChat:', 'background: red; color: white;', error);
            console.trace();
        }
    }

    // Исправить метод findOrCreateChat:
    // async findOrCreateChat(userId, userName, userAvatar) {
    //     try {
    //         // Сначала проверяем существующие чаты
    //         let existingChat = null;
    //         const currentChats = await this.apiService.getChats();
            
    //         // Ищем существующий приватный чат с этим пользователем
    //         for (const chat of currentChats) {
    //             if (chat.type === 'private' && chat.userId === userId) {
    //                 existingChat = chat;
    //                 break;
    //             }
    //         }

    //         let chatData;
    //         if (existingChat) {
    //             console.log('Found existing chat:', existingChat.id);
    //             chatData = existingChat;
    //         } else {
    //             console.log('Creating new chat with user:', userId);
    //             // Создаем новый чат
    //             chatData = await this.apiService.createChat({
    //                 userId: userId,
    //                 type: 'private',
    //                 name: userName,
    //                 avatarUrl: userAvatar
    //             });
                
    //             // Обновляем список чатов
    //             const currentComponent = this.leftPanel.getCurrentComponent();
    //             if (currentComponent && currentComponent.constructor.name === 'ChatsList') {
    //                 currentComponent.refresh();
    //             }
    //         }

    //         // ВАЖНО: Сначала очищаем правую панель
    //         this.rightPanel.clear();
            
    //         // Затем загружаем чат
    //         await this.rightPanel.loadComponent('chat', chatData);
            
    //         console.log('Chat opened successfully:', chatData.id);
            
    //     } catch (error) {
    //         console.error('Error in findOrCreateChat:', error);
    //         // Показываем уведомление пользователю
    //         this.showErrorNotification('Не удалось открыть чат');
    //     }
    // }

    // Добавить метод для показа уведомлений об ошибках:
    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // manages chat creation logic with temporary state handling
    // async findOrCreateChat(userId, userName, userAvatar) {
    //     const existingChat = window.mockDataService.chats.find(chat => chat.userId === userId);
        
    //     let chatData;
    //     if (existingChat) {
    //         chatData = existingChat;
    //     } else {
    //         // creates temporary chat session without persisting to main list
    //         chatData = {
    //             id: `temp_${userId}`,
    //             userId: userId,
    //             type: 'private',
    //             name: userName,
    //             avatarUrl: userAvatar,
    //             isTemporary: true
    //         };
    //     }
        
    //     this.rightPanel.loadComponent('chat', chatData);
    // }
}

class ApiManager {

    createApiService() {
        // Логика выбора типа API
        const apiType = this.getApiType();
        const apiConfig = this.getApiConfig(apiType);
        
        console.log(`Creating API service: ${apiType}`, apiConfig);
        return ApiServiceFactory.create(apiType, apiConfig);
    }

    getApiType() {
        // Проверяем localStorage для переключения в dev режиме
        const override = localStorage.getItem('apiType');
        if (override) return override;
        
        // По hostname определяем окружение
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     return 'local';
        // }
        
        return 'http'; // По умолчанию HTTP API в продакшене
    }

    getApiConfig(apiType) {
        const configs = {
            local: {},
            http: {
                baseUrl: this.getBaseUrl()
            }
        };
        
        return configs[apiType] || {};
    }

    getBaseUrl() {
        switch (window.location.hostname) {
            case 'localhost':
            case '127.0.0.1':
                return 'http://localhost:8000/api'; // ИСПРАВЛЕНО: добавлен /api
            case 'staging.messenger.com':
                return 'https://api-staging.messenger.com/api';
            default:
                return 'https://api.messenger.com/api';
        }
    }
}