import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapter } from '../../common/common.js';
import { expect } from 'chai';

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-insert-vod').forEach((item) => {
    const name = item.name;
    const url = item.url;

    describe(`Alternative MPD Insert functionality tests for: ${name}`, () => {

        let player;

        before(() => {
            player = initializeDashJsAdapter(item, url);
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });
        
        it('should play original content, insert alternative content, then resume original at same position', (done) => {
            const videoElement = player.getVideoElement();
            let alternativeContentDetected = false;
            let backToOriginalDetected = false;
            let eventTriggered = false;
            let timeBeforeSwitch = 0;
            let timeAfterSwitch = 0;
            let alternativeStartTime = 0;
            let alternativeEndTime = 0;
            let expectedAlternativeDuration = 0;
            
            const timeout = setTimeout(() => {
                done(new Error('Test timed out - alternative MPD insert event not completed within 25 seconds'));
            }, 25000);

            // Listen for alternative MPD INSERT events
            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.INSERT, () => {
                eventTriggered = true;
                timeBeforeSwitch = videoElement.currentTime;
            });

            // Listen for alternative content start event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'insert') {
                    alternativeContentDetected = true;
                    alternativeStartTime = Date.now();
                    expectedAlternativeDuration = data.event.duration;
                }
            });

            // Listen for alternative content end event
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'insert') {
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
                        
                        // For INSERT mode, it expects to return close to the original presentation time
                        expect(Math.abs(timeAfterSwitch - timeBeforeSwitch)).to.be.below(1);
                        done();
                    }, 2000);
                }
            });


            // Handle errors
            player.registerEvent('error', (e) => {
                console.error('Player error:', e);
            });

        }, 35000);

    });
});