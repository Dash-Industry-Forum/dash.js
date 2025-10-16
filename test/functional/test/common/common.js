import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

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
    const errorEvents = playerAdapter.getErrorEvents();
    expect(errorEvents).to.be.empty;
}

export function checkEventHasBeenTriggered(playerAdapter, eventName) {
    const hasBeenTriggered = playerAdapter.hasEventBeenTriggered(eventName)
    expect(hasBeenTriggered).to.be.true;
}

export async function checkForEndedEvent(playerAdapter) {
    const ended = await playerAdapter.waitForEvent(playerAdapter.getDuration() * 1000 + Constants.TEST_TIMEOUT_THRESHOLDS.IS_FINISHED_OFFSET_TO_DURATION, dashjs.MediaPlayer.events.PLAYBACK_ENDED)
    expect(ended).to.be.true;
}

export async function seekAndEndedEvent(playerAdapter, seekOffset) {
    let endedEventThrown = false;
    const _endedCallback = () => {
        endedEventThrown = true;
    }
    playerAdapter.registerEvent(MediaPlayerEvents.PLAYBACK_ENDED, _endedCallback);
    const targetTime = playerAdapter.getDuration() + seekOffset;
    playerAdapter.seek(targetTime);
    await playerAdapter.sleep(Constants.TEST_INPUTS.SEEK_ENDED.EVENT_WAITING_TIME);
    playerAdapter.unregisterEvent(MediaPlayerEvents.PLAYBACK_ENDED, _endedCallback);
    expect(endedEventThrown).to.be.true;
}

export async function reachedTargetForwardBuffer(playerAdapter, targetBuffer, tolerance) {
    const reachedBuffer = await playerAdapter.reachedTargetForwardBuffer(Constants.TEST_TIMEOUT_THRESHOLDS.TARGET_BUFFER_REACHED, targetBuffer, tolerance);
    expect(reachedBuffer).to.be.true;
}

export function checkLiveDelay(playerAdapter, lowerThreshold, upperThreshold) {
    const liveDelay = playerAdapter.getCurrentLiveLatency();
    expect(liveDelay).to.be.at.least(lowerThreshold);
    expect(liveDelay).to.be.below(upperThreshold);
}

export function checkTimeWithinThresholdForDvrWindow(playerAdapter, seekTime, allowedDifference) {
    const timeIsWithinThreshold = playerAdapter.timeWithinThresholdForDvrWindow(seekTime, allowedDifference);
    expect(timeIsWithinThreshold).to.be.true;
}

export function checkTimeWithinThreshold(playerAdapter, seekTime, allowedDifference) {
    const timeIsWithinThreshold = playerAdapter.timeWithinThreshold(seekTime, allowedDifference);
    expect(timeIsWithinThreshold).to.be.true;
}

export function initializeDashJsAdapter(item, mpd, settings = null) {
    const playerAdapter = _commmonInitialization(item, settings);
    playerAdapter.attachSource(mpd);

    return playerAdapter
}

export function initializeDashJsAdapterWithoutAttachSource(item, settings = null) {
    const playerAdapter = _commmonInitialization(item, settings);

    return playerAdapter
}

function _commmonInitialization(item, settings) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.init(true);
    playerAdapter.setDrmData(item.drm);
    if (settings) {
        playerAdapter.updateSettings(settings);
    }

    return playerAdapter
}


export function initializeDashJsAdapterForPreload(item, mpd, settings) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.initForPreload(mpd);
    playerAdapter.setDrmData(item.drm);
    if (settings) {
        playerAdapter.updateSettings(settings);
    }
    playerAdapter.preload();

    return playerAdapter
}

export function initializeDashJsAdapterForAlternativMedia(item, mpd, settings) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.initForAlternativeMedia(mpd);
    playerAdapter.setDrmData(item.drm);
    if (settings) {
        playerAdapter.updateSettings(settings);
    }

    playerAdapter.attachSource(mpd);
    return playerAdapter
}

export function playForDuration(durationInMilliseconds) {
    return new Promise(resolve => setTimeout(resolve, durationInMilliseconds));
}

export function isLiveContent(item) {
    return item.type === Constants.CONTENT_TYPES.LIVE
}

export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
