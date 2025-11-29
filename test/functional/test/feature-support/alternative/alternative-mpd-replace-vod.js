import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

// Executes with:
// test/functional/content/alternative-mpd/alternative-mpd-replace-vod-to-vod.mpd
// test/functional/content/alternative-mpd/alternative-mpd-replace-vod-to-live.mpd

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-replace-vod').forEach((item) => {
    const name = item.name;
    const url = item.url;

    describe(`Alternative MPD Replace functionality tests for: ${name}`, () => {

        let player;

        before(() => {
            player = initializeDashJsAdapterForAlternativMedia(item, url);
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });

        it('should play original content, switch to alternative content, then back to original', (done) => {
            const videoElement = player.getVideoElement();
            let alternativeContentDetected = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let timeAfterSwitch = 0;
            let alternativeStartTime = 0;
            let alternativeEndTime = 0;
            let expectedAlternativeDuration = 0;
            
            const timeout = setTimeout(() => {
                done(new Error('Test timed out - alternative MPD replace event not completed within 25 seconds'));
            }, 25000); // 25 seconds should be enough for full test

            // Listen for alternative MPD REPLACE events
            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, () => {
                eventTriggered = true;
            });

            // Listen for alternative content start event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'replace') {
                    alternativeContentDetected = true;
                    alternativeStartTime = player.getCurrentTime();
                    expectedAlternativeDuration = data.event.duration;
                    // Validate that alternativeStartTime is close to presentation time
                    expect(alternativeStartTime).to.be.closeTo(5, 1);
                }
            });
            
            // Listen for alternative content end event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'replace') {
                    timeAfterSwitch = videoElement.currentTime;
                    alternativeEndTime = player.getCurrentTime();
                    backToOriginalDetected = true;
                    clearTimeout(timeout);
                    
                    // Wait to ensure stability
                    setTimeout(() => {
                        expect(eventTriggered).to.be.true;
                        expect(alternativeContentDetected).to.be.true;
                        expect(backToOriginalDetected).to.be.true;
                        
                        // Verify that alternative content played for its full duration
                        const actualAlternativeDuration = alternativeEndTime - alternativeStartTime; // Both are in seconds now
                        expect(actualAlternativeDuration).to.be.at.least(expectedAlternativeDuration - 1); // Allow 1 second tolerance
                        expect(actualAlternativeDuration).to.be.at.most(expectedAlternativeDuration + 1.5); // Allow 1.5 second tolerance
                        
                        // For REPLACE mode, it expectes to return on presentationTime + duration
                        const expectedMinTime = data.event.presentationTime + data.event.duration;
                        expect(timeAfterSwitch).equals(expectedMinTime);
                        done();
                    }, 2000);
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                clearTimeout(timeout);
                done(new Error(`Player error: ${JSON.stringify(e)}`));
            });

        }, 30000);

    });
});