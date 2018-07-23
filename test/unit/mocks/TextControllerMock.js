import TextBufferMock from './TextBufferMock';

class TextControllerMock {
    constructor() {
        this.buffers = [];
    }
    getTextSourceBuffer() {
        return new TextBufferMock();
    }
}

export default TextControllerMock;
