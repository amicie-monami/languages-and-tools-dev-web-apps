// chats-list.js
class ChatsList {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ChatsListDataLoader();
        this.renderer = new ChatsListRenderer();
        this.chats = [];
    }

    async init(container, data) {
        this.container = container;
        await this.loadData();
        this.render();
        this.setupEvents();
    }

    async loadData() {
        try {
            this.chats = await this.dataLoader.getAll();
        } catch (error) {
            console.error('Error loading chats:', error);
            this.chats = [];
        }
    }

    render() {
        this.updateProfileAvatar();
        this.renderer.render(this.chats, this.container);
    }

    setupEvents() {
        this.container.addEventListener('click', (event) => {
            // Avatar click - open profile
            if (event.target.classList.contains('chats-profile-avatar')) {
                this.eventBus.emit('profile-requested');
                return;
            }

            // Search field click - open search page
            if (event.target.classList.contains('search-input')) {
                if (window.app.leftPanel.getCurrentComponentName() !== 'search') {
                    window.app.leftPanel.loadComponent('search');
                }
                return;
            }

            // Chat item click
            const chatItem = event.target.closest('.chat-item');
            if (chatItem) {
                const chatId = parseInt(chatItem.dataset.chatId);
                const chat = this.chats.find(c => c.id === chatId);
                
                if (chat) {
                    this.eventBus.emit('chat-selected', {
                        id: chat.id,
                        userId: chat.userId,
                        name: chat.name,
                        avatarUrl: chat.avatarUrl,
                        type: chat.type
                    });
                }

                setTimeout(() => this.refresh(), 100);
            }
        });

        this.container.addEventListener('contextmenu', (event) => {
            const chatItem = event.target.closest('.chat-item');
            if (chatItem) {
                event.preventDefault();
                const chatId = parseInt(chatItem.dataset.chatId);
                const chat = this.chats.find(c => c.id === chatId);
                
                if (chat) {
                    this.showContextMenu(event, chat, chatItem);
                }
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(event, chat, chatElement) {
        this.hideContextMenu();
        
        const menu = this.createContextMenu(chat);
        document.body.appendChild(menu);
        
        // Position menu
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        // Adjust if menu goes off-screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (event.clientX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (event.clientY - rect.height) + 'px';
        }
    }

    createContextMenu(chat) {
        const menu = document.createElement('div');
        menu.className = 'chat-context-menu';
        menu.id = 'chat-context-menu';
        
        const pinText = chat.isPinned ? 'Unpin' : 'Pin';
        const muteText = chat.isMuted ? 'Enable notifications' : 'Mute notifications';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="pin" data-chat-id="${chat.id}">
                ${pinText}
            </div>
            <div class="context-menu-item" data-action="mute" data-chat-id="${chat.id}">
                ${muteText}
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete" data-chat-id="${chat.id}">
                Delete chat
            </div>
        `;
        
        // Add menu item handlers
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            const chatId = parseInt(e.target.dataset.chatId);
            
            if (action && chatId) {
                this.handleContextMenuAction(action, chatId);
            }
            
            this.hideContextMenu();
        });
        
        return menu;
    }

    hideContextMenu() {
        const existingMenu = document.getElementById('chat-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }
    
    async handleContextMenuAction(action, chatId) {
        try {
            switch (action) {
                case 'pin':
                    await window.mockDataService.toggleChatPin(chatId);
                    break;
                case 'mute':
                    await window.mockDataService.toggleChatMute(chatId);
                    break;
                case 'delete':
                    if (confirm('Delete chat? This action cannot be undone.')) {
                        await window.mockDataService.deleteChat(chatId);
                    }
                    break;
            }
            
            // Refresh chats list
            await this.refresh();
            
        } catch (error) {
            console.error('Error handling action:', error);
        }
    }

    updateProfileAvatar() {
        const profileAvatar = this.container.querySelector('.chats-profile-avatar');
        if (profileAvatar) {
            const currentUser = window.mockDataService.getCurrentUser();
            profileAvatar.src = currentUser.avatarUrl;
        }
    }

    async refresh() {
        await this.loadData();
        this.render();
    }

    destroy() {
        // Cleanup event listeners if needed
    }
}

class ChatsListDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }
    
    async getAll(offset = 0, limit = 50) {
        return await this.mockService.getChats(offset, limit);
    }
}

class ChatsListRenderer {
    render(chats, container) {
        const chatsList = container.querySelector('#chats-list ul');
        if (!chatsList) {
            console.error('#chats-list ul element not found');
            return;
        }

        chatsList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            chatsList.appendChild(chatItem);
        });
    }

    createChatItem(chat) {
        const li = document.createElement('li');
        li.className = 'chat-item';
        li.dataset.chatId = chat.id;
        
        const timeStr = this.formatTime(chat.lastMessage.time);
        const unreadBadge = chat.unreadCount > 0 ? 
            `<span class="unread-count">${chat.unreadCount}</span>` : '';
        const pinnedIcon = chat.isPinned ? '<span class="pinned-icon">📌</span>' : '';
        const mutedIcon = chat.isMuted ? '<span class="muted-icon">🔇</span>' : '';

        li.innerHTML = `
            <div class="chat-avatar">
                <img src="${chat.avatarUrl}" alt="${chat.name}">
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-time">${timeStr}</div>
                </div>
                <div class="chat-footer">
                    <div class="last-message">${this.formatLastMessage(chat)}</div>
                    <div class="chat-badges">
                        ${pinnedIcon}${mutedIcon}${unreadBadge}
                    </div>
                </div>
            </div>
        `;
        
        return li;
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `${minutes}m`;
        } else if (hours < 24) {
            return `${hours}h`;
        } else if (days < 7) {
            return `${days}d`;
        } else {
            return date.toLocaleDateString();
        }
    }

    formatLastMessage(chat) {
        const msg = chat.lastMessage;
        let prefix = '';
        
        if (chat.type === 'group' && msg.senderName) {
            prefix = `${msg.senderName}: `;
        } else if (msg.senderId === 1) { // current user
            prefix = 'You: ';
        }
        
        return `${prefix}${msg.text}`;
    }
}