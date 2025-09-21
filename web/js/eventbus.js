// central event management system for component communication
class EventBus {
    constructor() {
        console.log("eventbus.constructor()")
        this.events = {};
    }

    // registers event listener
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
        console.log(`EventBus.on(${eventName}) - now ${this.events[eventName].length} listeners`);
    }

    // removes event listener
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    // triggers all registered callbacks for the event with provided data
    // uses optional chaining to handle unregistered events gracefully
    emit(eventName, data) {
        const listenerCount = this.events[eventName]?.length || 0;
        console.log(`EventBus.emit(${eventName}) - ${listenerCount} listeners`, data);
        
        if (listenerCount > 1 && eventName === 'profile-requested') {
            console.warn(`Multiple listeners for ${eventName}! Stack trace:`);
            console.trace();
        }
        
        this.events[eventName]?.forEach((callback, index) => {
            console.log(`  Calling listener ${index} for ${eventName}`);
            callback(data);
        });
    }

    getListenerCounts() {
        const counts = {};
        Object.keys(this.events).forEach(eventName => {
            counts[eventName] = this.events[eventName].length;
        });
        return counts;
    }

    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }
}