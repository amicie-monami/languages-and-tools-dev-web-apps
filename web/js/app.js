// app.js
class App {
    constructor() {
        this.eventBus = new EventBus();
        this.leftPanel = new LeftPanelManager('.left-container', this.eventBus);
        this.rightPanel = new RightPanelManager('.right-container', this.eventBus);
        
        this.setupCommunication();
    }

    init() {
        this.setupGlobalEvents();
        this.leftPanel.loadComponent('chatsList');
    }

    setupCommunication() {
        // When chat is selected in left panel - open it in right
        this.eventBus.on('chat-selected', (chatData) => {
            this.rightPanel.loadComponent('chat', chatData);
        });

        // When message is sent - refresh chats list
        this.eventBus.on('message-sent', (data) => {
            this.leftPanel.refreshCurrentComponent();
        });

        // Open user profile from chat
        this.eventBus.on('user-profile-requested', (data) => {
            this.leftPanel.loadComponent('profile', { userId: data.userId });
        });

        // Open chat with user from profile
        this.eventBus.on('open-chat-with-user', (data) => {
            this.findOrCreateChat(data.userId, data.userName, data.userAvatar);
        });

        this.eventBus.on('profile-updated', () => {
            this.leftPanel.refreshCurrentComponent();
        });

        this.eventBus.on('contacts-updated', () => {
            // If own profile is open - refresh it
            const currentComponent = this.leftPanel.getCurrentComponentName();
            if (currentComponent === 'profile') {
                this.leftPanel.refreshCurrentComponent();
            }
        });
    }

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
    }

    async findOrCreateChat(userId, userName, userAvatar) {
        // Check if chat with this user already exists
        const existingChat = window.mockDataService.chats.find(chat => chat.userId === userId);
        
        let chatData;
        if (existingChat) {
            chatData = existingChat;
        } else {
            // Create TEMPORARY chat (not added to main list)
            chatData = {
                id: `temp_${userId}`,
                userId: userId,
                type: 'private',
                name: userName,
                avatarUrl: userAvatar,
                isTemporary: true
            };
        }
        
        this.rightPanel.loadComponent('chat', chatData);
    }
}