// left-panel-manager.js
class LeftPanelManager {
    constructor(containerSelector, eventBus) {
        this.container = document.querySelector(containerSelector);
        this.eventBus = eventBus;
        this.components = {
            chatsList: new ChatsList(this.eventBus),
            profile: new Profile(this.eventBus),
            search: new Search(this.eventBus),
            profileEditor: new ProfileEditor(this.eventBus)
        };
        this.currentComponent = null;
        this.currentComponentName = null;
        this.navigationStack = []; 
    }

    async loadComponent(componentName, data = null) {
        try {
            // Add to stack if component is different OR data has changed
            if (this.currentComponentName && 
                (this.currentComponentName !== componentName || 
                JSON.stringify(this.currentComponentData) !== JSON.stringify(data))) {
                
                this.navigationStack.push({
                    name: this.currentComponentName,
                    data: this.currentComponentData
                });
            }
            
            await this.loadHTML(componentName);
            
            const component = this.components[componentName];
            
            if (!component) {
                console.error(`Component ${componentName} not found`);
                return;
            }
            
            if (this.currentComponent) {
                this.currentComponent.destroy();
            }
            
            component.init(this.container, data);
            this.currentComponent = component;
            this.currentComponentName = componentName;
            this.currentComponentData = data; 
            
        } catch (error) {
            console.error('Error loading component:', error);
            this.container.innerHTML = '<p>Loading error</p>';
        }
    }

    async goBack() {
        if (this.navigationStack.length === 0) {
            // If stack is empty - go to chats list
            await this.loadComponent('chatsList');
            return;
        }

        const previous = this.navigationStack.pop();
        
        // Load previous component WITHOUT adding to stack
        await this.loadHTML(previous.name);
        
        const component = this.components[previous.name];
        
        if (this.currentComponent) {
            this.currentComponent.destroy();
        }
        
        component.init(this.container, previous.data);
        this.currentComponent = component;
        this.currentComponentName = previous.name;
        this.currentComponentData = previous.data;
    }

    // Clear navigation stack (e.g., when going to main screen)
    clearNavigationStack() {
        this.navigationStack = [];
    }

    async loadHTML(componentName) {
        const response = await fetch(`html/${componentName}.html`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        this.container.innerHTML = html;
    }

    refreshCurrentComponent() {
        if (this.currentComponent && this.currentComponent.refresh) {
            this.currentComponent.refresh();
        }
    }

    getCurrentComponent() {
        return this.currentComponent;
    }

    getCurrentComponentName() {
        return this.currentComponentName;
    }
}