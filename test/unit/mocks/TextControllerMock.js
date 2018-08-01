import TextBufferMock from './TextBufferMock';

class TextControllerMock {
    constructor() {
        this.buffers = [];
    }
    getTextSourceBuffer() {
        return new TextBufferMock();
    }
    isTextEnabled() {
        return false;
    }
}

export default TextControllerMock;
