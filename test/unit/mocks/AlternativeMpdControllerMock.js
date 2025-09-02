/**
 * Mock utilities for AlternativeMpdController testing
 * Provides mocked data, network responses, and MediaPlayer functionality
 */

// Mock data constants
const MOCK_URLS = {
    ALTERNATIVE_MPD: 'alternative.mpd',
    NONEXISTENT_MPD: 'nonexistent-alternative.mpd',
    INVALID_MPD: 'invalid-alternative.mpd'
};

const MOCK_MPD_DATA = {
    type: 'static',
    mediaPresentationDuration: 10,
    periods: [{
        id: 'alternative-period-1',
        duration: 10,
        adaptationSets: [{
            id: 'alternative-video',
            contentType: 'video',
            representations: [{
                id: 'alternative-rep-1',
                bandwidth: 1000000,
                width: 1920,
                height: 1080,
                segments: [{
                    url: 'alternative-segment-1.m4s',
                    duration: 2
                }]
            }]
        }]
    }]
};

// Mock video element with enhanced functionality for testing
function createMockVideoElement() {
    const mockVideo = {
        style: {},
        currentTime: 0,
        duration: 10,
        paused: true,
        ended: false,
        readyState: 4,
        networkState: 3,
        nodeType: 1, // ELEMENT_NODE
        nodeName: 'VIDEO',
        tagName: 'VIDEO',
        localName: 'video',
        play: function() { 
            this.paused = false;
            return Promise.resolve(); 
        },
        pause: function() { 
            this.paused = true; 
        },
        load: function() {},
        addEventListener: function() {},
        removeEventListener: function() {},
        setAttribute: function() {},
        getAttribute: function() { return null; },
        dispatchEvent: function() {},
        appendChild: function() {},
        removeChild: function() {},
        parentNode: null,
        // Add properties to help it pass DOM element checks
        ownerDocument: document,
        isConnected: false
    };
    
    // Make it appear as a proper HTMLVideoElement
    Object.setPrototypeOf(mockVideo, HTMLVideoElement.prototype);
    
    // Make style properties actually modify the style object
    Object.defineProperty(mockVideo.style, 'display', {
        get: function() { return this._display || 'block'; },
        set: function(value) { this._display = value; },
        enumerable: true
    });
    
    return mockVideo;
}

// Mock MediaPlayer creation for alternative content
function createMockMediaPlayer() {
    const mockVideoElement = createMockVideoElement();
    const mockPlayer = {
        initialize: function() { return Promise.resolve(); },
        attachSource: function() { return Promise.resolve(); },
        play: function() { return mockVideoElement.play(); },
        pause: function() { mockVideoElement.pause(); },
        getVideoElement: function() { return mockVideoElement; },
        destroy: function() {},
        on: function() {},
        off: function() {},
        time: function() { return mockVideoElement.currentTime; },
        seek: function(time) { mockVideoElement.currentTime = time; }
    };
    return mockPlayer;
}

// Mock network responses for alternative MPD requests
const mockNetworkResponses = new Map();
mockNetworkResponses.set(MOCK_URLS.ALTERNATIVE_MPD, {
    status: 200,
    data: MOCK_MPD_DATA,
    contentType: 'application/dash+xml'
});
mockNetworkResponses.set(MOCK_URLS.NONEXISTENT_MPD, {
    status: 404,
    error: 'File not found'
});
mockNetworkResponses.set(MOCK_URLS.INVALID_MPD, {
    status: 200,
    data: 'invalid xml content',
    contentType: 'application/dash+xml'
});

let originalFetch;
function setupMockNetwork() {
    if (typeof window !== 'undefined' && window.fetch) {
        originalFetch = window.fetch;
        
        window.fetch = function(url) {
            const response = mockNetworkResponses.get(url);
            if (response) {
                return Promise.resolve({
                    status: response.status,
                    ok: response.status >= 200 && response.status < 300,
                    text: () => Promise.resolve(typeof response.data === 'string' ? response.data : JSON.stringify(response.data)),
                    json: () => Promise.resolve(response.data),
                    headers: {
                        get: (header) => header.toLowerCase() === 'content-type' ? response.contentType : null
                    }
                });
            }
            return Promise.reject(new Error(`Network request to ${url} was not mocked`));
        };
    }
}

function teardownMockNetwork() {
    if (typeof window !== 'undefined' && originalFetch) {
        window.fetch = originalFetch;
    }
}

// Mock alternative MediaPlayer instantiation
let mockMediaPlayers = [];
function mockMediaPlayerCreation() {
    let originalMediaPlayer;
    
    if (typeof window !== 'undefined') {
        originalMediaPlayer = window.MediaPlayer || {};
        window.MediaPlayer = function() {
            const mockPlayer = createMockMediaPlayer();
            mockMediaPlayers.push(mockPlayer);
            return mockPlayer;
        };
    }
    
    return originalMediaPlayer;
}

function cleanupMockMediaPlayers() {
    mockMediaPlayers.forEach(player => {
        if (player.destroy) {
            player.destroy();
        }
    });
    mockMediaPlayers = [];
}

// Enhanced document.createElement mock for alternative video elements
let originalCreateElement;
function setupMockDocumentCreation() {
    originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        if (tagName.toLowerCase() === 'video') {
            return createMockVideoElement();
        }
        return originalCreateElement.call(document, tagName);
    };
}

function teardownMockDocumentCreation() {
    if (originalCreateElement) {
        document.createElement = originalCreateElement;
    }
}

export default {
    MOCK_URLS,
    MOCK_MPD_DATA,
    createMockVideoElement,
    createMockMediaPlayer,
    setupMockNetwork,
    teardownMockNetwork,
    mockMediaPlayerCreation,
    cleanupMockMediaPlayers,
    setupMockDocumentCreation,
    teardownMockDocumentCreation
};