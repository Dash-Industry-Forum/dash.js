import ThroughputController from '../../src/streaming/controllers/ThroughputController';
import Settings from '../../src/core/Settings';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import EventBus from '../../src/core/EventBus';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents';
import Constants from '../../src/streaming/constants/Constants';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();

let httpRequests = [
    {
        'type': 'MediaSegment',
        'url': '1.m4v',
        'trequest': new Date('2022-06-28T09:19:03.000Z'),
        'tresponse': new Date('2022-06-28T09:19:03.000Z'),
        'responsecode': 200,
        'trace': [
            {
                's': '2022-06-28T09:19:03.000Z',
                'd': 500,
                'b': [
                    3000000
                ]
            },
            {
                's': '2022-06-28T09:19:03.500Z',
                'd': 200,
                'b': [
                    2000000
                ]
            },
            {
                's': '2022-06-28T09:19:03.700Z',
                'd': 300,
                'b': [
                    4000000
                ]
            },
        ],
        '_resourceTimingValues': {
            transferSize: 6000000,
            responseEnd: 300,
            responseStart: 100
        },
        '_stream': 'video',
        '_tfinish': new Date('2022-06-28T09:19:04.000Z')
    },
    {
        'type': 'MediaSegment',
        'url': '2.m4v',
        'trequest': new Date('2022-06-28T09:19:03.000Z'),
        'tresponse': new Date('2022-06-28T09:19:03.000Z'),
        'responsecode': 200,
        'trace': [
            {
                's': '2022-06-28T09:19:03.000Z',
                'd': 100,
                'b': [
                    3000000
                ]
            },
            {
                's': '2022-06-28T09:19:03.100Z',
                'd': 100,
                'b': [
                    2000000
                ]
            },
            {
                's': '2022-06-28T09:19:03.200Z',
                'd': 100,
                'b': [
                    4000000
                ]
            }
        ],
        '_resourceTimingValues': {
            transferSize: 1000000,
            responseEnd: 200,
            responseStart: 100
        },
        '_stream': 'video',
        '_tfinish': new Date('2022-06-28T09:19:03.300Z')
    },
    {
        'type': 'MediaSegment',
        'url': '3.m4v',
        'trequest': new Date('2022-06-28T09:19:03.000Z'),
        'tresponse': new Date('2022-06-28T09:19:03.000Z'),
        'responsecode': 200,
        'trace': [
            {
                's': '2022-06-28T09:19:03.000Z',
                'd': 900,
                'b': [
                    3000000
                ]
            },
            {
                's': '2022-06-28T09:19:03.900Z',
                'd': 600,
                'b': [
                    2000000
                ]
            },
            {
                's': '2022-06-28T09:19:04.500Z',
                'd': 1000,
                'b': [
                    4000000
                ]
            }
        ],
        '_resourceTimingValues': {
            transferSize: 2000000,
            responseEnd: 600,
            responseStart: 200
        },
        '_stream': 'video',
        '_tfinish': new Date('2022-06-28T09:19:05.500Z')
    }
]

function _addMetrics(numberOfEntries = NaN) {

    if (isNaN(numberOfEntries) || numberOfEntries > httpRequests.length) {
        numberOfEntries = httpRequests.length;
    }

    for (let i = 0; i < numberOfEntries; i++) {
        eventBus.trigger(MediaPlayerEvents.METRIC_ADDED, {
            mediaType: 'video',
            metric: 'HttpList',
            value: httpRequests[i]
        })
    }
}

describe('ThroughputController', () => {
    let throughputController;
    let settings = Settings(context).getInstance();

    beforeEach(() => {
        throughputController = ThroughputController(context).getInstance();
        throughputController.setConfig({
            settings,
            playbackController: new PlaybackControllerMock()
        })
        throughputController.initialize();
    });

    afterEach(() => {
        throughputController.reset();
        settings.reset();
    });

    describe('getAverageThroughput()', () => {

        it('Should calculate the arithmetic mean based on values from Resource Timing API', () => {
            settings.update({ streaming: { abr: { throughput: { useResourceTimingApi: true, useNetworkInformationApi: false } } } })
            _addMetrics();
            const result = throughputController.getAverageThroughput('video', Constants.THROUGHPUT_CALCULATION_MODES.ARITHMETIC_MEAN);

            expect(result).to.be.equal(120000);
        })

        it('Should calculate the harmonic mean based on values from Resource Timing API', () => {
            settings.update({ streaming: { abr: { throughput: { useResourceTimingApi: true, useNetworkInformationApi: false } } } })
            _addMetrics();
            const result = throughputController.getAverageThroughput('video', Constants.THROUGHPUT_CALCULATION_MODES.HARMONIC_MEAN);

            expect(result).to.be.equal(72000);
        })

        it('Should calculate the arithmetic mean based on values from XHR traces', () => {
            settings.update({ streaming: { abr: { throughput: { useResourceTimingApi: false, useNetworkInformationApi: false } } } })
            _addMetrics();
            const result = throughputController.getAverageThroughput('video', Constants.THROUGHPUT_CALCULATION_MODES.ARITHMETIC_MEAN);

            // we ignore the first entry in the traces for the calculation
            expect(result).to.be.equal(122000);
        })

        it('Should calculate the harmonic mean based on values from XHR traces', () => {
            settings.update({ streaming: { abr: { throughput: { useResourceTimingApi: false, useNetworkInformationApi: false } } } })
            _addMetrics();
            const result = throughputController.getAverageThroughput('video', Constants.THROUGHPUT_CALCULATION_MODES.HARMONIC_MEAN);

            // we ignore the first entry in the traces for the calculation
            expect(result).to.be.equal(62609);
        })

        it('Should return raw throughput data without calculating the average', () => {
            settings.update({ streaming: { abr: { throughput: { useResourceTimingApi: false, useNetworkInformationApi: false } } } })
            _addMetrics();
            const result = throughputController.getRawThroughputData('video');

            expect(result).to.have.lengthOf(3)
        })
    })
})
