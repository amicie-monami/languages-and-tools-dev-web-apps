// Обновленный ContactsManager с API
class ContactsManager {
    constructor(apiService, eventBus) {
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.contacts = [];
    }

    async render(container) {
        await this.loadContacts();
        this.renderContactsList(container);
        this.updateContactsCount(container);
    }

    async loadContacts() {
        try {
            this.contacts = await this.apiService.getContacts();
        } catch (error) {
            console.error('Ошибка загрузки контактов:', error);
            this.contacts = [];
        }
    }

    renderContactsList(container) {
        const contactsList = container.querySelector('#contacts-list');
        if (!contactsList) return;

        contactsList.innerHTML = '';

        if (this.contacts.length === 0) {
            contactsList.innerHTML = '<p class="no-contacts">Контактов пока нет</p>';
            return;
        }

        this.contacts.forEach(contact => {
            const contactItem = this.createContactItem(contact);
            contactsList.appendChild(contactItem);
        });
    }

    createContactItem(contact) {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.dataset.userId = contact.id;

        const onlineStatus = contact.isOnline ? 
            '<span class="online-indicator"></span>' : '';
        
        div.innerHTML = `
            <div class="contact-avatar">
                <img src="${contact.avatarUrl}" alt="${contact.name}">
                ${onlineStatus}
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-username">@${contact.username}</div>
            </div>
            <div class="contact-actions">
                <button class="message-contact-btn" title="Написать сообщение">💬</button>
            </div>
        `;

        this.setupContactEvents(div, contact);
        return div;
    }

    setupContactEvents(contactElement, contact) {
        const messageBtn = contactElement.querySelector('.message-contact-btn');
        
        if (messageBtn) {
            messageBtn.addEventListener('click', (e) => {
                console.log('%c👤 Contact message button clicked', 'background: purple; color: white;');
                e.preventDefault();
                e.stopPropagation();
                this.openChatWithContact(contact);
            });
        }

        contactElement.addEventListener('click', () => {
            window.app.leftPanel.loadComponent('profile', { 
                userId: contact.id,
                from: 'profile'
            });
        });
    }

    openChatWithContact(contact) {
        this.eventBus.emit('open-chat-with-user', {
            userId: contact.id,
            userName: contact.name,
            userAvatar: contact.avatarUrl
        });
    }

    updateContactsCount(container) {
        const countElement = container.querySelector('.contacts-count');
        if (countElement) {
            countElement.textContent = this.contacts.length;
        }
    }
}

