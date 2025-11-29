import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

/**
 * Utility function to modify a live manifest by injecting Alternative MPD events without maxDuration
 * This simulates the initial event that starts alternative content playback without a preset duration limit
 */
function injectInitialAlternativeMpdEvent(player, originalManifestUrl, alternativeManifestUrl, presentationTime, callback) {
    const mediaPlayer = player.player;

    mediaPlayer.retrieveManifest(originalManifestUrl, (manifest) => {
        manifest.Period[0].EventStream = [];

        const duration = 15000; // 15 seconds default duration
        const earliestResolutionTimeOffset = 3000;
        const uniqueEventId = Math.floor(presentationTime / 1000); // Use timestamp-based unique ID

        // Create the replace event WITHOUT maxDuration initially
        const replaceEvent = {
            schemeIdUri: 'urn:mpeg:dash:event:alternativeMPD:replace:2025',
            timescale: 1000,
            Event: [{
                id: uniqueEventId,
                presentationTime: presentationTime,
                duration: duration,
                ReplacePresentation: {
                    url: alternativeManifestUrl,
                    earliestResolutionTimeOffset: earliestResolutionTimeOffset,
                    // NOTE: No maxDuration set initially
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

/**
 * Utility function to inject a status update event with maxDuration during active playback
 * This simulates the status="update" scenario where maxDuration is added mid-execution
 * Instead of modifying the manifest, we inject the event via manifest update simulation
 */
function injectStatusUpdateEvent(player, originalManifestUrl, alternativeManifestUrl, presentationTime, newMaxDuration, callback) {
    const mediaPlayer = player.player;

    // Status updates should be processed like MPD updates
    // So we simulate an MPD update that contains the status="update" event
    mediaPlayer.retrieveManifest(originalManifestUrl, (manifest) => {
        // Keep existing EventStreams and add the status update
        if (!manifest.Period[0].EventStream) {
            manifest.Period[0].EventStream = [];
        }

        const duration = 15000; // Keep same duration
        const earliestResolutionTimeOffset = 3000;
        const uniqueEventId = Math.floor(presentationTime / 1000); // Same ID as original event

        // Create the status update event that will update the existing event
        // This event should have the same ID as the original event but with status="update"
        const statusUpdateEvent = {
            schemeIdUri: 'urn:mpeg:dash:event:alternativeMPD:replace:2025',
            timescale: 1000,
            Event: [{
                id: uniqueEventId, // Same ID as the original event to update it
                presentationTime: presentationTime,
                duration: duration,
                status: 'update', // This marks it as an update event
                ReplacePresentation: {
                    url: alternativeManifestUrl,
                    earliestResolutionTimeOffset: earliestResolutionTimeOffset,
                    maxDuration: newMaxDuration, // NEW: Add maxDuration via status update
                    clip: false,
                }
            }]
        };

        let existingEventStream = manifest.Period[0].EventStream.find(
            stream => stream.schemeIdUri === 'urn:mpeg:dash:event:alternativeMPD:replace:2025'
        );

        if (existingEventStream) {
            // Add the status update event to the existing EventStream
            existingEventStream.Event.push(statusUpdateEvent.Event[0]);
        } else {
            // Add as a new EventStream (this creates the update scenario)
            manifest.Period[0].EventStream.push(statusUpdateEvent);
        }

        // Re-attach the modified manifest to trigger processing of the status update
        mediaPlayer.attachSource(manifest);

        if (callback) {
            callback();
        }
    });
}

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-status-update-live').forEach((item) => {
    const name = item.name;
    const originalUrl = item.originalUrl;
    const alternativeUrl = item.alternativeUrl;

    describe(`Alternative MPD Status Update Live functionality tests for: ${name}`, () => {

        let player;
        let presentationTime;
        let newMaxDuration;

        before((done) => {
            player = initializeDashJsAdapterForAlternativMedia(item, null);

            // For live streams, use current time + offset to ensure the event is in the future
            const currentPresentationTime = Date.now();
            presentationTime = currentPresentationTime + 6000; // 6 seconds from now (longer to avoid timing issues)
            newMaxDuration = 8000; // 8 seconds - shorter than original duration

            injectInitialAlternativeMpdEvent(player, originalUrl, alternativeUrl, presentationTime, () => {
                done();
            });
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should start alternative content without maxDuration, then update with maxDuration via status update and terminate early', (done) => {
            let alternativeContentDetected = false;
            let statusUpdateApplied = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let alternativeStartTime = 0;
            let alternativeEndTime = 0;
            let updatedMaxDuration = null;

            const timeout = setTimeout(() => {
                done(new Error('Test timed out - status update live event not completed within 35 seconds'));
            }, 35000);

            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, () => {
                eventTriggered = true;
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeContentDetected = true;
                    alternativeStartTime = Date.now();

                    setTimeout(() => {
                        injectStatusUpdateEvent(player, originalUrl, alternativeUrl, presentationTime, newMaxDuration, () => {
                            statusUpdateApplied = true;
                        });
                    }, 3000);
                }
            });

            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeEndTime = Date.now();
                    backToOriginalDetected = true;
                    updatedMaxDuration = data.event.maxDuration;

                    clearTimeout(timeout);

                    const actualAlternativeDuration = (alternativeEndTime - alternativeStartTime) / 1000;

                    // Wait to ensure stability
                    setTimeout(() => {
                        expect(eventTriggered).to.be.true;
                        expect(alternativeContentDetected).to.be.true;
                        expect(statusUpdateApplied).to.be.true;
                        expect(backToOriginalDetected).to.be.true;

                        // Verify that the status update was applied and maxDuration was set
                        const expectedMaxDurationInSeconds = newMaxDuration / 1000;
                        expect(updatedMaxDuration).to.equal(expectedMaxDurationInSeconds);

                        // Verify that alternative content terminated early due to maxDuration from status update
                        expect(actualAlternativeDuration).to.be.lessThan(10); // Much less than original 15s
                        expect(actualAlternativeDuration).to.be.lessThan(12);

                        done();
                    }, 2000);
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                clearTimeout(timeout);
                done(new Error(`Player error: ${JSON.stringify(e)}`));
            });

        }, 45000); // Extended timeout for live content with status updates

    });
});