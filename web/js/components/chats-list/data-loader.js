class ChatsListDataLoader {
    constructor(apiService) {
        this.apiService = apiService;
    }
    
    async getAll(offset = 0, limit = 50) {
        return await this.apiService.getChats(offset, limit);
    }
}