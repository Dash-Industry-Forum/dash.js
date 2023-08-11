import FragmentRequest from '../../../src/streaming/vo/FragmentRequest.js';

function SwitchRequestHistoryMock() {
    this.getSwitchRequests = function () {
        return [{
            drops: 7,
            noDrops: 0,
            dropSize: 4
        }];
    };
}

function RulesContextMock() {
    this.getMediaInfo = function () {
    };

    this.getMediaType = function () {
        return 'video';
    };

    this.getCurrentRequest = function () {
        let fragRequest = new FragmentRequest();
        fragRequest.index = 1;

        return fragRequest;
    };
    this.getRepresentationInfo = function () {
    };
    this.getAbrController = function () {
        return {
        };
    };
    this.getSwitchHistory = function () {
        return new SwitchRequestHistoryMock();
    };
    this.getRepresentationInfo = function () {
        return {
            fragmentDuration: NaN
        };
    };

    this.getScheduleController = function () {
        return {
            start: function () {
            }
        };
    };

    this.getDroppedFramesHistory = function () {

    };

    this.getStreamInfo = function () {
        return {
            id: 1
        };
    };
}

export default RulesContextMock;
