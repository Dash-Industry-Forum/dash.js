import MediaPlayer from '../../../../src/streaming/MediaPlayer.js';
import { expect } from 'chai';

// Refactor guard: the public surface of MediaPlayer must not change while its internals are split into modules.
const PUBLIC_API = [
    'addABRCustomRule',
    'addExternalSubtitle',
    'addRequestInterceptor',
    'addResponseInterceptor',
    'addUTCTimingSource',
    'attachProtectionController',
    'attachSource',
    'attachTTMLRenderingDiv',
    'attachView',
    'attachVttRenderingDiv',
    'clearDefaultUTCTimingSources',
    'convertToTimeCode',
    'destroy',
    'duration',
    'enableForcedTextStreaming',
    'enableText',
    'extend',
    'formatUTC',
    'getABRCustomRules',
    'getActiveStream',
    'getAutoPlay',
    'getAvailableBaseUrls',
    'getAvailableLocations',
    'getAverageLatency',
    'getAverageThroughput',
    'getBufferLength',
    'getCurrentLiveLatency',
    'getCurrentRepresentationForType',
    'getCurrentSteeringResponseData',
    'getCurrentTextTrackIndex',
    'getCurrentTrackFor',
    'getDashAdapter',
    'getDashMetrics',
    'getDebug',
    'getDvrSeekOffset',
    'getDvrWindow',
    'getExternalSubtitles',
    'getInitCache',
    'getInitialMediaSettingsFor',
    'getLowLatencyModeEnabled',
    'getManifest',
    'getOfflineController',
    'getPlaybackRate',
    'getProtectionController',
    'getProtectionData',
    'getRawThroughputData',
    'getRepresentationsByType',
    'getRepresentationsByTypeUnfiltered',
    'getSafeAverageThroughput',
    'getSettings',
    'getSource',
    'getStreamsFromManifest',
    'getTTMLRenderingDiv',
    'getTargetLiveDelay',
    'getTracksFor',
    'getTracksForTypeFromManifest',
    'getVersion',
    'getVideoElement',
    'getVolume',
    'getXHRWithCredentialsForType',
    'initialize',
    'isDynamic',
    'isMuted',
    'isPaused',
    'isReady',
    'isSeeking',
    'isTextEnabled',
    'off',
    'on',
    'pause',
    'play',
    'preload',
    'provideThumbnail',
    'refreshManifest',
    'registerCertificateRequestFilter',
    'registerCertificateResponseFilter',
    'registerCustomCapabilitiesFilter',
    'registerLicenseRequestFilter',
    'registerLicenseResponseFilter',
    'removeABRCustomRule',
    'removeAllABRCustomRule',
    'removeExternalSubtitleById',
    'removeExternalSubtitleByUrl',
    'removeRequestInterceptor',
    'removeResponseInterceptor',
    'removeUTCTimingSource',
    'reset',
    'resetCustomInitialTrackSelectionFunction',
    'resetSettings',
    'restoreDefaultUTCTimingSources',
    'retrieveManifest',
    'seek',
    'seekToOriginalLive',
    'seekToPresentationTime',
    'setAutoPlay',
    'setConfig',
    'setCurrentTrack',
    'setCustomInitialTrackSelectionFunction',
    'setInitialMediaSettingsFor',
    'setMute',
    'setPlaybackRate',
    'setProtectionData',
    'setRepresentationForTypeById',
    'setRepresentationForTypeByIndex',
    'setTextTrack',
    'setVolume',
    'setXHRWithCredentialsForType',
    'time',
    'timeAsUTC',
    'timeInDvrWindow',
    'trigger',
    'triggerSteeringRequest',
    'unregisterCertificateRequestFilter',
    'unregisterCertificateResponseFilter',
    'unregisterCustomCapabilitiesFilter',
    'unregisterLicenseRequestFilter',
    'unregisterLicenseResponseFilter',
    'updateSettings',
    'updateSource',
    'getClassName', // added by FactoryMaker.merge
].sort();

describe('MediaPlayer API surface', function () {
    let player;

    beforeEach(function () {
        player = MediaPlayer({}).create();
    });

    it('exposes exactly the expected public methods', function () {
        expect(Object.keys(player).sort()).to.deep.equal(PUBLIC_API);
        PUBLIC_API.forEach((name) => {
            expect(player[name], name).to.be.a('function');
        });
    });

    it('applies extend() to API sub-modules', function () {
        player.extend('TextApi', function () {
            return { isTextEnabled: () => 'x' };
        }, true);
        expect(player.isTextEnabled()).to.equal('x');
    });

    it('returns the registered external subtitles', function () {
        expect(player.getExternalSubtitles()).to.be.instanceOf(Set);
    });
});
