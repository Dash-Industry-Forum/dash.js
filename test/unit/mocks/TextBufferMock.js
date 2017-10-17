class TextBufferMock {
    constructor() {
        this.updating = false;
        this.chunk = null;
    }

    appendBuffer(chunk) {
        this.updating = true;
        this.chunk = chunk;

        let that = this;
        setTimeout(function () {
            that.updating = false;
        }, 500);
    }
}

export default TextBufferMock;