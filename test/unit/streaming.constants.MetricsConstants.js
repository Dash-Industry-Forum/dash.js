import MetricsConstants from '../../src/streaming/constants/MetricsConstants';

const expect = require('chai').expect;

describe('MetricsConstants', function () {
    it('MetricsConstants should exist', () => {
        expect(MetricsConstants).to.exist; // jshint ignore:line
        expect(MetricsConstants.TCP_CONNECTION).to.equal('TcpList');
        expect(MetricsConstants.HTTP_REQUEST).to.equal('HttpList');
        expect(MetricsConstants.TRACK_SWITCH).to.equal('RepSwitchList');
        expect(MetricsConstants.BUFFER_LEVEL).to.equal('BufferLevel');
        expect(MetricsConstants.BUFFER_STATE).to.equal('BufferState');
        expect(MetricsConstants.DVR_INFO).to.equal('DVRInfo');
        expect(MetricsConstants.DROPPED_FRAMES).to.equal('DroppedFrames');
        expect(MetricsConstants.SCHEDULING_INFO).to.equal('SchedulingInfo');
        expect(MetricsConstants.REQUESTS_QUEUE).to.equal('RequestsQueue');
        expect(MetricsConstants.MANIFEST_UPDATE).to.equal('ManifestUpdate');
        expect(MetricsConstants.MANIFEST_UPDATE_STREAM_INFO).to.equal('ManifestUpdatePeriodInfo');
        expect(MetricsConstants.MANIFEST_UPDATE_TRACK_INFO).to.equal('ManifestUpdateRepresentationInfo');
        expect(MetricsConstants.PLAY_LIST).to.equal('PlayList');
        expect(MetricsConstants.DVB_ERRORS).to.equal('DVBErrors');
    });
});
