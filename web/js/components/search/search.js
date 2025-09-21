// Обновленный Search компонент с dependency injection
class Search {
    constructor(eventBus, apiService, userService) {
        this.eventBus = eventBus;
        this.apiService = apiService;
        this.userService = userService;
        this.container = null;
        this.dataLoader = new SearchDataLoader(apiService);
        this.renderer = new SearchRenderer(userService);
        this.searchResults = [];
        this.searchTimeout = null;
        this.currentQuery = '';
        this.isLoading = false;
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
        this.renderer.renderResults(this.searchResults, this.container, this.isLoading, this.currentQuery);
    }

    setupEvents() {
        const searchInput = this.container.querySelector('.search-input');
        const backButton = this.container.querySelector('.back-button');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            // Очищаем поиск при фокусе если поле пустое
            searchInput.addEventListener('focus', () => {
                if (!searchInput.value.trim()) {
                    this.clearResults();
                }
            });
        }

        if (backButton) {
            backButton.addEventListener('click', () => {
                window.app.leftPanel.goBack();
            });
        }

        // Клик по результату поиска
        this.container.addEventListener('click', (event) => {
            const userItem = event.target.closest('.search-result-item');
            if (userItem && !userItem.classList.contains('loading')) {
                const userId = parseInt(userItem.dataset.userId);
                this.openUserProfile(userId);
            }
        });

        // Обработка Enter для быстрого перехода к первому результату
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.searchResults.length > 0) {
                    const firstResult = this.searchResults[0];
                    this.openUserProfile(firstResult.id);
                }
            });
        }
    }

    handleSearchInput(query) {
        console.log('Поиск по запросу:', query);
        
        // Очищаем предыдущий timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.currentQuery = query.trim();

        // Если запрос пустой - очищаем результаты
        if (this.currentQuery.length === 0) {
            this.clearResults();
            return;
        }

        // Показываем состояние загрузки
        this.isLoading = true;
        this.render();

        // Задержка перед поиском для debouncing
        this.searchTimeout = setTimeout(async () => {
            await this.performSearch(this.currentQuery);
        }, 300);
    }

    async performSearch(query) {
        if (query !== this.currentQuery) {
            // Запрос изменился пока мы ждали
            return;
        }

        try {
            console.log('Выполняем поиск:', query);
            this.isLoading = true;
            this.render();

            const results = await this.dataLoader.searchUsers(query);
            
            // Проверяем что запрос все еще актуален
            if (query === this.currentQuery) {
                this.searchResults = results;
                
                // Загружаем пользователей в UserService для статусов
                if (results.length > 0) {
                    const userIds = results.map(user => user.id);
                    await this.userService.loadUsers(userIds);
                }
                
                this.isLoading = false;
                this.render();
                
                console.log('Результаты поиска:', results);
            }
        } catch (error) {
            console.error('Ошибка поиска:', error);
            this.isLoading = false;
            this.searchResults = [];
            this.render();
            this.showErrorMessage('Ошибка поиска. Попробуйте еще раз.');
        }
    }

    clearResults() {
        this.searchResults = [];
        this.currentQuery = '';
        this.isLoading = false;
        this.render();
    }

    openUserProfile(userId) {
        const user = this.searchResults.find(u => u.id === userId);
        if (user) {
            // Переходим к профилю пользователя
            window.app.leftPanel.loadComponent('profile', { 
                userId: user.id,
                from: 'search'
            });
        }
    }

    showErrorMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'search-error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc3545;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        this.container.style.position = 'relative';
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Очищаем результаты при закрытии
        this.clearResults();
    }
}