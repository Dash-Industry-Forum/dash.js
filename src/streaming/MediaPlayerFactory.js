import FactoryMaker from '../core/FactoryMaker.js';
import MediaPlayer from './MediaPlayer.js';

function MediaPlayerFactory() {

    /**
     * mime-type identifier for any source content to be accepted as a dash manifest by the create() method.
     * @type {string}
     */
    const SUPPORTED_MIME_TYPE = 'application/dash+xml';

    let instance;

    /**
     *  A new MediaPlayer is instantiated for the supplied videoElement and optional source and context.  If no context is provided,
     *  a default DashContext is used. If no source is provided, the videoElement is interrogated to extract the first source whose
     *  type is application/dash+xml.
     * The autoplay property of the videoElement is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
     * @param video
     * @param source
     * @returns {MediaPlayer}
     */
    function create(video, source, context) {
        if (video === null || typeof video === 'undefined' || video.nodeName !== 'VIDEO') return null;

        var player;
        var videoID = (video.id || video.name || 'video element');

        source = source || [].slice.call(video.querySelectorAll('source')).filter(function (s) {
                return s.type == SUPPORTED_MIME_TYPE;
            })[0];
        if (source === undefined && video.src) {
            source = document.createElement('source');
            source.src = video.src;
        } else if (source === undefined && !video.src) {
            return null;
        }
        if (context === undefined) {
            context = {};
        }
        player = MediaPlayer(context).create();
        player.initialize(video, source.src, video.autoplay);
        player.getDebug().log('Converted ' + videoID + ' to dash.js player and added content: ' + source.src);
        return player;
    }

    /**
     * Searches the provided scope for all instances of the indicated className. If no scope is provided, document is used. If no className is
     * specified, dashjs-player is used. It then looks for those video elements which have a source element defined with a type matching 'application/dash+xml'.
     * A new MediaPlayer is instantiated for each matching video element and the appropriate source is assigned.
     * The autoplay property of the video element is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
     * Returns an array holding all the MediaPlayer instances that were added by this method.
     * @param className
     * @param scope
     * @param context
     * @returns {Array} an array of MediaPlayer objects
     */
    function createAll(className, scope) {
        var aPlayers = [];
        className = className || '.dashjs-player';
        scope = scope || document;
        var videos = scope.querySelectorAll(className);
        for (var i = 0; i < videos.length; i++) {
            var player = create(videos[i], null);
            aPlayers.push(player);
        }
        return aPlayers;
    }

    instance = {
        create: create,
        createAll: createAll
    };

    return instance;
}
MediaPlayerFactory.__dashjs_factory_name = 'MediaPlayerFactory';
export default FactoryMaker.getSingletonFactory(MediaPlayerFactory);