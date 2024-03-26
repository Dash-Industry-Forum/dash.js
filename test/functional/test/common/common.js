import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import DashJsAdapter from '../../adapter/DashJsAdapter.js';

export async function checkIsPlaying(playerAdapter, expectedState) {
    const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
    expect(isPlaying).to.equal(expectedState);
}

export async function checkIsProgressing(playerAdapter) {
    const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
    expect(isProgressing).to.be.true;
}

export async function checkIsNotProgressing(playerAdapter) {
    const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_NOT_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
    expect(isProgressing).to.be.false;
}

export function checkNoCriticalErrors(playerAdapter) {
    const logEvents = playerAdapter.getLogEvents();
    expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
}

export async function checkForEndedEvent(playerAdapter) {
    const ended = await playerAdapter.waitForEvent(playerAdapter.getDuration() * 1000 + Constants.TEST_TIMEOUT_THRESHOLDS.IS_FINISHED_OFFSET_TO_DURATION, dashjs.MediaPlayer.events.PLAYBACK_ENDED)
    expect(ended).to.be.true;
}

export function checkLiveDelay(playerAdapter, lowerThreshold, upperThreshold) {
    const liveDelay = playerAdapter.getCurrentLiveLatency();
    expect(liveDelay).to.be.at.least(lowerThreshold);
    expect(liveDelay).to.be.below(upperThreshold);
}

export function checkTimeWithinThreshold(playerAdapter, seekTime, allowedDifference) {
    const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(seekTime, allowedDifference);
    expect(timeIsWithinThreshold).to.be.true;
}

export function initializeDashJsAdapter(item, mpd, settings = null) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.init(true);
    playerAdapter.setDrmData(item.drm);
    playerAdapter.updateSettings(settings);
    playerAdapter.attachSource(mpd);

    return playerAdapter
}
