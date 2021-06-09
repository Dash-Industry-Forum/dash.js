import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

import FetchLoader from '../../src/streaming/net/FetchLoader';
import LowLatencyThroughputModel from '../../src/streaming/models/LowLatencyThroughputModel';
import BoxParser from '../../src/streaming/utils/BoxParser';

const patterns = {
    pattern0: {
        url: 'http://localhost:9876/ll/pattern0',
        interval: 0,
        chunksPerInterval: 0,
        chunksAvailableOnRequest: 60,
    },
    pattern1: {
        url: 'http://localhost:9876/ll/pattern1',
        interval: 33,
        chunksPerInterval: 1,
        chunksAvailableOnRequest: 0,
        expectedDLTimeMin: 2002 * 0.7 - 33,
        expectedDLTimeMax: 2002 * 1.1 - 33
    },
    pattern2: {
        url: 'http://localhost:9876/ll/pattern2',
        interval: 133,
        chunksPerInterval: 4,
        chunksAvailableOnRequest: 0
    },
    pattern3: {
        url: 'http://localhost:9876/ll/pattern3',
        interval: 333,
        chunksPerInterval: 10,
        chunksAvailableOnRequest: 0
    },
    pattern4: {
        url: 'http://localhost:9876/ll/pattern4',
        interval: 1000,
        chunksPerInterval: 30,
        chunksAvailableOnRequest: 0
    },
    pattern5: {
        url: 'http://localhost:9876/ll/pattern5',
        interval: 33,
        chunksPerInterval: 1,
        chunksAvailableOnRequest: 30
    },
    pattern6: {
        url: 'http://localhost:9876/ll/pattern6',
        interval: 133,
        chunksPerInterval: 4,
        chunksAvailableOnRequest: 30
    },
    pattern7: {
        url: 'http://localhost:9876/ll/pattern7',
        interval: 333,
        chunksPerInterval: 10,
        chunksAvailableOnRequest: 30
    },
    pattern8: {
        url: 'http://localhost:9876/ll/pattern8',
        interval: 1000,
        chunksPerInterval: 30,
        chunksAvailableOnRequest: 30
    },
    pattern11: {
        url: 'http://localhost:9876/ll/pattern11',
        interval: 40,
        chunksPerInterval: 1,
        chunksAvailableOnRequest: 0,
        expectedDLTimeMin: 2002,
        expectedDLTimeMax: 40 * 61
    }
}

describe('FetchLoader implementation', () => {

    // throughput calculation tests
    [Constants.ABR_FETCH_THROUGHPUT_CALCULATION_DOWNLOADED_DATA,
    Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING,
    Constants.ABR_FETCH_THROUGHPUT_CALCULATION_FAME].forEach(calculationMode => {
        ['pattern1'].forEach((pname)=>{
            let pattern = patterns[pname];

            it(`should calculate the proper download time if near life edge, mode: ${calculationMode} and ${pname}`, (done) => {
                let isDone = false;

                const context = {};

                const settings = Settings(context).getInstance();

                settings.update({
                    streaming: {
                        abr: {
                            fetchThroughputCalculationMode: calculationMode
                        }
                    }
                });
                const lowLatencyThroughputModel = LowLatencyThroughputModel(context).getInstance();
                lowLatencyThroughputModel.setConfig({
                    dashMetrics: {
                        getCurrentBufferLevel: function () { return 1; }
                    }
                });
                const fetchLoader = FetchLoader(context).create({
                    lowLatencyThroughputModel,
                    boxParser: BoxParser(context).getInstance()
                });

                let lastEmittedDownloadtime = 0;

                const httpRequest = {
                    url: pattern.url,
                    method: 'GET',
                    onload: function () {

                    },
                    onend: () => {
                        console.log(calculationMode, pname, lastEmittedDownloadtime);
                        // with tolerance
                        expect(lastEmittedDownloadtime).to.be.within(pattern.expectedDLTimeMin, pattern.expectedDLTimeMax, `expected download time in ms`);
                        if (!isDone) {
                            done();
                        }
                    },
                    onerror: (e) => { console.error(e); isDone = true; done(e) },
                    progress: (p) => {
                        if (p.loaded && p.loaded === p.total && p.time) {
                            lastEmittedDownloadtime = p.time;
                        }
                    },
                    onabort: (p) => console.log('onabort', p),
                    request: {
                        mediaType: 'video',
                        duration: 2,
                        representationId: 0,
                        mediaInfo: {
                            bitrateList: [
                                { id: 0, bandwidth: 300000 }
                            ]
                        },
                        availabilityStartTime: new Date()
                    }
                };

                fetchLoader.load(httpRequest);

            }).timeout(5000);
        });
    });
});