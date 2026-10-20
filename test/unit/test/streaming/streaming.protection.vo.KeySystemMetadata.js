import KeySystemMetadata from '../../../../src/streaming/protection/vo/KeySystemMetadata.js';
import ProtectionConstants from '../../../../src/streaming/constants/ProtectionConstants.js';

import {expect} from 'chai';

describe('KeySystemMetadata', function () {
    describe('getSystemStringsToApply', function () {
        const playReady = { systemString: ProtectionConstants.PLAYREADY_KEYSTEM_STRING };

        it('should prefer the systemStringPriority defined by the application', function () {
            const systemStringPriority = [ProtectionConstants.PLAYREADY_RECOMMENDATION_3000_KEYSTEM_STRING];
            expect(KeySystemMetadata.getSystemStringsToApply(playReady, { systemStringPriority }))
                .to.deep.equal(systemStringPriority);
        });

        it('should use the default PlayReady system strings without .recommendation.3000', function () {
            expect(KeySystemMetadata.getSystemStringsToApply(playReady, {})).to.deep.equal([
                ProtectionConstants.PLAYREADY_KEYSTEM_STRING,
                ProtectionConstants.PLAYREADY_RECOMMENDATION_KEYSTEM_STRING
            ]);
        });

        it('should fall back to the key system string if no defaults exist', function () {
            const widevine = { systemString: ProtectionConstants.WIDEVINE_KEYSTEM_STRING };
            expect(KeySystemMetadata.getSystemStringsToApply(widevine, null))
                .to.deep.equal([ProtectionConstants.WIDEVINE_KEYSTEM_STRING]);
        });

        it('should not allow modifying the shared defaults', function () {
            expect(Object.isFrozen(ProtectionConstants.DEFAULT_SYSTEM_STRING_PRIORITY)).to.be.true;
            expect(Object.isFrozen(KeySystemMetadata.getSystemStringsToApply(playReady, null))).to.be.true;
        });
    });
});
