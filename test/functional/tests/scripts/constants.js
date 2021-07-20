module.exports = {
    EVENT_TIMEOUT: 10,      // Timeout (in sec.) for receiving player or video element events
    PROGRESS_DELAY: 3,      // Playback progress delay (in sec.) to be checked
    SEEK_END_SHIFT: 10,     // Shift (in sec.) when seeking to end
    DURATION_TOLERANCE: 3,  // Tolerance for duration (for seeking)

    SEEKBAR: {              // seekbar see \samples\functional-tests\index.html
        width: 220,
        height: 7,
        thumbnailPaddingLeftRight: 5,
    }     
}