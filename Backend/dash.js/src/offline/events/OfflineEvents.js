import EventsBase from './../../core/events/EventsBase';
/**
 * These are offline events that should be sent to the player level.
 * @class
 */
class OfflineEvents extends EventsBase {
    constructor () {
        super();

        /**
        * Triggered when all mediaInfo has been loaded
        * @event OfflineEvents#OFFLINE_RECORD_LOADEDMETADATA
        */
        this.OFFLINE_RECORD_LOADEDMETADATA = 'public_offlineRecordLoadedmetadata';

        /**
        * Triggered when a record is initialized and download is started
        * @event OfflineEvents#OFFLINE_RECORD_STARTED
        */
        this.OFFLINE_RECORD_STARTED = 'public_offlineRecordStarted';

        /**
        * Triggered when the user stop downloading a record
        * @event OfflineEvents#OFFLINE_RECORD_STOPPED
        */
        this.OFFLINE_RECORD_STOPPED = 'public_offlineRecordStopped';

        /**
        * Triggered when all record has been downloaded
        * @event OfflineEvents#OFFLINE_RECORD_FINISHED
        */
        this.OFFLINE_RECORD_FINISHED = 'public_offlineRecordFinished';
    }
}

let offlineEvents = new OfflineEvents();
export default offlineEvents;
