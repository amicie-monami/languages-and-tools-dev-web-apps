class ProfileDataLoader {
    constructor(apiService) {
        this.apiService = apiService;
    }

    async getCurrentUserProfile() {
        try {
            return await this.apiService.getCurrentUser();
        } catch (error) {
            console.error('Error loading current user profile:', error);
            throw error;
        }
    }

    async getUserProfile(userId) {
        try {
            return await this.apiService.getUser(userId);
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw error;
        }
    }
}