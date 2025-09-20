// search.js
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
    }

    render() {
        this.container.innerHTML = `
            <div class="search-header">
                <input type="text" id="search-input" placeholder="Search users..." class="search-input">
                <button id="search-cancel-btn" class="search-cancel-btn">Cancel</button>
            </div>
            <div id="search-results" class="search-results">
                <p class="search-placeholder">Start typing to search users</p>
            </div>
        `;
    }

    setupEvents() {
        const searchInput = this.container.querySelector('#search-input');
        const cancelBtn = this.container.querySelector('#search-cancel-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            searchInput.focus();
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.app.leftPanel.goBack();
            });
        }
    }

    handleSearchInput(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
            this.showPlaceholder('Start typing to search users');
            return;
        }
        
        this.showLoading();
        
        this.searchTimeout = setTimeout(async () => {
            try {
                this.searchResults = await this.dataLoader.searchUsers(query);
                this.renderResults();
            } catch (error) {
                console.error('Search error:', error);
                this.showPlaceholder('Search error');
            }
        }, 300);
    }

    async renderResults() {
        const resultsContainer = this.container.querySelector('#search-results');
        
        if (this.searchResults.length === 0) {
            this.showPlaceholder('No users found');
            return;
        }
        
        resultsContainer.innerHTML = '';
        
        this.searchResults.forEach(user => {
            const userElement = this.renderer.createUserResult(user);
            resultsContainer.appendChild(userElement);
            
            // Add click handler
            userElement.addEventListener('click', () => {
                this.openUserProfile(user);
            });
        });
    }

    showPlaceholder(text) {
        const resultsContainer = this.container.querySelector('#search-results');
        resultsContainer.innerHTML = `<p class="search-placeholder">${text}</p>`;
    }

    showLoading() {
        const resultsContainer = this.container.querySelector('#search-results');
        resultsContainer.innerHTML = '<p class="search-placeholder">Searching...</p>';
    }

    openUserProfile(user) {
        window.app.leftPanel.loadComponent('profile', { 
            userId: user.id,
            from: 'search'
        });
    }

    destroy() {
        clearTimeout(this.searchTimeout);
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
    createUserResult(user) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.dataset.userId = user.id;
        
        div.innerHTML = `
            <div class="result-avatar">
                <img src="${user.avatarUrl}" alt="${user.name}">
            </div>
            <div class="result-info">
                <div class="result-name">${user.name}</div>
                <div class="result-username">@${user.username}</div>
            </div>
        `;
        
        return div;
    }
}
