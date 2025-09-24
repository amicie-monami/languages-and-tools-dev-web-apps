class RightPanelManager {
    constructor(containerSelector, eventBus, apiService, userService) {
        console.log("[RightPanelManager] constructor()")
        this.container = document.querySelector(containerSelector);
        this.eventBus = eventBus;
       
        this.components = {
            chat: new Chat(this.eventBus, apiService, userService)
        };
       
        this.currentComponent = null;
        this.currentComponentName = null;
    }

    // loads and initializes right panel components
    async loadComponent(componentName, data = null) {
        try {
            await this.loadHTML(componentName);
            
            const component = this.components[componentName];
            
            if (!component) {
                console.error(`Component ${componentName} not found`);
                return;
            }
            
            // cleans up previous component instance
            if (this.currentComponent && this.currentComponent.destroy) {
                this.currentComponent.destroy();
            }            
            
            component.init(this.container, data);
            this.currentComponent = component;
            this.currentComponentName = componentName;
            
        } catch (error) {
            console.error('Component loading error:', error);
            this.container.innerHTML = '<p>Loading error</p>';
        }
    }

    async loadHTML(componentName) {
        const response = await fetch(`html/${componentName}.html`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        this.container.innerHTML = html;
    }

    // Добавить в RightPanelManager:
    clear() {
        console.log('RightPanelManager: Clearing panel');
        
        if (this.currentComponent && this.currentComponent.destroy) {
            console.log(`RightPanelManager: Destroying component ${this.currentComponentName}`);
            this.currentComponent.destroy();
        }
        
        this.currentComponent = null;
        this.currentComponentName = null;
        
        // Показать пустое состояние
        this.container.innerHTML = `
            <div class="empty-state" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #888;
            ">
                <h3>Выберите чат</h3>
                <p>Выберите существующий чат или начните новый разговор</p>
            </div>
        `;
    }

    // displays default state when no chat is selected
    showEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <h3>Select a chat</h3>
                <p>Choose a chat from the list to start messaging</p>
            </div>
        `;
    }

    getCurrentComponent() {
        return this.currentComponent;
    }
}