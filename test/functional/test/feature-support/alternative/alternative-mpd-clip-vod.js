import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-clip-vod').forEach((item) => {
    const name = item.name;
    const url = item.url;

    describe(`Alternative MPD Clip functionality tests for VOD-to-VOD: ${name}`, () => {

        let player;

        before(() => {
            player = initializeDashJsAdapterForAlternativMedia(item, url);
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should play VOD content, seek forward to simulate delay, then test clip behavior with alternative VOD content', (done) => {
            let alternativeContentDetected = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let alternativeEndTime = 0;
            let expectedMaxDuration = 0;
            let expectedPresentationTime = 0;
            let seekPerformed = false;

            const timeout = setTimeout(() => {
                done(new Error('Test timed out - alternative MPD replace clip event not completed within 30 seconds'));
            }, 30000);

            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, () => {
                eventTriggered = true;
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeContentDetected = true;
                    expectedMaxDuration = data.event.maxDuration;
                    expectedPresentationTime = data.event.presentationTime;

                    expect(data.event.clip).to.be.true;
                }
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeEndTime = player.getCurrentTime();
                    backToOriginalDetected = true;
                    clearTimeout(timeout);

                    // Wait to ensure stability
                    setTimeout(() => {
                        expect(eventTriggered).to.be.true;
                        expect(alternativeContentDetected).to.be.true;
                        expect(backToOriginalDetected).to.be.true;

                        // With clip="true", alternative should terminate at PRT + maxDuration
                        const expectedTerminationTime = expectedPresentationTime + expectedMaxDuration;
                        expect(alternativeEndTime).to.be.closeTo(expectedTerminationTime, 0.5);
                        done();
                    }, 1000); // Wait for VOD content stability
                }
            });

            // Perform seek forward to simulate delay after player starts
            player.registerEvent('playbackStarted', () => {
                if (!seekPerformed) {
                    seekPerformed = true;

                    // Wait a moment for stable playback, then seek forward
                    setTimeout(() => {
                        const seekTime = 7; // Seek to 7 seconds - event should have started at 5s
                        player.seek(seekTime);
                    }, 2000);
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                clearTimeout(timeout);
                done(new Error(`Player error: ${JSON.stringify(e)}`));
            });

        }, 35000);

    });
});