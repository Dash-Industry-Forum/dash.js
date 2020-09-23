import CmcdModel from '../../src/streaming/models/CmcdModel';

import AbrControllerMock from './mocks/AbrControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';

//const expect = require('chai').expect;
const context = {};

describe('CmcdModel', function () {
    let cmcdModel;

    let abrControllerMock = new AbrControllerMock();
    let dashMetricsMock = new DashMetricsMock();
    let playbackControllerMock = new PlaybackControllerMock();

    beforeEach(function () {
        cmcdModel = CmcdModel(context).getInstance();
    });

    afterEach(function () {
        cmcdModel = null;
        cmcdModel.reset();
    });

    describe('if confgured', function () {
        beforeEach(function () {
            cmcdModel.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock
            });
        });

        it('getQueryParameter() returns correct metrics', function () {
            let request = {};
            cmcdModel.getQueryParameter(request);
        });
    });
});
