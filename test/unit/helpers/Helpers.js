class Helpers {

    constructor() {
        this.specHelper = undefined;
        this.objectsHelper = undefined;
        this.voHelper = undefined;
        this.mpdHelper = undefined;
    }

    setSpecHelper(value) {
        this.specHelper = value;
    }

    getSpecHelper() {
        return this.specHelper;
    }

    setMpdHelper(value) {
        this.mpdHelper = value;
    }

    getMpdHelper() {
        return this.mpdHelper;
    }

    setObjectsHelper(value) {
        this.objectsHelper = value;
    }

    getObjectsHelper() {
        return this.objectsHelper;
    }

    setVOHelper(value) {
        this.voHelper = value;
    }

    getVOHelper() {
        return this.voHelper;
    }
}

export default Helpers;
