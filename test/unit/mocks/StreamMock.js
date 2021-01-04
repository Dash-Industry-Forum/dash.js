import StreamProcessorMock from './StreamProcessorMock';

const TYPE_AUDIO = 'audio';
const TYPE_VIDEO = 'video';

function StreamMock () {
    this.streamProcessors = [
        new StreamProcessorMock(TYPE_VIDEO),
        new StreamProcessorMock(TYPE_AUDIO)
    ];

    this.getStreamInfo = function () {
        return {};
    };

    this.getFragmentController = function () {
        return { getModel: () => {
            return { setStreamProcessor: () => {} };
        } };
    };

    this.getProcessors = function () {
        return this.streamProcessors;
    };
}

export default StreamMock;
