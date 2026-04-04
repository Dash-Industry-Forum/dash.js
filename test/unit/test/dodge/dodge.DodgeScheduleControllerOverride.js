import DodgeScheduleControllerOverride from '../../../../src/dodge/overrides/DodgeScheduleControllerOverride.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeScheduleControllerOverride', function () {

    function makeOverride({ parentResult, isTrailing, hasDashHandler = true }) {
        const parentShouldClearStub = sinon.stub().returns(parentResult);
        const getIsTrailingStub = sinon.stub().returns(isTrailing);

        const parent = { _shouldClearScheduleTimer: parentShouldClearStub };
        const dashHandler = hasDashHandler ? { getIsTrailing: getIsTrailingStub } : undefined;

        const override = DodgeScheduleControllerOverride.call(
            { context: {}, parent, factory: {} },
            { dashHandler }
        );

        return { override, parentShouldClearStub, getIsTrailingStub };
    }

    describe('_shouldClearScheduleTimer', function () {

        it('parent returns false (keep timer), not trailing: returns false without checking trailing state', function () {
            const { override, getIsTrailingStub } = makeOverride({ parentResult: false, isTrailing: false });
            expect(override._shouldClearScheduleTimer()).to.be.false; // jshint ignore:line
            // Trailing check is irrelevant when parent already says keep timer
            expect(getIsTrailingStub.called).to.be.false; // jshint ignore:line
        });

        it('parent returns false (keep timer), during trailing: still returns false', function () {
            const { override } = makeOverride({ parentResult: false, isTrailing: true });
            expect(override._shouldClearScheduleTimer()).to.be.false; // jshint ignore:line
        });

        it('parent returns true (clear timer), not trailing: returns true (clears normally)', function () {
            const { override } = makeOverride({ parentResult: true, isTrailing: false });
            expect(override._shouldClearScheduleTimer()).to.be.true; // jshint ignore:line
        });

        it('parent returns true (clear timer), during trailing: returns false (keeps timer for padding downloads)', function () {
            // During trailing, the schedule timer must continue running so that padding
            // cycles are requested even though normal playback appears to have ended.
            const { override } = makeOverride({ parentResult: true, isTrailing: true });
            expect(override._shouldClearScheduleTimer()).to.be.false; // jshint ignore:line
        });

        it('dashHandler absent: falls back to parent result without crashing', function () {
            const { override } = makeOverride({ parentResult: true, isTrailing: false, hasDashHandler: false });
            expect(override._shouldClearScheduleTimer()).to.be.true; // jshint ignore:line
        });
    });
});
