class RightPanelManager {
    constructor(containerSelector, eventBus) {
        console.log("rightPanelManager.constructor()")
        this.container = document.querySelector(containerSelector);
        this.eventBus = eventBus;
        this.components = {
            chat: new Chat(this.eventBus)
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