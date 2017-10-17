import DashMetrics from '../../src/dash/DashMetrics';
import MpdHelper from './helpers/MPDHelper';
import ManifestModel from '../../src/streaming/models/ManifestModel';

const expect = require('chai').expect;

const context = {};
const mpdHelper = new MpdHelper();
const mpd = mpdHelper.getMpd('static');
const manifestModel = ManifestModel(context).getInstance();
const dashMetrics = DashMetrics(context).getInstance({dashManifestModel: {}, manifestModel: manifestModel });

manifestModel.setValue(mpd);

describe('DashMetrics', function () {

    it('should return null when getBandwidthForRepresentation is called and representationId and periodId are undefined', () => {
        const bdwth = dashMetrics.getBandwidthForRepresentation();

        expect(bdwth).to.be.null;  // jshint ignore:line
    });

    it('should return -1 when getIndexForRepresentation is called and representationId and periodIdx are undefined', () => {
        const index = dashMetrics.getIndexForRepresentation();

        expect(index).to.be.equal(-1);  // jshint ignore:line
    });

    it('should return -1 when getMaxIndexForBufferType is called and bufferType and periodIdx are undefined', () => {
        const index = dashMetrics.getMaxIndexForBufferType();

        expect(index).to.be.equal(-1);  // jshint ignore:line
    });

    it('should return null when getCurrentRepresentationSwitch is called and metrics is undefined', () => {
        const representation = dashMetrics.getCurrentRepresentationSwitch();

        expect(representation).to.be.null;  // jshint ignore:line
    });

    it('should return null when getLatestBufferLevelVO is called and metrics is undefined', () => {
        const bufferLevel = dashMetrics.getLatestBufferLevelVO();

        expect(bufferLevel).to.be.null;  // jshint ignore:line
    });

    it('should return 0 when getCurrentBufferLevel is called and metrics is undefined', () => {
        const bufferLevel = dashMetrics.getCurrentBufferLevel();

        expect(bufferLevel).to.be.equal(0);  // jshint ignore:line
    });

    it('should return null when getRequestsQueue is called and metrics is undefined', () => {
        const requestsQueue = dashMetrics.getRequestsQueue();

        expect(requestsQueue).to.be.null;  // jshint ignore:line
    });

    describe('getCurrentHttpRequest', () => {
        it('should return null when getCurrentHttpRequest is called and metrics is undefined', () => {
            const currentHttpRequest = dashMetrics.getCurrentHttpRequest();

            expect(currentHttpRequest).to.be.null;  // jshint ignore:line
        });

        it('should return null when getCurrentHttpRequest is called and metrics.httpList is undefined', () => {
            const metrics = {};
            const currentHttpRequest = dashMetrics.getCurrentHttpRequest(metrics);

            expect(currentHttpRequest).to.be.null;  // jshint ignore:line
        });
    });

    describe('getHttpRequests', () => {
        it('should return an empty array when getHttpRequests is called and metrics is undefined', () => {
            const httpRequestArray = dashMetrics.getHttpRequests();

            expect(httpRequestArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(httpRequestArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array when getHttpRequests is called and metrics.httpList is undefined', () => {
            const metrics = {};
            const httpRequestArray = dashMetrics.getHttpRequests(metrics);

            expect(httpRequestArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(httpRequestArray).to.be.empty;                // jshint ignore:line
        });
    });

    it('should return null when getCurrentDroppedFrames is called and metrics[MetricsList.DROPPED_FRAMES] is undefined', () => {
        const metrics = {};
        const httpRequestArray = dashMetrics.getCurrentDroppedFrames(metrics);

        expect(httpRequestArray).to.be.null;  // jshint ignore:line
    });

    describe('getLatestMPDRequestHeaderValueByID', () => {
        it('should return null when getLatestMPDRequestHeaderValueByID is called and metrics and id are undefined', () => {
            const lastMpdRequestHeader = dashMetrics.getLatestMPDRequestHeaderValueByID();

            expect(lastMpdRequestHeader).to.be.null;  // jshint ignore:line
        });

        it('should return null when getLatestMPDRequestHeaderValueByID is called and id is undefined', () => {
            const metrics = { HttpList: [{type: 'MPD', _responseHeaders: ''}, {type: 'MPD', _responseHeaders: ''}]};

            const lastMpdRequestHeader = dashMetrics.getLatestMPDRequestHeaderValueByID(metrics);

            expect(lastMpdRequestHeader).to.be.null;  // jshint ignore:line
        });
    });

    describe('getLatestFragmentRequestHeaderValueByID', () => {
        it('should return null when getLatestFragmentRequestHeaderValueByID is called and metrics and id are undefined', () => {
            const lastFragmentRequestHeader = dashMetrics.getLatestFragmentRequestHeaderValueByID();

            expect(lastFragmentRequestHeader).to.be.null;  // jshint ignore:line
        });

        it('should return null when getLatestFragmentRequestHeaderValueByID is called and httpRequest._responseHeaders and id are undefined', () => {
            const metrics = { HttpList: [{responsecode: 200}, {responsecode: 200}]};
            const lastFragmentRequestHeader = dashMetrics.getLatestFragmentRequestHeaderValueByID(metrics);

            expect(lastFragmentRequestHeader).to.be.null;  // jshint ignore:line
        });
    });
});
