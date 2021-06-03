import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

import FetchLoader from '../../src/streaming/net/FetchLoader';
import LowLatencyThroughputModel from '../../src/streaming/models/LowLatencyThroughputModel';
import BoxParser from '../../src/streaming/utils/BoxParser';

const patterns = {
    pattern1: {
        url: 'http://localhost:9876/ll/pattern1',
        interval: 33,
        chunksPerInterval: 1
    },
    pattern2: {
        url: 'http://localhost:9876/ll/pattern2',
        interval: 133,
        chunksPerInterval: 4
    },
    pattern3: {
        url: 'http://localhost:9876/ll/pattern3',
        interval: 333,
        chunksPerInterval: 10
    },
    pattern4: {
        url: 'http://localhost:9876/ll/pattern4',
        interval: 1000,
        chunksPerInterval: 30
    }
}

describe('FetchLoader', () => {

    describe('fetch API', () => {

        // environment test, required for the following
        it('should offer fetch as function in global space', () => {
            expect(window.fetch).to.be.a('function');
        });

        // environment test, required for the following
        it('should be able to fetch a resource', (testdone) => {
            function fetchFn() {
                fetch(patterns.pattern1.url)
                    // Retrieve its body as ReadableStream
                    .then(response => {
                        expect(response.status).to.be.equal(200);
                        return response.body;
                    })
                    .then(body => {
                        const reader = body.getReader();
                        function pump() {

                            return reader.read().then(({ done, value }) => {
                                // When no more data needs to be consumed, close the stream
                                if (done) {
                                    testdone();
                                    return;
                                }

                                return pump();
                            });
                        }
                        return pump();
                    }).catch(e => console.error(e))
            }
            expect(fetchFn).to.not.throw();
        }).timeout(10000);

    });

    describe('Implementation', () => {

        // throughput calculation tests
        [Constants.ABR_FETCH_THROUGHPUT_CALCULATION_DOWNLOADED_DATA,
        Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING,
        Constants.ABR_FETCH_THROUGHPUT_CALCULATION_FAME].forEach(calculationMode => {
            it(`should calculate the proper download time if near life edge, mode: ${calculationMode}`, (done) => {
                let isDone = false;

                let pattern = patterns.pattern1;

                const settings = Settings(context).getInstance();

                settings.update({
                    streaming: {
                        abr: {
                            fetchThroughputCalculationMode: calculationMode
                        }
                    }
                });

                const fetchLoader = FetchLoader(context).create({
                    lowLatencyThroughputModel: LowLatencyThroughputModel(context).getInstance(),
                    boxParser: BoxParser(context).getInstance()
                });

                let lastEmittedDownloadtime = 0;

                const httpRequest = {
                    url: pattern.url,
                    method: 'GET',
                    onload: function () {

                    },
                    onend: () => {
                        console.log(lastEmittedDownloadtime);
                        // +-20% tolerance, even if not really needed on localhost tests
                        expect(lastEmittedDownloadtime).to.be.within(2002 - 200 - pattern.interval, 2002 + 200 - pattern.interval, `expected download time in ms`);
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
                        mediaType: 'video'
                    }
                };

                fetchLoader.load(httpRequest);

            }).timeout(5000);
        });

    });
});