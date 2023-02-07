class SpecHelper {
    constructor() {
        this.EVENT_NOTIFICATION_DELAY = 200;
        this.TIMEOUT_DELAY = 2000;
        this.isHtmlRunner = false; //window.location.href.indexOf("runner.html") > 0;
        this.dummyUrl = "http://dummyUrl.com";
        this.dummyView = {};
    }

    isHtmlRunner() {
        return this.isHtmlRunner;
    }

    getDummyView() {
        return this.dummyView;
    }

    getDummyUrl() {
        return this.dummyUrl;
    }

    getExecutionDelay() {
        return this.EVENT_NOTIFICATION_DELAY;
    }

    getTimeoutDelay() {
        return this.TIMEOUT_DELAY;
    }

    getUnixTime() {
        return new Date("01/01/1970 GMT");
    }
}

export default SpecHelper
