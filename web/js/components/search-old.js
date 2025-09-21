class Search {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.dataLoader = new SearchDataLoader();
        this.renderer = new SearchRenderer();
        this.searchResults = [];
        this.searchTimeout = null;
    }

    async init(container, data) {
        this.container = container;
        this.render();
        this.setupEvents();
        
        // Автоматически фокусируемся на поле поиска
        setTimeout(() => {
            const searchInput = this.container.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }

    render() {
        this.renderer.renderResults(this.searchResults, this.container);
    }

    setupEvents() {
        const searchInput = this.container.querySelector('.search-input');
        const backButton = this.container.querySelector('.back-button');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                window.app.leftPanel.goBack(); // Используем стек
            });
        }

        // Клик по результату поиска
        this.container.addEventListener('click', (event) => {
            const userItem = event.target.closest('.search-result-item');
            if (userItem) {
                const userId = parseInt(userItem.dataset.userId);
                this.openUserProfile(userId);
            }
        });
    }

    handleSearchInput(query) {
        console.log('Поиск по запросу:', query); 
        
        // Очищаем предыдущий timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Задержка перед поиском
        this.searchTimeout = setTimeout(async () => {
            if (query.trim().length > 0) {
                await this.performSearch(query.trim());
            } else {
                this.searchResults = [];
                this.render();
            }
        }, 300);
    }

    async performSearch(query) {
        try { 
            console.log('Вызываем dataLoader.searchUsers'); 
            this.searchResults = await this.dataLoader.searchUsers(query);
            console.log('Результаты поиска:', this.searchResults);
            this.render();
        } catch (error) {
            console.error('Ошибка поиска:', error);
            this.searchResults = [];
            this.render();
        }
    }

    openUserProfile(userId) {
        // Найти пользователя из результатов поиска
        const user = this.searchResults.find(u => u.id === userId);
        if (user) {
            // Открываем чат с этим пользователем
            this.eventBus.emit('open-chat-with-user', {
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatarUrl
            });
        }
    }

    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

class SearchDataLoader {
    constructor() {
        this.mockService = window.mockDataService;
    }

    async searchUsers(query) {
        return await this.mockService.searchUsers(query);
    }
}

class SearchRenderer {
    renderResults(results, container) {
        const resultsContainer = container.querySelector('.search-results');
        if (!resultsContainer) {
            console.error('Элемент .search-results не найден');
            return;
        }

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">Ничего не найдено</p>';
            return;
        }

        resultsContainer.innerHTML = '';

        results.forEach(user => {
            const userItem = this.createUserItem(user);
            resultsContainer.appendChild(userItem);
        });
    }

    createUserItem(user) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.userId = user.id;
        
        const onlineStatus = user.isOnline ? 
            '<span class="online-indicator"></span>' : '';
        
        div.innerHTML = `
            <div class="user-avatar">
                <img src="${user.avatarUrl}" alt="${user.name}">
                ${onlineStatus}
            </div>
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-username">@${user.username}</div>
                <div class="user-bio">${user.bio || ''}</div>
            </div>
        `;
        
        return div;
    }
}