import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

/**
 * Utility function to modify a live manifest by injecting Alternative MPD events with returnOffset
 */
function injectAlternativeMpdEventsWithReturnOffset(player, originalManifestUrl, alternativeManifestUrl, presentationTime, callback) {
    // Access the underlying MediaPlayer instance
    const mediaPlayer = player.player;

    mediaPlayer.retrieveManifest(originalManifestUrl, (manifest) => {
        manifest.Period[0].EventStream = [];

        const duration = 8000;
        const earliestResolutionTimeOffset = 5000;
        const maxDuration = 8000;
        const returnOffset = 3000;

        const replaceEvent = {
            schemeIdUri: 'urn:mpeg:dash:event:alternativeMPD:replace:2025',
            timescale: 1000,
            Event: [{
                id: 1,
                presentationTime: presentationTime,
                duration: duration,
                ReplacePresentation: {
                    url: alternativeManifestUrl,
                    earliestResolutionTimeOffset: earliestResolutionTimeOffset,
                    maxDuration: maxDuration,
                    returnOffset: returnOffset,
                    clip: false,
                }
            }]
        };

        manifest.Period[0].EventStream.push(replaceEvent);

        mediaPlayer.attachSource(manifest);

        if (callback) {
            callback();
        }
    });
}

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-returnOffset').forEach((item) => {
    const name = item.name;
    const originalUrl = item.originalUrl;
    const alternativeUrl = item.alternativeUrl;

    describe(`Alternative MPD returnOffset functionality tests for: ${name}`, () => {

        let player;
        let presentationTime;

        before((done) => {
            player = initializeDashJsAdapterForAlternativMedia(item, null);

            const currentPresentationTime = Date.now();
            presentationTime = currentPresentationTime + 4000; // 4 seconds from now

            // Use the utility function to inject Alternative MPD events with returnOffset
            injectAlternativeMpdEventsWithReturnOffset(player, originalUrl, alternativeUrl, presentationTime, () => {
                done();
            });
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should return to main content at correct time based on returnOffset', (done) => {
            const videoElement = player.getVideoElement();
            let backToOriginalDetected = false;
            let timeAfterSwitch = 0;
            let eventPresentationTime = 0;
            let eventReturnOffset = 0;

            const timeout = setTimeout(() => {
                done(new Error('Test timed out - returnOffset test not completed within 35 seconds'));
            }, 35000);

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace' && data.event.returnOffset !== undefined) {
                    eventPresentationTime = data.event.presentationTime;
                    eventReturnOffset = data.event.returnOffset;
                    backToOriginalDetected = true;
                    clearTimeout(timeout);

                    // Wait for playback to stabilize
                    setTimeout(() => {
                        timeAfterSwitch = videoElement.currentTime;
                        expect(backToOriginalDetected).to.be.true;

                        // RT = PRT + returnOffset (where PRT is presentationTime)
                        const expectedReturnTime = eventPresentationTime + eventReturnOffset;

                        // Allow 2 seconds tolerance for live content timing variations
                        expect(timeAfterSwitch).to.be.closeTo(expectedReturnTime, 2);

                        done();
                    }, 2000);
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                clearTimeout(timeout);
                done(new Error(`Player error: ${JSON.stringify(e)}`));
            });

        }, 40000); // Extended timeout for live content

    });
});