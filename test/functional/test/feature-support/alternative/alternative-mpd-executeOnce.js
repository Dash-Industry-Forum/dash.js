import Constants from '../../../../../src/streaming/constants/Constants.js';
import Utils from '../../../src/Utils.js';
import { initializeDashJsAdapterForAlternativMedia } from '../../common/common.js';
import { expect } from 'chai';

/**
 * Utility function to modify a manifest by setting executeOnce to a specific value
 * Also stores the original value for cleanup purposes
 */
function injectExecuteOnce(player, manifestUrl, executeOnceValue, callback) {
    const mediaPlayer = player.player;
    let originalValue = null;
    
    mediaPlayer.retrieveManifest(manifestUrl, (manifest) => {
        // Find the EventStream with the insert event
        if (manifest.Period && manifest.Period[0] && manifest.Period[0].EventStream) {
            manifest.Period[0].EventStream.forEach((eventStream) => {
                if (eventStream.schemeIdUri === 'urn:mpeg:dash:event:alternativeMPD:insert:2025' && eventStream.Event) {
                    eventStream.Event.forEach((event) => {
                        if (event.InsertPresentation) {
                            // Store original value for cleanup
                            originalValue = event.InsertPresentation.executeOnce;
                            // Set executeOnce to the desired value
                            event.InsertPresentation.executeOnce = executeOnceValue;
                        }
                    });
                }
            });
        }
        
        // Attach the modified manifest
        mediaPlayer.attachSource(manifest);
        
        if (callback) {
            callback(originalValue);
        }
    });
}

Utils.getTestvectorsForTestcase('feature-support/alternative/alternative-mpd-executeOnce').forEach((item) => {
    const name = item.name;
    const url = item.url;

    describe(`Alternative MPD executeOnce functionality tests for: ${name}`, () => {

        let player;

        before(() => {
            player = initializeDashJsAdapterForAlternativMedia(item, url);
        });

        after(() => {
            if (player) {
                player.destroy();
            }
        });
        
        it('should execute insert event only once, even after seek backwards', (done) => {
            const videoElement = player.getVideoElement();
            let firstEventTriggered = false;
            let firstAlternativeContentDetected = false;
            let firstBackToOriginalDetected = false;
            let secondEventTriggered = false;
            let secondAlternativeContentDetected = false;
            let timeBeforeFirstSwitch = 0;
            let eventTriggerCount = 0;
            let alternativeContentStartCount = 0;
            
            const timeout = setTimeout(() => {
                done(new Error('Test timed out - executeOnce validation not completed within 35 seconds'));
            }, 35000); // Extended timeout for seek operations

            // Listen for alternative MPD INSERT events
            player.registerEvent(Constants.ALTERNATIVE_MPD.URIS.INSERT, () => {
                eventTriggerCount++;
                if (!firstEventTriggered) {
                    firstEventTriggered = true;
                    timeBeforeFirstSwitch = videoElement.currentTime;
                } else {
                    secondEventTriggered = true;
                }
            });

            // Listen for alternative content start events
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                if (data.event.mode === 'insert') {
                    alternativeContentStartCount++;
                    if (!firstAlternativeContentDetected) {
                        firstAlternativeContentDetected = true;
                    } else {
                        secondAlternativeContentDetected = true;
                    }
                }
            });

            // Listen for alternative content end events
            player.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                if (data.event.mode === 'insert' && !firstBackToOriginalDetected) {
                    firstBackToOriginalDetected = true;
                    
                    // Wait a moment for stability, then seek backwards to before the event presentation time
                    setTimeout(() => {
                        const seekTime = timeBeforeFirstSwitch - 2; // Seek 2 seconds before the original event
                        player.seek(seekTime);
                        
                        // Wait for seek to complete and playback to progress past the event time again
                        setTimeout(() => {
                            // Wait additional time to see if event retriggers
                            setTimeout(() => {
                                clearTimeout(timeout);
                                
                                // Basic test validations
                                expect(firstEventTriggered).to.be.true;
                                expect(firstAlternativeContentDetected).to.be.true;
                                expect(firstBackToOriginalDetected).to.be.true;
                                
                                // ExecuteOnce validations - event should NOT retrigger
                                expect(eventTriggerCount).to.equal(1);
                                expect(alternativeContentStartCount).to.equal(1);
                                expect(secondEventTriggered).to.be.false;
                                expect(secondAlternativeContentDetected).to.be.false;
                                done();
                            }, 8000); // Wait 8 seconds to verify no retriggering
                        }, 3000); // Wait 3 seconds for seek to complete
                    }, 2000); // Wait 2 seconds after alternative content ends
                }
            });

            // Handle errors
            player.registerEvent('error', (e) => {
                console.error('Player error:', e);
            });


        }, 40000); // 40 second timeout for this complex test

        it('should execute insert event multiple times when executeOnce=false, even after seek backwards', (done) => {
            // Create a new player instance for this test with modified manifest
            let testPlayer;
            
            const cleanup = () => {
                if (testPlayer) {
                    // Restore original executeOnce value to true
                    injectExecuteOnce(testPlayer, url, 'true', () => {
                        testPlayer.destroy();
                    });
                }
            };
            
            const initPlayerWithModifiedManifest = () => {
                testPlayer = initializeDashJsAdapterForAlternativMedia(item, null);
                
                injectExecuteOnce(testPlayer, url, 'false', () => {
                    runExecuteOnceFalseTest();
                });
            };
            
            const runExecuteOnceFalseTest = () => {
                const videoElement = testPlayer.getVideoElement();
                let firstEventTriggered = false;
                let firstAlternativeContentDetected = false;
                let firstBackToOriginalDetected = false;
                let secondEventTriggered = false;
                let secondAlternativeContentDetected = false;
                let timeBeforeFirstSwitch = 0;
                let eventTriggerCount = 0;
                let alternativeContentStartCount = 0;
                
                const timeout = setTimeout(() => {
                    cleanup();
                    done(new Error('Test timed out - executeOnce=false validation not completed within 45 seconds'));
                }, 45000);

                // Listen for alternative MPD INSERT events
                testPlayer.registerEvent(Constants.ALTERNATIVE_MPD.URIS.INSERT, () => {
                    eventTriggerCount++;
                    if (!firstEventTriggered) {
                        firstEventTriggered = true;
                        timeBeforeFirstSwitch = videoElement.currentTime;
                    } else if (!secondEventTriggered) {
                        secondEventTriggered = true;
                    }
                });

                // Listen for alternative content start events
                testPlayer.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, (data) => {
                    if (data.event.mode === 'insert') {
                        alternativeContentStartCount++;
                        if (!firstAlternativeContentDetected) {
                            firstAlternativeContentDetected = true;
                        } else if (!secondAlternativeContentDetected) {
                            secondAlternativeContentDetected = true;
                        }
                    }
                });

                // Listen for alternative content end events
                testPlayer.registerEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, (data) => {
                    if (data.event.mode === 'insert') {
                        if (!firstBackToOriginalDetected) {
                            firstBackToOriginalDetected = true;
                            
                            // Wait a moment for stability, then seek backwards to before the event presentation time
                            setTimeout(() => {
                                const seekTime = timeBeforeFirstSwitch - 2;
                                testPlayer.seek(seekTime);
                                
                                // Wait for seek to complete and playback to progress past the event time again
                                setTimeout(() => {
                                    // Wait additional time to allow second event to trigger
                                    setTimeout(() => {
                                        clearTimeout(timeout);
                                        
                                        // Basic test validations
                                        expect(firstEventTriggered).to.be.true;
                                        expect(firstAlternativeContentDetected).to.be.true;
                                        expect(firstBackToOriginalDetected).to.be.true;
                                        
                                        // ExecuteOnce=false validations - event SHOULD retrigger
                                        expect(eventTriggerCount).to.be.at.least(2);
                                        expect(alternativeContentStartCount).to.be.at.least(2);
                                        expect(secondEventTriggered).to.be.true;
                                        expect(secondAlternativeContentDetected).to.be.true;
                                        
                                        cleanup();
                                        done();
                                    }, 10000); // Wait 10 seconds to allow second event to complete
                                }, 3000);
                            }, 2000);
                        }
                    }
                });

                // Handle errors
                testPlayer.registerEvent('error', (e) => {
                    console.error('Player error:', e);
                    clearTimeout(timeout);
                    if (testPlayer) {
                        testPlayer.destroy();
                    }
                    done(new Error(`Player error: ${JSON.stringify(e)}`));
                });

            };
            
            // Initialize the test
            initPlayerWithModifiedManifest();
            
        }, 50000); // 50 second timeout for this complex test

    });
});