import DodgeGapControllerOverride from '../../../../src/dodge/overrides/DodgeGapControllerOverride.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeGapControllerOverride', function () {

    function makeOverride(isTrailing, hasDodgeHandler = true) {
        const isDodgeTrailingStub = sinon.stub().returns(isTrailing);
        const dodgeHandler = hasDodgeHandler ? { isDodgeTrailing: isDodgeTrailingStub } : undefined;

        const override = DodgeGapControllerOverride.call(
            { context: { _dodgeHandler: dodgeHandler }, parent: {}, factory: {} }
        );

        return override;
    }

    describe('_shouldJumpGap', function () {

        it('not trailing: returns true (gap jump proceeds normally)', function () {
            const override = makeOverride(false);
            expect(override._shouldJumpGap()).to.be.true; // jshint ignore:line
        });

        it('during trailing: returns false (suppresses gap jump to avoid spurious seek)', function () {
            const override = makeOverride(true);
            expect(override._shouldJumpGap()).to.be.false; // jshint ignore:line
        });

        it('dodgeHandler absent: returns true (no crash, gap jumping unaffected)', function () {
            const override = DodgeGapControllerOverride.call(
                { context: {}, parent: {}, factory: {} }
            );
            expect(override._shouldJumpGap()).to.be.true; // jshint ignore:line
        });
    });
});
