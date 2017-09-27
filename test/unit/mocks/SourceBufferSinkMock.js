class SourceBufferSinkMock {
    constructor(mediaSource, mediaInfo) {
        this.mediaSource = mediaSource;
        this.mediaInfo = mediaInfo;
        this.buffer = mediaSource.addBuffer(mediaInfo.codec);
        this.createError = false;
        
        this.reset(testType);
    }

    abort() {
        this.aborted = true;
    }

    append(buffer, chunk) {
        this.buffer.append(chunk.bytes);
    }

    getAllBufferRanges() {
       return buffer.buffered;
    }

    getBuffer() {
        return this.buffer;
    }

    removeSourceBuffer() {
        this.sourceBufferRemoved = true;
    }

    reset(testType) {
        this.defaultStreamType = testType;
        this.aborted = false;
        this.sourceBufferRemoved = false;
    }
}

export default SourceBufferSinkMock;
