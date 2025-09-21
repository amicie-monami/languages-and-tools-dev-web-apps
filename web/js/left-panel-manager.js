class LeftPanelManager {
    constructor(containerSelector, eventBus) {
        this.container = document.querySelector(containerSelector);
        this.eventBus = eventBus;
        this.components = {
            'chats-list': new ChatsList(this.eventBus),
            'profile': new Profile(this.eventBus),
            'search': new Search(this.eventBus),
            'profile-editor': new ProfileEditor(this.eventBus)
        };
        this.currentComponent = null;
        this.currentComponentName = null;
        this.navigationStack = []; // maintains navigation history for back functionality
        console.log("leftPanelManager.constructor()")
        this.TEMPORARY_COMPONENTS = ['profile-editor', 'search']; 
    }

    

    logNavigationStack(message = "") {
        console.log(`${message} Navigation stack (${this.navigationStack.length} items):`);
        if (this.navigationStack.length === 0) {
            console.log("   Stack is empty");
            return;
        }
        
        this.navigationStack.forEach((item, index) => {
            console.log(`   [${index}]: ${JSON.stringify(item)}`);
        });
        console.log(`   Top: ${JSON.stringify(this.navigationStack[this.navigationStack.length - 1])}`);
    }

    // loads and initializes component with navigation stack management
    // async loadComponent(componentName, data = null) {
    //     console.log(`LeftPanelManager: Loading component ${componentName}`);
    //     this.logNavigationStack(`Before loading ${componentName}`);
    
    //     try {
    //         // cleanup last component
    //         if (this.currentComponent && this.currentComponent.destroy) {
    //             console.log(`LeftPanelManager: Destroying previous component ${this.currentComponentName}`);
    //             this.currentComponent.destroy();
    //             this.currentComponent = null; 
    //         }

    //         // pushes to stack only if component or data differs from current
    //         if (this.currentComponentName && 
    //                 (this.currentComponentName !== componentName || JSON.stringify(this.currentComponentData) !== JSON.stringify(data))) {
    //                     this.navigationStack.push({
    //                         name: this.currentComponentName,
    //                         data: this.currentComponentData
    //                     });
    //         }
            
    //         await this.loadHTML(componentName);
    //         const component = this.components[componentName];

    //         if (!component) {
    //             console.error(`Component ${componentName} not found`);
    //             return;
    //         }
            
    //         // cleans up previous component before initializing new one
    //         if (this.currentComponent) this.currentComponent.destroy();

    //         console.log(`LeftPanelManager: Initializing component ${componentName}`);
    //         component.init(this.container, data);
    //         this.currentComponent = component;
    //         this.currentComponentName = componentName;
    //         this.currentComponentData = data;

    //     } catch (error) {
    //         console.error('Component loading error:', error);
    //         this.container.innerHTML = '<p>Loading error</p>';
    //     }
    //     this.logNavigationStack(`After loading ${componentName}`);
    // }

    async loadComponent(componentName, data = null) {
        console.log(`LeftPanelManager: Loading component ${componentName}`);
        this.logNavigationStack(`Before loading ${componentName}`);
        
        try {
            // ИСПРАВЛЕНИЕ: НЕ добавляем в стек если загружается тот же компонент
            const isSameComponent = this.currentComponentName === componentName;
            const isSameData = JSON.stringify(this.currentComponentData) === JSON.stringify(data);
            
            console.log(`Same component: ${isSameComponent}, Same data: ${isSameData}`);
            
            // cleanup предыдущего компонента ПЕРЕД загрузкой HTML
            if (this.currentComponent && this.currentComponent.destroy) {
                console.log(`LeftPanelManager: Destroying previous component ${this.currentComponentName}`);
                this.currentComponent.destroy();
                this.currentComponent = null;
            }
    
            // ДОБАВЛЯЕМ В СТЕК только если это действительно новый компонент/данные
            const shouldAddToStack = this.currentComponentName && 
                                        (!isSameComponent || !isSameData) &&
                                            !this.TEMPORARY_COMPONENTS.includes(this.currentComponentName);
            
            if (shouldAddToStack) {
                console.log(`Adding to stack: ${this.currentComponentName} with data:`, this.currentComponentData);
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
            
            console.log(`LeftPanelManager: Initializing component ${componentName}`);
            component.init(this.container, data);
            this.currentComponent = component;
            this.currentComponentName = componentName;
            this.currentComponentData = data;
    
        } catch (error) {
            console.error('Component loading error:', error);
            this.container.innerHTML = '<p>Loading error</p>';
        }
        this.logNavigationStack(`After loading ${componentName}`);
    }

    async goBack() {
        this.logNavigationStack(`LeftPanelManager: goBack from ${this.currentComponentName}`);
        
        if (this.navigationStack.length === 0) {
            console.log('LeftPanelManager: Stack empty, loading chatsList');
            await this.loadComponent('chats-list');
            return;
        }
    
        const previous = this.navigationStack.pop();
        console.log(`LeftPanelManager: Going back to ${previous.name}`);
        
        // cleanup текущего компонента
        if (this.currentComponent && this.currentComponent.destroy) {
            console.log(`LeftPanelManager: Destroying current component ${this.currentComponentName}`);
            this.currentComponent.destroy();
            this.currentComponent = null;
        }
        
        await this.loadHTML(previous.name);
        const component = this.components[previous.name];
        
        console.log(`LeftPanelManager: Reinitializing component ${previous.name}`);
        component.init(this.container, previous.data);
        this.currentComponent = component;
        this.currentComponentName = previous.name;
        this.currentComponentData = previous.data;
        
        // ИСПРАВЛЕНИЕ: Если вернулись к chatsList, очищаем весь стек
        if (previous.name === 'chats-list') {
            console.log('LeftPanelManager: Clearing navigation stack - back to root');
            this.navigationStack = [];
        }
    }

    updateChatInList(data) {
        const currentComponent = this.getCurrentComponent(); // ← Убрать .leftPanel
        if (currentComponent && currentComponent.constructor.name === 'ChatsList') {
            if (typeof currentComponent.updateSingleChat === 'function') {
                currentComponent.updateSingleChat(data.chatId, data.message);
            }
        }
    }

    clearNavigationStack() {
        this.navigationStack = [];
    }

    // loads HTML template for the component
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