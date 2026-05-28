/**
 * Mock implementation of CmcdConfigAccessor for unit tests
 */
function CmcdConfigAccessorMock() {
    let manifestParams = null;
    let mockData = {};

    this.setManifestParams = function (params) {
        manifestParams = params;
    };

    this.get = function (property, options) {
        if (mockData.hasOwnProperty(property)) {
            return mockData[property];
        }
        return options && options.defaultValue !== undefined ? options.defaultValue : undefined;
    };

    this.has = function (property) {
        return mockData.hasOwnProperty(property) && mockData[property] !== null && mockData[property] !== undefined;
    };

    this.getVersion = function () {
        return this.get('version', { defaultValue: 1 });
    };

    this.isEnabled = function () {
        return this.get('enabled', { defaultValue: false });
    };

    this.getEventTargets = function () {
        const version = this.getVersion();
        if (version !== 2) {
            return [];
        }
        const targets = this.get('eventTargets');
        return Array.isArray(targets) ? targets : [];
    };

    this.getEventTarget = function (index) {
        const targets = this.getEventTargets();
        if (index < 0 || index >= targets.length) {
            return null;
        }

        const self = this;
        return {
            get: function (property) {
                return self.get(property, { targetIndex: index });
            },
            has: function (property) {
                const value = self.get(property, { targetIndex: index });
                return value !== null && value !== undefined;
            },
            index: index,
            raw: targets[index]
        };
    };

    this.reset = function () {
        manifestParams = null;
        mockData = {};
    };

    // Test helper methods
    this.setMockData = function (data) {
        mockData = data;
    };

    this.getMockData = function () {
        return mockData;
    };

    this.getManifestParams = function () {
        return manifestParams;
    };
}

export default CmcdConfigAccessorMock;
