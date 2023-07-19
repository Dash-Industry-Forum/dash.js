import ThroughputModel from '../../src/streaming/models/ThroughputModel';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;
const context = {};


describe('ThroughputModel', () => {

    let throughputModel;
    let dummyHttpRequest;
    const settings = Settings(context).getInstance();

    beforeEach(() => {
        settings.reset();
        throughputModel = ThroughputModel(context).create({
            settings
        });
        dummyHttpRequest = {
            tresponse: new Date('1995-12-17T03:24:00.500'),
            trequest: new Date('1995-12-17T03:24:00.000'),
            _tfinish: new Date('1995-12-17T03:24:02.500'),
            _resourceTimingValues: {
                responseStart: 1000,
                responseEnd: 3000,
                encodedBodySize: 1200000
            },
            trace: [
                {
                    s: new Date('1995-12-17T03:24:00.000'),
                    b: [200000], //bytes
                    d: 500//ms
                },
                {
                    s: new Date('1995-12-17T03:24:00.500'),
                    b: [500000], //bytes
                    d: 1500//ms
                },
                {
                    s: new Date('1995-12-17T03:24:02.000'),
                    b: [400000], //bytes
                    d: 500//ms
                }
            ]
        }
    })

    describe('addEntry()', () => {

        it('Should not add any values if mediatype is not defined', () => {
            throughputModel.addEntry(null, dummyHttpRequest);
            const latencies = throughputModel.getLatencyDict(null);
            const throughputs = throughputModel.getThroughputDict(null);

            expect(latencies).to.be.undefined;
            expect(throughputs).to.be.undefined;
        })

        it('Should not add any values if httpRequest is not defined', () => {
            throughputModel.addEntry('video', null);
            const latencies = throughputModel.getLatencyDict(null);
            const throughputs = throughputModel.getThroughputDict(null);

            expect(latencies).to.be.undefined;
            expect(throughputs).to.be.undefined;
        })

        it('Should set latency to 1 if diff between tresponse and trequest is 0', () => {
            dummyHttpRequest.tresponse = dummyHttpRequest.trequest;
            throughputModel.addEntry('video', dummyHttpRequest);
            const latencies = throughputModel.getLatencyDict('video');

            expect(latencies.length).to.be.equal(1);
            expect(latencies[0]).to.be.equal(1);
        })

        it('Should calculate correct latency', () => {
            throughputModel.addEntry('video', dummyHttpRequest);
            const latencies = throughputModel.getLatencyDict('video');

            expect(latencies.length).to.be.equal(1);
            expect(latencies[0]).to.be.equal(500);
        })

        it('Should calculate correct throughput values in case resourceTimingValues are present', () => {
            throughputModel.addEntry('video', dummyHttpRequest);
            const values = throughputModel.getThroughputDict('video');

            expect(values.length).to.be.equal(1);
            expect(values[0]).to.be.equal(4800);
        })

        it('Should calculate correct throughput values in case no resourceTimingValues are present', () => {
            // Note the first trace is supposed to be ignored because
            delete dummyHttpRequest._resourceTimingValues;
            throughputModel.addEntry('video', dummyHttpRequest);
            const values = throughputModel.getThroughputDict('video');

            expect(values.length).to.be.equal(1);
            expect(values[0]).to.be.equal(3600);
        })

        it('Should not add throughput values if considered a cached response', () => {
            dummyHttpRequest._tfinish = dummyHttpRequest.trequest;
            throughputModel.addEntry('video', dummyHttpRequest);
            const values = throughputModel.getThroughputDict('video');

            expect(values.length).to.be.equal(0);
        })

        it('Should remove values from the dicts once threshold is reached', () => {
            settings.update({streaming: {abr: {throughput: {maxMeasurementsToKeep: 1}}}});
            throughputModel.addEntry('video', dummyHttpRequest);
            let values = throughputModel.getThroughputDict('video');
            expect(values.length).to.be.equal(1);

            dummyHttpRequest._resourceTimingValues.responseStart = 2000;
            throughputModel.addEntry('video', dummyHttpRequest);
            values = throughputModel.getThroughputDict('video');
            expect(values.length).to.be.equal(1);
            expect(values[0]).to.equal(9600)
        })

        it('should update EWMA values', () => {
            throughputModel.addEntry('video', dummyHttpRequest);
            let tValues = throughputModel.getEwmaThroughputDict('video');
            let lValues = throughputModel.getEwmaLatencyDict('video');

            expect(tValues.totalWeight).to.be.equal(2);
            expect(lValues.totalWeight).to.be.equal(1);
        })

    })
});
