// profile.js
class Profile {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new ProfileDataLoader();
        this.renderer = new ProfileRenderer();
        this.userData = null;
        this.isOwnProfile = true;
        this.contactsManager = new ContactsManager();
    }

    async init(container, data) {
        this.container = container;
        
        if (data && data.userId) {
            this.isOwnProfile = false;
            await this.loadUserData(data.userId);
        } else {
            this.isOwnProfile = true;
            this.userData = window.mockDataService.getCurrentUser();
        }

        this.render();
        this.setupEvents();
    }

    async loadUserData(userId) {
        try {
            this.userData = await this.dataLoader.getUser(userId);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.userData = null;
        }
    }

    render() {
        if (!this.userData) {
            this.container.innerHTML = '<p>User not found</p>';
            return;
        }

        this.renderer.render(this.userData, this.container, this.isOwnProfile);
        
        if (this.isOwnProfile) {
            this.contactsManager.render(this.container);
        } else {
            this.renderContactActions();
        }
    }

    renderContactActions() {
        const actionsContainer = this.container.querySelector('.profile-actions');
        if (!actionsContainer) return;

        this.updateContactStatus(actionsContainer);
    }

    async updateContactStatus(container) {
        const isContact = await window.mockDataService.isContact(this.userData.id);
        
        container.innerHTML = `
            <button class="btn ${isContact ? 'btn-danger' : 'btn-primary'}" id="contact-action-btn">
                ${isContact ? 'Remove from contacts' : 'Add to contacts'}
            </button>
            <button class="btn" id="message-btn">
                Send message
            </button>
        `;

        this.setupActionButtons();
    }

    setupActionButtons() {
        const contactBtn = this.container.querySelector('#contact-action-btn');
        const messageBtn = this.container.querySelector('#message-btn');
        
        if (contactBtn) {
            contactBtn.addEventListener('click', () => this.toggleContactStatus());
        }
        
        if (messageBtn) {
            messageBtn.addEventListener('click', () => this.openChat());
        }
    }

    async toggleContactStatus() {
        if (!this.userData) return;

        try {
            const isContact = await window.mockDataService.isContact(this.userData.id);
            
            if (isContact) {
                await window.mockDataService.removeContact(this.userData.id);
            } else {
                await window.mockDataService.addContact(this.userData.id);
            }
            
            this.renderContactActions();
            this.eventBus.emit('contacts-updated');
            
        } catch (error) {
            console.error('Error toggling contact status:', error);
        }
    }

    openChat() {
        if (!this.userData) return;

        this.eventBus.emit('open-chat-with-user', {
            userId: this.userData.id,
            userName: this.userData.name,
            userAvatar: this.userData.avatarUrl
        });
    }

    setupEvents() {
        if (this.isOwnProfile) {
            const editBtn = this.container.querySelector('#edit-profile-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.eventBus.emit('edit-profile-requested');
                });
            }
        }
    }

    async refresh() {
        if (this.userData) {
            await this.loadUserData(this.userData.id);
            this.render();
        }
    }

    destroy() {
        // Cleanup if needed
    }
}

class ProfileDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }

    async getUser(userId) {
        return await this.mockService.getUser(userId);
    }
}

class ProfileRenderer {
    render(userData, container, isOwnProfile) {
        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img src="${userData.avatarUrl}" alt="${userData.name}">
                </div>
                <div class="profile-name">${userData.name}</div>
                <div class="profile-username">@${userData.username}</div>
                ${isOwnProfile ? `
                    <button class="btn" id="edit-profile-btn">Edit profile</button>
                ` : ''}
            </div>
            
            <div class="profile-info">
                <div class="info-section">
                    <h4>Bio</h4>
                    <p>${userData.bio || 'No bio yet'}</p>
                </div>
                
                <div class="info-section">
                    <h4>Contact info</h4>
                    <div class="contact-info-item">
                        <span>📱</span>
                        <span>${userData.phone}</span>
                    </div>
                    <div class="contact-info-item">
                        <span>✉️</span>
                        <span>${userData.email}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>Status</h4>
                    <p>${userData.isOnline ? '🟢 Online' : '⚫ Last seen ' + this.formatLastSeen(userData.lastSeen)}</p>
                </div>
            </div>
            
            ${isOwnProfile ? `
                <div class="profile-contacts">
                    <div class="contacts-header">
                        <h4>My contacts</h4>
                        <span class="contacts-count">0</span>
                    </div>
                    <div id="contacts-list" class="contacts-list"></div>
                </div>
            ` : `
                <div class="profile-actions"></div>
            `}
        `;
    }

    formatLastSeen(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) {
            return 'just now';
        } else if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}