import FragmentRequest from '../../../src/streaming/vo/FragmentRequest.js';

function SwitchRequestHistoryMock() {
    this.getSwitchRequests = function () {
        return {
            1: {
                drops: 10,
                noDrops: 0,
                dropSize: 4
            }
        };
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
    this.getVoRepresentation = function () {
    };
    this.getAbrController = function () {
        return {
            getPossibleVoRepresentationsFilteredBySettings: function () {
                return [{ id: 1 }]
            }
        };
    };
    this.getSwitchRequestHistory = function () {
        return new SwitchRequestHistoryMock();
    };
    this.getVoRepresentation = function () {
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
