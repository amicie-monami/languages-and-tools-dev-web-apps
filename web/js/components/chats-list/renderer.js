class ChatsListRenderer {
    render(chats, container, userService) {
        const chatsList = container.querySelector('#chats-list ul');
        if (!chatsList) {
            console.error('#chats-list ul element not found');
            return;
        }

        chatsList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat, userService);
            chatsList.appendChild(chatItem);
        });
    }

    createChatItem(chat, userService) {
        const li = document.createElement('li');
        li.className = 'chat-item';
        li.dataset.chatId = chat.id;
        
        if (chat.isPinned) li.classList.add('pinned');
        if (chat.unreadCount > 0) li.classList.add('unread');
        
        const timeStr = this.formatTime(chat.lastMessage.time);
        const unreadBadge = chat.unreadCount > 0 ? 
            `<span class="unread-count${chat.isMuted ? ' muted' : ''}">${chat.unreadCount}</span>` : '';
        const pinnedIcon = chat.isPinned ? '<span class="pinned-icon">📌</span>' : '';
        const mutedIcon = chat.isMuted ? '<span class="muted-icon">🔇</span>' : '';
        
        const messageStatus = this.getMessageStatus(chat.lastMessage);
        const onlineIndicator = userService ? this.getOnlineIndicator(chat, userService) : '';
                
        console.log(`%c🔍 DEBUG: [ChatsList.createChatItem]: ${chat.id, chat.name}}`, 'background: #222; color: #bada55');

        if(chat.avatarUrl === null) chat.avatarUrl = "assets/anna.png"

        li.innerHTML = `
            <div class="chat-avatar">
                <img src="${chat.avatarUrl}" alt="${chat.name}">
                ${onlineIndicator}
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-time">${timeStr}</div>
                </div>
                <div class="chat-footer">
                    <div class="last-message">
                        ${messageStatus}${this.formatLastMessage(chat)}
                    </div>
                    <div class="chat-badges">
                        ${pinnedIcon}${mutedIcon}${unreadBadge}
                    </div>
                </div>
            </div>
        `;
        
        return li;
    }

    getOnlineIndicator(chat, userService) {
        if (!userService) {
            console.warn('UserService not provided to renderer');
            return '';
        }
        
        const isOnline = userService.getUserStatus(chat.userId);
        return isOnline ? '<span class="online-indicator"></span>' : '';
    }

    getMessageStatus(message) {
        if (message.senderId === 1) { // Текущий пользователь
            return message.isRead ? 
                '<span class="message-status read">✓✓</span>' : 
                '<span class="message-status sent">✓</span>';
        }
        return '';
    }

    formatTime(date) {
        // Ensure date is a Date object
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        // Check if the conversion was successful
        if (isNaN(date.getTime())) {
            return 'недавно';
        }
        
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
        if (minutes < 1) {
            return 'сейчас';
        } else if (minutes < 60) {
            return `${minutes}м`;
        } else if (hours < 24) {
            return `${hours}ч`;
        } else if (days === 1) {
            return 'вчера';
        } else if (days < 7) {
            return `${days}д`;
        } else {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
    }

    // formats last message with sender context
    formatLastMessage(chat) {
        const msg = chat.lastMessage;
        let prefix = '';
        
        if (chat.type === 'group' && msg.senderName) {
            prefix = `${msg.senderName}: `;
        } else if (msg.senderId === 1) { // current user ID
            prefix = 'You: ';
        }
        
        return `${prefix}${msg.text}`;
    }
}