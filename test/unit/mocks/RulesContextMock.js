import FragmentRequest from '../../../src/streaming/vo/FragmentRequest';

function switchRequestHistoryMock() {
    this.getSwitchRequests = function () {
        return [{drops: 7,
                noDrops: 0,
                dropSize: 4}];
    };
}

function RulesContextMock () {
    this.getMediaInfo = function () {
    };

    this.getMediaType = function () {
        return 'video';
    };

    this.getCurrentRequest = function () {
        let fragRequest =  new FragmentRequest();
        fragRequest.index = 1;

        return fragRequest;
    };
    this.getRepresentationInfo = function () {};
    this.getAbrController = function () {};
    this.getSwitchHistory = function () {
        return new switchRequestHistoryMock();
    };
    this.getRepresentationInfo = function () {
        return {
            fragmentDuration: NaN
        };
    };
}

export default RulesContextMock;