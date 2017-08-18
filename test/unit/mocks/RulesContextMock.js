import FragmentRequest from '../../../src/streaming/vo/FragmentRequest';

function RulesContextMock () {
    this.getMediaInfo = function() {

    };
    this.getMediaType = function() {
        return 'video';
    };
    this.getCurrentRequest = function() {
        let fragRequest =  new FragmentRequest();
        fragRequest.index = 1;

        return fragRequest;
    };    
    this.getTrackInfo = function() {};
    this.getAbrController = function() {};
}

export default RulesContextMock;