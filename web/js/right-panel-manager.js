// right-panel-manager.js
class RightPanelManager {
    constructor(containerSelector, eventBus) {
        this.container = document.querySelector(containerSelector);
        this.eventBus = eventBus;
        this.components = {
            chat: new Chat(this.eventBus)
        };
        this.currentComponent = null;
        this.currentComponentName = null;
    }

    async loadComponent(componentName, data = null) {
        try {
            // Load HTML
            await this.loadHTML(componentName);
            
            // Get component
            const component = this.components[componentName];
            
            if (!component) {
                console.error(`Component ${componentName} not found`);
                return;
            }
            
            // Destroy previous component
            if (this.currentComponent && this.currentComponent.destroy) {
                this.currentComponent.destroy();
            }            
            // Initialize new one
            component.init(this.container, data);
            this.currentComponent = component;
            this.currentComponentName = componentName;
            
        } catch (error) {
            console.error('Error loading component:', error);
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
