import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

/**
 * Utility function to modify a live manifest by injecting Alternative MPD events with clip functionality
 * This tests the clip feature scenarios where only a portion of the alternative live content is played
 */
function injectAlternativeMpdClipEvents(player, originalManifestUrl, alternativeManifestUrl, presentationTime, maxDuration, callback) {
    const mediaPlayer = player.player;

    mediaPlayer.retrieveManifest(originalManifestUrl, (manifest) => {
        if (!manifest.Period[0].EventStream) {
            manifest.Period[0].EventStream = [];
        } else {
            manifest.Period[0].EventStream = [];
        }

        const duration = 8000;
        const earliestResolutionTimeOffset = 3000;

        const replaceClipEvent = {
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
                    clip: 'true',
                }
            }]
        };

        manifest.Period[0].EventStream.push(replaceClipEvent);
        mediaPlayer.attachSource(manifest);

        if (callback) {
            callback();
        }
    });
}

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-clip-live').forEach((item) => {
    const name = item.name;
    const originalUrl = item.originalUrl;
    const alternativeUrl = item.alternativeUrl;

    describe(`Alternative MPD Replace with Clip functionality tests for Live-to-Live: ${name}`, () => {

        let player;
        let presentationTime;
        let maxDuration;
        let presentationTimeOffset;
        
        before((done) => {
            const currentPresentationTime = Date.now();
            presentationTimeOffset = 10000 //includes potential latency
            presentationTime = currentPresentationTime - presentationTimeOffset; //alternative content already started
            maxDuration = 10000;
            
            // Initialize the player without attaching source immediately
            player = initializeDashJsAdapterForAlternativMedia(item, null);

            // Use the utility function to inject Alternative MPD events with clip for live-to-live
            injectAlternativeMpdClipEvents(player, originalUrl, alternativeUrl, presentationTime, maxDuration, () => {
                done();
            });
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should play live content, switch to clipped alternative live content, then back to original live content', (done) => {
            let alternativeContentDetected = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let alternativeEndTime = 0;
            let alternativeStartTime = 0;
            let expectedMaxDuration = 0;
            let expectedPresentationTime = 0;

            const timeout = setTimeout(() => {
                done(new Error('Test timed out - alternative MPD replace clip event not completed within 35 seconds'));
            }, 35000);

            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, () => {
                eventTriggered = true;
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeContentDetected = true;
                    alternativeStartTime = Date.now() / 1000;
                    expectedMaxDuration = data.event.maxDuration;
                    expectedPresentationTime = data.event.presentationTime;
                    expect(data.event.clip).to.be.true;
                }
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace') {
                    backToOriginalDetected = true;
                    alternativeEndTime = Date.now() / 1000;
                    const actualTerminationTime = player.player.timeAsUTC();
                    const expectedTerminationTime = (expectedPresentationTime + expectedMaxDuration);
                    clearTimeout(timeout);

                    // Wait to ensure stability
                    setTimeout(() => {
                        expect(eventTriggered).to.be.true;
                        expect(alternativeContentDetected).to.be.true;
                        expect(backToOriginalDetected).to.be.true;
                        
                        // Verify that the actual duration of alternative content is less than maxDuration
                        const actualAlternativeDuration = (alternativeEndTime - alternativeStartTime);
                        expect(actualAlternativeDuration).to.be.lessThan(expectedMaxDuration);

                        // The alternative content should terminate at approximately PRT + APDmax
                        // Allow tolerance for live content timing variations
                        expect(actualTerminationTime).to.be.at.closeTo(expectedTerminationTime, 2);

                        done();
                    }, 2000); // Longer wait for live content stability
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                clearTimeout(timeout);
                done(new Error(`Player error: ${JSON.stringify(e)}`));
            });

        }, 45000);

    });
});