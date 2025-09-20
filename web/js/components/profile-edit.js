// profile-editor.js
class ProfileEditor {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.container = null;
        this.userData = null;
        this.originalData = null;
    }

    async init(container, data) {
        this.container = container;
        this.userData = window.mockDataService.getCurrentUser();
        this.originalData = { ...this.userData };
        
        this.render();
        this.setupEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="profile-editor">
                <div class="editor-header">
                    <h3>Edit profile</h3>
                </div>
                
                <div class="avatar-editor">
                    <div class="avatar-preview">
                        <img src="${this.userData.avatarUrl}" alt="Avatar" id="avatar-preview">
                    </div>
                    <button class="btn" id="change-avatar-btn">Change avatar</button>
                </div>
                
                <form id="profile-form" class="profile-form">
                    <div class="form-group">
                        <label for="name">Name</label>
                        <input type="text" id="name" name="name" value="${this.userData.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" value="${this.userData.username}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="bio">Bio</label>
                        <textarea id="bio" name="bio" rows="3">${this.userData.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" name="phone" value="${this.userData.phone}">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="${this.userData.email}">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save changes</button>
                    </div>
                </form>
            </div>
        `;
    }

    setupEvents() {
        const form = this.container.querySelector('#profile-form');
        const cancelBtn = this.container.querySelector('#cancel-btn');
        const changeAvatarBtn = this.container.querySelector('#change-avatar-btn');
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.app.leftPanel.goBack();
            });
        }
        
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                this.changeAvatar();
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updates = {
            name: formData.get('name'),
            username: formData.get('username'),
            bio: formData.get('bio'),
            phone: formData.get('phone'),
            email: formData.get('email')
        };
        
        try {
            await this.saveChanges(updates);
            this.eventBus.emit('profile-updated');
            window.app.leftPanel.goBack();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error saving profile changes');
        }
    }

    async saveChanges(updates) {
        // In real app - API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update mock data
        Object.assign(this.userData, updates);
        
        // Update local storage or send to server in real app
        console.log('Profile updated:', updates);
    }

    changeAvatar() {
        // In real app - open file picker and upload
        alert('Avatar change functionality would be implemented here');
    }

    destroy() {
        // Cleanup if needed
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});