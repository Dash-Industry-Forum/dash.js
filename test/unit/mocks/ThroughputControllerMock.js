class ThroughputControllerMock {

    constructor() {
        this.averageThroughput = 2000;
    }

    getAverageThroughput() {
        return this.averageThroughput;
    }

    setAverageThroughput(value) {
        this.averageThroughput = value;
    }

    getSafeAverageThroughput() {
        return this.averageThroughput;
    }

    setConfig() {

    }

    initialize() {

    }

    reset() {

    }
}

export default ThroughputControllerMock
