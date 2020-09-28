import CmcdModel from '../../src/streaming/models/CmcdModel';
import Settings from '../../src/core/Settings';
import {HTTPRequest} from '../../src/streaming/vo/metrics/HTTPRequest';

import AbrControllerMock from './mocks/AbrControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';

const expect = require('chai').expect;
const context = {};

describe('CmcdModel', function () {
    let cmcdModel;

    let abrControllerMock = new AbrControllerMock();
    let dashMetricsMock = new DashMetricsMock();
    let playbackControllerMock = new PlaybackControllerMock();

    let settings = Settings(context).getInstance();
    settings.update({ streaming: { cmcd: { enabled: true }}});

    beforeEach(function () {
        cmcdModel = CmcdModel(context).getInstance();
    });

    afterEach(function () {
        cmcdModel.reset();
        cmcdModel = null;
        abrControllerMock.setTopBitrateInfo(null);
    });

    describe('if confgured', function () {
        beforeEach(function () {
            cmcdModel.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock
            });
        });

        it('getQueryParameter() returns correct metrics for MPD', function () {
            const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
            const MEDIA_TYPE = 'video';
            const MANIFEST_OBJECT_TYPE = 'm';

            let request = {
                type: REQUEST_TYPE,
                mediaType: MEDIA_TYPE
            };

            let parameters = cmcdModel.getQueryParameter(request);
            expect(parameters).to.have.property('key');
            expect(parameters.key).to.equal('CMCD');
            expect(parameters).to.have.property('value');
            expect(typeof parameters.value).to.equal('string');

            let metrics = parseQuery(parameters.value);
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('cid');
            expect(metrics).to.have.property('ot');
            expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
        });

        it('getQueryParameter() returns correct metrics for init segments', function () {
            const REQUEST_TYPE = HTTPRequest.INIT_SEGMENT_TYPE;
            const MEDIA_TYPE = 'video';
            const MANIFEST_OBJECT_TYPE = 'i';

            let request = {
                type: REQUEST_TYPE,
                mediaType: MEDIA_TYPE
            };

            let parameters = cmcdModel.getQueryParameter(request);
            expect(parameters).to.have.property('key');
            expect(parameters.key).to.equal('CMCD');
            expect(parameters).to.have.property('value');
            expect(typeof parameters.value).to.equal('string');

            let metrics = parseQuery(parameters.value);
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('cid');
            expect(metrics).to.have.property('ot');
            expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
            expect(metrics).to.have.property('su');
            expect(metrics.su).to.equal(true);
        });

        it('getQueryParameter() returns correct metrics for media segments', function () {
            const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
            const MEDIA_TYPE = 'video';
            const BITRATE = 10000;
            const DURATION = 987.213;
            const TOP_BITRATE = 20000;
            const MEASURED_THROUGHPUT = 8327641;
            const BUFFER_LEVEL = parseInt(dashMetricsMock.getCurrentBufferLevel() * 10) * 100;
            const VIDEO_OBJECT_TYPE = 'v';

            abrControllerMock.setTopBitrateInfo({ bitrate: TOP_BITRATE });
            abrControllerMock.setThroughputHistory({ getSafeAverageThroughput: function () { return MEASURED_THROUGHPUT; }});
            let request = {
                type: REQUEST_TYPE,
                mediaType: MEDIA_TYPE,
                quality: 0,
                mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] },
                duration: DURATION
            };

            let parameters = cmcdModel.getQueryParameter(request);
            expect(parameters).to.have.property('key');
            expect(parameters.key).to.equal('CMCD');
            expect(parameters).to.have.property('value');
            expect(typeof parameters.value).to.equal('string');

            let metrics = parseQuery(parameters.value);
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('cid');
            expect(metrics).to.have.property('br');
            expect(metrics.br).to.equal(parseInt(BITRATE / 1000));
            expect(metrics).to.have.property('ot');
            expect(metrics.ot).to.equal(VIDEO_OBJECT_TYPE);
            expect(metrics).to.have.property('d');
            expect(metrics.d).to.equal(parseInt(DURATION * 1000));
            expect(metrics).to.have.property('mtp');
            expect(metrics.mtp).to.equal(parseInt(MEASURED_THROUGHPUT / 100) * 100);
            expect(metrics).to.have.property('dl');
            expect(metrics.dl).to.equal(BUFFER_LEVEL);
            expect(metrics).to.have.property('bl');
            expect(metrics.bl).to.equal(BUFFER_LEVEL);
            expect(metrics).to.have.property('tb');
            expect(metrics.tb).to.equal(TOP_BITRATE);
        });

        it('getQueryParameter() returns correct metrics for other type', function () {
            const REQUEST_TYPE = HTTPRequest.OTHER_TYPE;
            const MEDIA_TYPE = 'video';
            const MANIFEST_OBJECT_TYPE = 'o';

            let request = {
                type: REQUEST_TYPE,
                mediaType: MEDIA_TYPE
            };

            let parameters = cmcdModel.getQueryParameter(request);
            expect(parameters).to.have.property('key');
            expect(parameters.key).to.equal('CMCD');
            expect(parameters).to.have.property('value');
            expect(typeof parameters.value).to.equal('string');

            let metrics = parseQuery(parameters.value);
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('cid');
            expect(metrics).to.have.property('ot');
            expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
        });
    });
});

function parseQuery(query) {
    query = decodeURIComponent(query);
    let keyValues = query.split(',');
    return keyValues.map(keyValue => keyValue.indexOf('=') === -1 ? [keyValue, true] : keyValue.split('='))
        .map(keyValue => isInt(keyValue[1]) ? [keyValue[0], parseInt(keyValue[1])] : keyValue)
        .map(keyValue => isString(keyValue[1]) && keyValue[1].indexOf('"') !== -1 ? [keyValue[0], keyValue[1].replace(/"/g, '')] : keyValue)
        .map(keyValue => isBoolean(keyValue[1]) ? [keyValue[0], parseBoolean(keyValue[1])] : keyValue)
        .reduce((acc, keyValue) => { acc[keyValue[0]] = keyValue[1]; return acc; }, {});
}

function isInt(value) {
    if (typeof value === 'boolean') return false;
    return !isNaN(value);
}

function isString(value) {
    return typeof value === 'string';
}

function isBoolean(value) {
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
    return typeof value === 'boolean';
}

function parseBoolean(value) {
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return !!value;
}
