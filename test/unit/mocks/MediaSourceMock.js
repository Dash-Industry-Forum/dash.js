import MediaSourceBufferMock from './MediaSourceBufferMock';

class MediaSourceMock {
    constructor() {
        this.buffers = [];
        this.readyState = 'open';
    }

    addSourceBuffer(codec) {
        if (this.forceError) {
            throw new Error('Unit test forced error');
        }

        if (codec.match(/text/i)) {
            throw new Error('not really supported');
        }

        if (codec.match(/unknown/i)) {
            throw new Error('unknown');
        }
        let buffer = new MediaSourceBufferMock();
        this.buffers.push(buffer);
        return buffer;
    }

    removeSourceBuffer(buffer) {
        let index = this.buffers.indexOf(buffer);

        if (index === -1) {
            return;
        }

        this.buffers.splice(index, 1);
    }
}

export default MediaSourceMock;
