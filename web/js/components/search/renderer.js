class SearchRenderer {
    constructor(userService) {
        this.userService = userService;
    }

    renderResults(results, container, isLoading = false, query = '') {
        const resultsContainer = container.querySelector('.search-results');
        if (!resultsContainer) {
            console.error('Элемент .search-results не найден');
            return;
        }

        if (isLoading) {
            resultsContainer.innerHTML = this.renderLoadingState();
            return;
        }

        if (query === '') {
            resultsContainer.innerHTML = this.renderEmptyState();
            return;
        }

        if (results.length === 0) {
            resultsContainer.innerHTML = this.renderNoResults(query);
            return;
        }

        resultsContainer.innerHTML = '';

        // Добавляем заголовок с количеством результатов
        const header = this.createResultsHeader(results.length, query);
        resultsContainer.appendChild(header);

        // Рендерим результаты
        results.forEach((user, index) => {
            const userItem = this.createUserItem(user, index);
            resultsContainer.appendChild(userItem);
        });
    }

    createResultsHeader(count, query) {
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.innerHTML = `
            <h3>Найдено пользователей: ${count}</h3>
            <p>По запросу "${query}"</p>
        `;
        header.style.cssText = `
            padding: 16px 0 8px 0;
            border-bottom: 1px solid #333;
            margin-bottom: 8px;
            color: #888;
        `;
        return header;
    }

    createUserItem(user, index) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.userId = user.id;
        
        // Получаем актуальный статус через UserService
        const isOnline = this.userService.getUserStatus(user.id);
        const onlineStatus = isOnline ? '<span class="online-indicator"></span>' : '';
        
        // Добавляем анимацию появления
        div.style.animationDelay = `${index * 50}ms`;
        
        div.innerHTML = `
            <div class="user-avatar">
                <img src="${user.avatarUrl}" alt="${user.name}">
                ${onlineStatus}
            </div>
            <div class="user-info">
                <div class="user-name">${this.highlightMatch(user.name, '')}</div>
                <div class="user-username">@${this.highlightMatch(user.username, '')}</div>
                ${user.bio ? `<div class="user-bio">${this.truncateText(user.bio, 60)}</div>` : ''}
            </div>
            <div class="user-actions">
                <div class="user-status ${isOnline ? 'online' : 'offline'}">
                    ${isOnline ? 'В сети' : 'Офлайн'}
                </div>
            </div>
        `;
        
        // Добавляем CSS анимацию
        div.style.cssText += `
            opacity: 0;
            transform: translateY(10px);
            animation: slideInUp 0.3s ease-out forwards;
        `;
        
        return div;
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    renderLoadingState() {
        return `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <p>Поиск пользователей...</p>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="search-empty">
                <div class="empty-icon">🔍</div>
                <h3>Начните поиск</h3>
                <p>Введите имя или username пользователя</p>
                <div class="search-tips">
                    <h4>Советы по поиску:</h4>
                    <ul>
                        <li>Используйте @ для поиска по username</li>
                        <li>Можно искать по части имени</li>
                        <li>Поиск не чувствителен к регистру</li>
                    </ul>
                </div>
            </div>
        `;
    }

    renderNoResults(query) {
        return `
            <div class="search-no-results">
                <div class="empty-icon">😔</div>
                <h3>Ничего не найдено</h3>
                <p>По запросу "<strong>${query}</strong>" пользователи не найдены</p>
                <div class="search-suggestions">
                    <h4>Попробуйте:</h4>
                    <ul>
                        <li>Проверить правильность написания</li>
                        <li>Использовать более короткий запрос</li>
                        <li>Поиск по username с символом @</li>
                    </ul>
                </div>
            </div>
        `;
    }
}