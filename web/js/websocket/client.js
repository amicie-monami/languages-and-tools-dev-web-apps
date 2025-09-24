// WebSocket клиент для real-time обновлений
class WebSocketClient {
    constructor(apiService, eventBus) {
        this.apiService = apiService;
        this.eventBus = eventBus;
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Начальная задержка 1 сек
        this.heartbeatInterval = null;
        this.baseUrl = this.getWebSocketUrl();
    }
    
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = '8000'; // WebSocket сервер на том же порту что и API
        return `${protocol}//${host}:${port}`;
    }
    
    async connect() {
        try {
            // Получаем токен из localStorage
            const session = JSON.parse(localStorage.getItem('messenger_session') || '{}');
            const token = session.access_token;
            
            if (!token) {
                console.error('WebSocket: No auth token found');
                return false;
            }
            
            const wsUrl = `${this.baseUrl}/ws/${token}`;
            console.log('WebSocket: Connecting to', wsUrl);
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('✅ WebSocket: Connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                
                // Запускаем heartbeat
                this.startHeartbeat();
                
                // Уведомляем приложение о подключении
                this.eventBus.emit('websocket-connected');
            };
            
            this.websocket.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            
            this.websocket.onclose = (event) => {
                console.log('❌ WebSocket: Disconnected', event.code, event.reason);
                this.isConnected = false;
                this.stopHeartbeat();
                
                // Уведомляем о разъединении
                this.eventBus.emit('websocket-disconnected');
                
                // Пытаемся переподключиться, если это не намеренное закрытие
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('💥 WebSocket error:', error);
                this.eventBus.emit('websocket-error', error);
            };
            
            return true;
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            return false;
        }
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('📨 WebSocket message received:', message);
            
            switch (message.type) {
                case 'new_message':
                    this.handleNewMessage(message.message);
                    break;
                    
                case 'message_edited':
                    this.handleMessageEdited(message.message);
                    break;
                    
                case 'message_deleted':
                    this.handleMessageDeleted(message.message);
                    break;
                    
                case 'user_status':
                    this.handleUserStatus(message);
                    break;
                    
                case 'message_received':
                    // Эхо от сервера - игнорируем или логируем
                    console.log('Server echo:', message);
                    break;
                    
                default:
                    console.log('Unknown WebSocket message type:', message.type);
            }
            
        } catch (error) {
            console.error('Error parsing WebSocket message:', error, data);
        }
    }
    
    handleNewMessage(messageData) {
        console.log('📢 New message received:', messageData);
        
        // Уведомляем компоненты о новом сообщении
        this.eventBus.emit('websocket-new-message', {
            chatId: messageData.chatId,
            message: messageData
        });
        
        // this.eventBus.emit('websocket-update-chats');
    }
    
    handleMessageEdited(messageData) {
        console.log('✏️ Message edited:', messageData);
        
        this.eventBus.emit('websocket-message-edited', {
            chatId: messageData.chatId,
            messageId: messageData.id,
            newText: messageData.text,
            editedAt: messageData.editedAt
        });
    }
    
    handleMessageDeleted(messageData) {
        console.log('🗑️ Message deleted:', messageData);
        
        this.eventBus.emit('websocket-message-deleted', {
            chatId: messageData.chatId,
            messageId: messageData.id
        });
    }
    
    handleUserStatus(statusData) {
        console.log('👤 User status changed:', statusData);
        
        this.eventBus.emit('websocket-user-status', {
            userId: statusData.user_id,
            isOnline: statusData.is_online
        });
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Экспоненциальная задержка
        
        console.log(`🔄 WebSocket: Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.websocket) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Heartbeat каждые 30 секунд
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    send(data) {
        if (this.isConnected && this.websocket) {
            try {
                this.websocket.send(JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                return false;
            }
        }
        return false;
    }
    
    disconnect() {
        console.log('WebSocket: Manual disconnect');
        this.stopHeartbeat();
        
        if (this.websocket) {
            this.websocket.close(1000, 'Manual disconnect');
            this.websocket = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = this.maxReconnectAttempts; // Предотвращаем автоматическое переподключение
    }
    
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}