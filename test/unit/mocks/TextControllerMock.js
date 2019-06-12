import TextSourceBufferMock from './TextSourceBufferMock';

class TextControllerMock {
    constructor() {
        this.textEnabled = false;
        this.buffers = [];
    }
    getTextSourceBuffer() {
        return new TextSourceBufferMock();
    }
    isTextEnabled() {
        return this.textEnabled;
    }
    enableText(state) {
        this.textEnabled = state;
    }
    getTextDefaultEnabled() {
        return true;
    }
    addEmbeddedTrack() {}
}

export default TextControllerMock;
