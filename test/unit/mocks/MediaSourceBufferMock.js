class TimeRangesMock {
    constructor() {
        this.ranges = [];
        this.length = this.ranges.length;
    }

    start(index) {
        return this.ranges[index] ? this.ranges[index].start : null;
    }
    end(index) {
        return this.ranges[index] ? this.ranges[index].end : null;
    }

    addRange(range) {
        this.ranges.push(range);
        this.length = this.ranges.length;
    }
}
class MediaSourceBufferMock {
    constructor() {
        this.buffered = new TimeRangesMock();
        this.updating = false;
        this.chunk = null;
        this.aborted = false;
        this.timestampOffset = 1;
    }

    addRange(range) {
        this.buffered.addRange(range);
    }

    remove() {
        this.updating = true;
        this.chunk = null;

        let that = this;
        setTimeout(function () {
            that.updating = false;
        }, 500);
    }

    appendBuffer(chunk) {
        this.updating = true;
        this.chunk = chunk;

        let that = this;
        setTimeout(function () {
            that.updating = false;
        }, 500);
    }

    updateTimestampOffset(timestampOffset) {
        this.timestampOffset = timestampOffset;
        setTimeout(() => {
            this.updating = false;
        }, 500);
    }

    abort() {
        this.aborted = true;
    }
}

export default MediaSourceBufferMock;
