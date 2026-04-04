import DodgeScheduleControllerOverride from '../../../../src/dodge/overrides/DodgeScheduleControllerOverride.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeScheduleControllerOverride', function () {

    function makeOverride({ parentResult, isTrailing, hasDashHandler = true, isDefended = false, scheduleWaitBase = 100, scheduleWaitRandom = 50 }) {
        const parentShouldClearStub = sinon.stub().returns(parentResult);
        const parentStartScheduleTimerStub = sinon.stub();
        const getIsTrailingStub = sinon.stub().returns(isTrailing);
        const getIsDefendedStub = sinon.stub().returns(isDefended);

        const parent = {
            _shouldClearScheduleTimer: parentShouldClearStub,
            startScheduleTimer: parentStartScheduleTimerStub,
        };
        const dashHandler = hasDashHandler ? { getIsTrailing: getIsTrailingStub, getIsDefended: getIsDefendedStub } : undefined;
        const settings = {
            get: () => ({ dodge: { scheduleWaitBase, scheduleWaitRandom } })
        };

        const override = DodgeScheduleControllerOverride.call(
            { context: {}, parent, factory: {} },
            { dashHandler, settings }
        );

        return { override, parentShouldClearStub, parentStartScheduleTimerStub, getIsTrailingStub, getIsDefendedStub };
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

    describe('startScheduleTimer', function () {

        it('not defended: passes value through to parent unchanged', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({ parentResult: false, isTrailing: false, isDefended: false });
            override.startScheduleTimer(0);
            expect(parentStartScheduleTimerStub.calledOnce).to.be.true; // jshint ignore:line
            expect(parentStartScheduleTimerStub.firstCall.args[0]).to.equal(0);
        });

        it('defended with value = 0: enforces minimum random delay', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({
                parentResult: false, isTrailing: false, isDefended: true,
                scheduleWaitBase: 100, scheduleWaitRandom: 50
            });
            override.startScheduleTimer(0);
            expect(parentStartScheduleTimerStub.calledOnce).to.be.true; // jshint ignore:line
            const delay = parentStartScheduleTimerStub.firstCall.args[0];
            expect(delay).to.be.at.least(100);
            expect(delay).to.be.at.most(150);
        });

        it('defended with value larger than max delay: keeps the larger value', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({
                parentResult: false, isTrailing: false, isDefended: true,
                scheduleWaitBase: 100, scheduleWaitRandom: 50
            });
            override.startScheduleTimer(500);
            expect(parentStartScheduleTimerStub.calledOnce).to.be.true; // jshint ignore:line
            expect(parentStartScheduleTimerStub.firstCall.args[0]).to.equal(500);
        });

        it('defended with scheduleWaitRandom = 0: delay is exactly scheduleWaitBase', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({
                parentResult: false, isTrailing: false, isDefended: true,
                scheduleWaitBase: 100, scheduleWaitRandom: 0
            });
            override.startScheduleTimer(0);
            expect(parentStartScheduleTimerStub.firstCall.args[0]).to.equal(100);
        });

        it('defended with undefined value: treats as 0 and enforces minimum delay', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({
                parentResult: false, isTrailing: false, isDefended: true,
                scheduleWaitBase: 100, scheduleWaitRandom: 0
            });
            override.startScheduleTimer(undefined);
            expect(parentStartScheduleTimerStub.firstCall.args[0]).to.equal(100);
        });

        it('dashHandler absent: passes value through to parent unchanged', function () {
            const { override, parentStartScheduleTimerStub } = makeOverride({
                parentResult: false, isTrailing: false, hasDashHandler: false
            });
            override.startScheduleTimer(0);
            expect(parentStartScheduleTimerStub.firstCall.args[0]).to.equal(0);
        });
    });
});
