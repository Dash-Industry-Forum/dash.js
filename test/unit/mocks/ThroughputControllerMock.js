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

    getArithmeticMean(values) {
        if (!values || values.length === 0) {
            return 0;
        }

        let sum = 0;
        values.forEach((entry) => {
            if (entry && typeof entry.value === 'number') {
                sum += entry.value;
            }
        });

        if (sum === 0) {
            return 0;
        }

        return sum / values.length;
    }

    setConfig() {

    }

    initialize() {

    }

    reset() {

    }
}

export default ThroughputControllerMock
