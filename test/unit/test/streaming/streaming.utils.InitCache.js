import InitCache from '../../../../src/streaming/utils/InitCache.js';

import {expect} from 'chai';

const context = {};
const initCache = InitCache(context).getInstance();

describe('InitCache', function () {

    describe('extract', () => {
        it('should return null when extract is called and parameters are undefined', () => {
            const extractResult = initCache.extract();

            expect(extractResult).to.be.null;
        });

        it('should return null when extract is called and streamId is undefined', () => {
            const representationId = 'video_880k';
            const extractResult = initCache.extract(null, representationId);

            expect(extractResult).to.be.null;
        });

        it('should return null when extract is called and representationId is undefined', () => {
            const streamId = 'defauldId';
            const extractResult = initCache.extract(streamId);

            expect(extractResult).to.be.null;
        });

        it('should return when extract is called and representationId is undefined', () => {

            initCache.save({ streamId: 'defauldId', representation: { id: 'video_880k' }, dataTest: 'videoSegment' });
            const streamId = 'defauldId';
            const representationId = 'video_880k';

            let extractResult = initCache.extract(streamId);

            expect(extractResult).to.be.null;

            extractResult = initCache.extract(null, representationId);

            expect(extractResult).to.be.null;

            extractResult = initCache.extract(streamId, representationId);

            expect(extractResult.dataTest).to.be.equal('videoSegment');
        });
    });
});
