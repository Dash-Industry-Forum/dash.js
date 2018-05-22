class TextBufferMock {
    constructor() {
        this.updating = false;
        this.chunk = null;
    }

    appendBuffer(chunk) {
        this.updating = false;
        this.chunk = chunk;
    }
}

export default TextBufferMock;
