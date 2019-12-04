import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import TimelineSegmentsGetter from '../../src/dash/utils/TimelineSegmentsGetter';
import Constants from '../../src/streaming/constants/Constants';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;

const segmentTemplate = {
    'timescale': 90000,
    'initialization': 'test-$RepresentationID$.dash',
    'SegmentTimeline': {
        'S': [
            {
                't': 0,
                'd': 360360,
                'r': 24
            },
            {
                'd': 123873
            }
        ],
        'S_asArray': [
            {
                't': 0,
                'd': 360360,
                'r': 24
            },
            {
                'd': 123873
            }
        ],
        '__children': [
            {
                'S': {
                    't': 0,
                    'd': 360360,
                    'r': 24
                }
            },
            {
                'S': {
                    'd': 123873
                }
            }
        ]
    },
    'SegmentTimeline_asArray': [
        {
            'S': [
                {
                    't': 0,
                    'd': 360360,
                    'r': 24
                },
                {
                    'd': 123873
                }
            ],
            'S_asArray': [
                {
                    't': 0,
                    'd': 360360,
                    'r': 24
                },
                {
                    'd': 123873
                }
            ],
            '__children': [
                {
                    'S': {

                        't': 0,
                        'd': 360360,
                        'r': 24
                    }
                },
                {
                    'S': {

                        'd': 123873
                    }
                }
            ]
        }
    ],
    '__children': [
        {
            'SegmentTimeline': {
                'S': [
                    {
                        't': 0,
                        'd': 360360,
                        'r': 24
                    },
                    {
                        'd': 123873
                    }
                ],
                'S_asArray': [
                    {
                        't': 0,
                        'd': 360360,
                        'r': 24
                    },
                    {
                        'd': 123873
                    }
                ],
                '__children': [
                    {
                        'S': {
                            't': 0,
                            'd': 360360,
                            'r': 24
                        }
                    },
                    {
                        'S': {
                            'd': 123873
                        }
                    }
                ]
            }
        }
    ],
    'media': 'test-$RepresentationID$-$Time$.dash'
};

function createRepresentationMock() {
    const voHelper = new VoHelper();
    const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
    representation.timescale = 90000;
    representation.SegmentTemplate = segmentTemplate;
    representation.adaptation.period.mpd.manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray[0] = representation;
    representation.adaptation.period.mpd.maxSegmentDuration = 5;
    representation.presentationTimeOffset = 0;

    return representation;
}

describe('TimelineSegmentsGetter', () => {
    const context = {};

    const timelineConverter = TimelineConverter(context).getInstance();
    timelineConverter.initialize();

    const timelineSegmentsGetter = TimelineSegmentsGetter(context).create({
        timelineConverter: timelineConverter
    }, false);

    it('should expose segments getter interface', () => {
        expect(timelineSegmentsGetter.getSegmentByIndex).to.exist; // jshint ignore:line
        expect(timelineSegmentsGetter.getSegmentByTime).to.exist; // jshint ignore:line
    });

    describe('Initialization', () => {
        it('should throw an error if config object is not defined', () => {
            const getter = TimelineSegmentsGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if config object has not been properly passed', function () {
            const getter = TimelineSegmentsGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if representation parameter has not been properly set', function () {
            const getter = TimelineSegmentsGetter(context).create({ timelineConverter: timelineConverter });
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('availableSegmentsNumber calculation', () => {
        it('should calculate representation segment range correctly', () => {
            const representation = createRepresentationMock();

            timelineSegmentsGetter.getSegmentByIndex(representation, 0);
            expect(representation.availableSegmentsNumber).to.equal(25);
        });
    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 0, -1);
            expect(seg.availabilityIdx).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, 1, 0);
            expect(seg.availabilityIdx).to.equal(1);
            expect(seg.presentationStartTime).to.equal(4.004);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, 2, 4.004);
            expect(seg.availabilityIdx).to.equal(2);
            expect(seg.presentationStartTime).to.equal(8.008);
            expect(seg.duration).to.equal(4.004);
        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 10000, 1000);
            expect(seg).to.be.null; // jshint ignore:line
        });

        it('should return null if last media time is not provided', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 1);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('getSegmentByTime', () => {
        it('should return segment by time', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 3);
            expect(seg.availabilityIdx).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 22);
            expect(seg.availabilityIdx).to.equal(4);
            expect(seg.presentationStartTime).to.equal(16.016);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 53);
            expect(seg.availabilityIdx).to.equal(12);
            expect(seg.presentationStartTime).to.equal(48.048);
            expect(seg.duration).to.equal(4.004);

        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 1100);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});