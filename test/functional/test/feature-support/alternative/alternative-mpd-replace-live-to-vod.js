import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapter } from '../../common/common.js';
import { expect } from 'chai';

/**
 * Utility function to modify a live manifest by injecting Alternative MPD events
 * This simulates the functionality from the demo.html tool for live to VOD scenarios
 */
function injectAlternativeMpdEvents(player, originalManifestUrl, alternativeManifestUrl, callback) {
    // Access the underlying MediaPlayer instance
    const mediaPlayer = player.player;
    
    mediaPlayer.retrieveManifest(originalManifestUrl, (manifest) => {
        // Initialize EventStream if it doesn't exist
        if (!manifest.Period[0].EventStream) {
            manifest.Period[0].EventStream = [];
        } else {
            // Clear existing EventStreams
            manifest.Period[0].EventStream = [];
        }
        
        // Calculate presentation time for live content
        // For live streams, use current time + offset to ensure the event is in the future
        const currentPresentationTime = Date.now();
        const presentationTime = currentPresentationTime + 4000; // 4 seconds from now
        const duration = 9000;
        const earliestResolutionTimeOffset = 5000;
        const returnOffset = 9000;
        const maxDuration = 9000;
        
        // Create the replace event
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
                    returnOffset: returnOffset,
                    maxDuration: maxDuration,
                    clip: 'false',
                    startAtPlayhead: 'false'
                }
            }]
        };
        
        // Add the event to the manifest
        manifest.Period[0].EventStream.push(replaceEvent);
        
        // Attach the modified manifest using the MediaPlayer directly
        mediaPlayer.attachSource(manifest);
        
        if (callback) {
            callback();
        }
    });
}

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-replace-live-to-vod').forEach((item) => {
    const name = item.name;
    const originalUrl = item.originalUrl;
    const alternativeUrl = item.alternativeUrl;

    describe(`Alternative MPD Replace Live to VOD functionality tests for: ${name}`, () => {

        let player;

        before((done) => {
            // Initialize the player without attaching source immediately
            player = initializeDashJsAdapter(item, null);
            
            // Use the utility function to inject Alternative MPD events
            injectAlternativeMpdEvents(player, originalUrl, alternativeUrl, () => {
                done();
            });
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should play live content, switch to VOD alternative content, then back to live content', (done) => {
            const videoElement = player.getVideoElement();
            let alternativeContentDetected = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let timeAfterSwitch = 0;
            let alternativeStartTime = 0;
            let alternativeEndTime = 0;
            let expectedAlternativeDuration = 0;
            
            
            const timeout = setTimeout(() => {
                done(new Error('Test timed out - alternative MPD replace event not completed within 30 seconds'));
            }, 30000);

            // Listen for alternative MPD REPLACE events
            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, () => {
                eventTriggered = true;
            });

            // Listen for alternative content start event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeContentDetected = true;
                    alternativeStartTime = Date.now();
                    expectedAlternativeDuration = data.event.duration;
                }
            });
            
            // Listen for alternative content end event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace') {
                    timeAfterSwitch = videoElement.currentTime;
                    alternativeEndTime = Date.now();
                    backToOriginalDetected = true;
                    clearTimeout(timeout);
                    
                    // Wait to ensure stability
                    setTimeout(() => {
                        expect(eventTriggered).to.be.true;
                        expect(alternativeContentDetected).to.be.true;
                        expect(backToOriginalDetected).to.be.true;
                        
                        // Verify that alternative content played for its full duration
                        const actualAlternativeDuration = (alternativeEndTime - alternativeStartTime) / 1000; // Convert to seconds
                        expect(actualAlternativeDuration).to.be.at.least(expectedAlternativeDuration - 1); // Allow 1 second tolerance
                        expect(actualAlternativeDuration).to.be.at.most(expectedAlternativeDuration + 1); // Allow 1 second tolerance
                        
                        // For REPLACE mode from live to VOD, verify timing behavior
                        // The expected behavior is to return at presentationTime + duration or returnOffset
                        const expectedMinTime = data.event.presentationTime + data.event.duration;
                        expect(timeAfterSwitch).to.be.at.least(expectedMinTime - 1); // Allow 1 second tolerance
                        expect(timeAfterSwitch).to.be.at.most(expectedMinTime + 2); // Allow 2 seconds tolerance for live content
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