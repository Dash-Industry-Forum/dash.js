function BufferMock() {
    this.initialized = false;
    this.bytes = undefined;
    this.length = 20;

    this.initialize = function () {
        this.initialized = true;
    };

    this.append = function (chunk) {
        this.bytes = chunk;
    };
}

class SourceBufferControllerMock {
    constructor(testType) {
        this.reset(testType);
    }

    createSourceBuffer() {
        if (!this.createError) {
            return this.buffer;
        } else {
            throw new Error('create error');
        }
    }

    abort() {
        this.aborted = true;
    }

    append(buffer, chunk) {
        this.buffer.append(chunk.bytes);
    }

    getBufferLength() {
        return this.buffer.length;
    }

    removeSourceBuffer() {
        this.sourceBufferRemoved = true;
    }

    reset(testType) {
        this.defaultStreamType = testType;
        this.aborted = false;
        this.sourceBufferRemoved = false;
        this.buffer = new BufferMock();
        this.createError = false;
    }
}

export default SourceBufferControllerMock;