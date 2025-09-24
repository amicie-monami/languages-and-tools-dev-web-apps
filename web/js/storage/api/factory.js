// Factory для создания API сервиса
class ApiServiceFactory {
    static create(type = 'local', config = {}) {
        switch (type) {
            case 'local':
                return new LocalApiService();
            case 'http':
                return new HttpApiService(config.baseUrl || 'http://localhost:3000/api');
            default:
                throw new Error(`Unknown API service type: ${type}`);
        }
    }
}

// Глобальный экземпляр API сервиса
// Можно легко переключать между локальным и удаленным API
// window.apiService = ApiServiceFactory.create('local'); // или 'http'

// Для переключения в рантайме:
// window.apiService = ApiServiceFactory.create('http', { baseUrl: 'https://api.messenger.com' });