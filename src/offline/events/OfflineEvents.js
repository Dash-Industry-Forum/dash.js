import EventsBase from './../../core/events/EventsBase';
/**
 * These are offline events that should be sent to the player level.
 * @class
 * @ignore
 */
class OfflineEvents extends EventsBase {
    constructor () {
        super();

        this.DOWNLOADING_PAUSED = 'downloadingPaused';

        /**
         * Triggered when all mediaInfo has been loaded on OfflineStream
         * Return a list of available bitrateInfo needed to download stream.
         */
        this.DOWNLOADABLE_REPRESENTATIONS_LOADED = 'public_downloadableRepresentationsInfoLoaded';

        this.DASH_ELEMENTS_CREATION_NEEDED = 'dashElementsCreationNeeded';

        /** Triggered when the downloading is initialize and started
        * @event OfflineEvents#DOWNLOADING_STOPPED
        */
        this.DOWNLOADING_STARTED = 'public_downloadingStarted';

        /**
        * Triggered when the user stop current downloading
        * @event OfflineEvents#DOWNLOADING_STOPPED
        */
        this.DOWNLOADING_STOPPED = 'public_downloadingStopped';

        /**
        * Triggered when all fragments has been downloaded
        * @event OfflineEvents#DOWNLOADING_FINISHED
        */
        this.DOWNLOADING_FINISHED = 'public_downloadingFinished';
    }
}

let offlineEvents = new OfflineEvents();
export default offlineEvents;
