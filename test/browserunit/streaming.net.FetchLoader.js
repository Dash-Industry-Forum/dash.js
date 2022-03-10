import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

import FetchLoader from '../../src/streaming/net/FetchLoader';
import LowLatencyThroughputModel from '../../src/streaming/models/LowLatencyThroughputModel';
import BoxParser from '../../src/streaming/utils/BoxParser';

const patterns = {
    pattern0: {
        url: 'http://localhost:9876/ll/pattern0',
        text: 'download mode: request time after AAST + segment duration',
        interval: 0,
        chunksPerInterval: 0,
        chunksAvailableOnRequest: 60,
        expectedDLTimeMin: 0.1,
        expectedDLTimeMax: 250
    },
    pattern1: {
        url: 'http://localhost:9876/ll/pattern1',
        interval: 33,
        text: 'ideal encoder: one frame per 1 / fps',
        chunksPerInterval: 1,
        chunksAvailableOnRequest: 0,
        expectedDLTimeMin: 2002 * 0.6 - 33,
        expectedDLTimeMax: 2002 * 1.1 - 33
    },
    pattern2: {
        url: 'http://localhost:9876/ll/pattern2',
        interval: 133,
        chunksPerInterval: 4,
        chunksAvailableOnRequest: 0,
        text: 'chunky encoder',
        expectedDLTimeMin: 2002 * 0.6 - 133,
        expectedDLTimeMax: 2002 * 1.1 - 133
    },
    pattern3: {
        url: 'http://localhost:9876/ll/pattern3',
        interval: 333,
        chunksPerInterval: 10,
        chunksAvailableOnRequest: 0,
        text: 'chunky encoder',
        expectedDLTimeMin: 2002 * 0.6 - 333,
        expectedDLTimeMax: 2002 * 1.1 - 333
    },
    pattern4: {
        url: 'http://localhost:9876/ll/pattern4',
        interval: 1000,
        chunksPerInterval: 30,
        chunksAvailableOnRequest: 0,
        text: 'chunky encoder',
        expectedDLTimeMin: 2002 * 0.6 - 1000,
        expectedDLTimeMax: 2002 * 1.1 - 1000
    },
    pattern5: {
        url: 'http://localhost:9876/ll/pattern5',
        interval: 33,
        chunksPerInterval: 1,
        chunksAvailableOnRequest: 30,
        text: 'chunky encoder with 50% chunks available on request',
        expectedDLTimeMin: 0.1 + 2002 * 0.6 / 2 - 33,
        expectedDLTimeMax: 250 + 2002 * 1.1 / 2 - 33
    },
    pattern6: {
        url: 'http://localhost:9876/ll/pattern6',
        interval: 133,
        chunksPerInterval: 4,
        chunksAvailableOnRequest: 30,
        text: 'chunky encoder with 50% chunks available on request',
        expectedDLTimeMin: 0.1 + 2002 * 0.6 / 2 - 133,
        expectedDLTimeMax: 250 + 2002 * 1.1 / 2 - 133
    },
    pattern7: {
        url: 'http://localhost:9876/ll/pattern7',
        interval: 333,
        chunksPerInterval: 10,
        chunksAvailableOnRequest: 30,
        text: 'chunky encoder with 50% chunks available on request',
        expectedDLTimeMin: 0.1 + 2002 * 0.6 / 2 - 333,
        expectedDLTimeMax: 250 + 2002 * 1.1 / 2 - 333
    },
    pattern8: {
        url: 'http://localhost:9876/ll/pattern8',
        interval: 1000,
        chunksPerInterval: 30,
        chunksAvailableOnRequest: 30,
        text: 'chunky encoder with 50% chunks available on request',
        expectedDLTimeMin: 0.1 + 2002 * 0.6 / 2,
        expectedDLTimeMax: 250 + 2002 * 1.1 / 2
    }
}

describe('FetchLoader implementation', () => {

    // throughput calculation tests
    [Constants.ABR_FETCH_THROUGHPUT_CALCULATION_DOWNLOADED_DATA,
    Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING,
    Constants.ABR_FETCH_THROUGHPUT_CALCULATION_AAST].forEach(calculationMode => {
        ['pattern0', 'pattern1', 'pattern2', 'pattern3', 'pattern4', 'pattern5', 'pattern6', 'pattern7', 'pattern8'].forEach((pname)=>{
            let pattern = patterns[pname];

            it(`should calculate the proper download time if near life edge, mode: ${calculationMode} and ${pname} (${pattern.text})`, (done) => {
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
                const fetchLoader = FetchLoader(context).create({
                    lowLatencyThroughputModel,
                    boxParser: BoxParser(context).getInstance()
                });
                fetchLoader.setup({
                    dashMetrics: {
                        getCurrentBufferLevel: function () { return 1; }
                    }
                });

                let lastEmittedDownloadtime = 0;

                const httpRequest = {
                    url: pattern.url,
                    method: 'GET',
                    onload: function () {

                    },
                    onend: () => {
                        // with tolerance
                        expect(lastEmittedDownloadtime).to.be.within(pattern.expectedDLTimeMin, pattern.expectedDLTimeMax, `expected download time in ms`);
                        if (!isDone) {
                            done();
                        }
                    },
                    onerror: (e) => { console.error(e); isDone = true; done(e) },
                    progress: (p) => {
                        if (p.loaded && p.loaded === p.total) {
                            if (p.throughput) {
                                // p.throughput is in kbps, download time is in milliseconds
                                lastEmittedDownloadtime = (p.total * 8 * 1000) / (p.throughput * 1024);
                            } else if (p.time) {
                                lastEmittedDownloadtime = p.time;
                            }

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