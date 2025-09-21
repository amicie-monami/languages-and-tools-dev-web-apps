// main application orchestrator managing panels and event flow
class App {
    constructor() {
        console.log("app.constructor")
        this.eventBus = new EventBus();
        this.leftPanel = new LeftPanelManager('.left-container', this.eventBus);
        this.rightPanel = new RightPanelManager('.right-container', this.eventBus);
        this.setupCommunication();
    }

    init() {
        console.log("app.init")
        this.setupGlobalEvents();
        this.leftPanel.loadComponent('chats-list');
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
    }

    // establishes cross-panel communication through event subscriptions
    setupCommunication() {
        this.eventBus.on('chat-selected', (chatData) => {
            this.rightPanel.loadComponent('chat', chatData);
        });

        this.eventBus.on('message-sent', (data) => {
            console.log('Message sent, updating chat list');
            this.leftPanel.updateChatInList(data);
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
    }

    // manages chat creation logic with temporary state handling
    async findOrCreateChat(userId, userName, userAvatar) {
        const existingChat = window.mockDataService.chats.find(chat => chat.userId === userId);
        
        let chatData;
        if (existingChat) {
            chatData = existingChat;
        } else {
            // creates temporary chat session without persisting to main list
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