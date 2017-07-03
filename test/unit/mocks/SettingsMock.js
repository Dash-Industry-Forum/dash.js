class SettingsMock {
    get() {
        return this.lastSettings;
    }
    
    update(s) {
        this.lastSettings = s
    }

    reset() {
        this.lastSettings = {};
    }
}

export default SettingsMock;
