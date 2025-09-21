// Обновленный SearchDataLoader с API
class SearchDataLoader {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async searchUsers(query) {
        try {
            return await this.apiService.searchUsers(query);
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    async searchGlobal(query) {
        // Для будущего расширения - поиск по сообщениям, чатам и т.д.
        try {
            return await this.apiService.globalSearch(query);
        } catch (error) {
            console.error('Error in global search:', error);
            throw error;
        }
    }
}