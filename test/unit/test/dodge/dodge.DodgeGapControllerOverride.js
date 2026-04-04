import DodgeGapControllerOverride from '../../../../src/dodge/overrides/DodgeGapControllerOverride.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeGapControllerOverride', function () {

    function makeOverride(isTrailing, hasDashHandler = true) {
        const getIsTrailingStub = sinon.stub().returns(isTrailing);
        const dashHandler = hasDashHandler ? { getIsTrailing: getIsTrailingStub } : undefined;

        const override = DodgeGapControllerOverride.call(
            { context: {}, parent: {}, factory: {} },
            { dashHandler }
        );

        return override;
    }

    describe('shouldJumpGap', function () {

        it('not trailing: returns true (gap jump proceeds normally)', function () {
            const override = makeOverride(false);
            expect(override.shouldJumpGap()).to.be.true; // jshint ignore:line
        });

        it('during trailing: returns false (suppresses gap jump to avoid spurious seek)', function () {
            const override = makeOverride(true);
            expect(override.shouldJumpGap()).to.be.false; // jshint ignore:line
        });

        it('dashHandler absent: returns true (no crash, gap jumping unaffected)', function () {
            const override = makeOverride(true, false);
            expect(override.shouldJumpGap()).to.be.true; // jshint ignore:line
        });
    });
});
