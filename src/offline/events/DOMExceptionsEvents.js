import EventsBase from '../../core/events/EventsBase';
/**
 * These are offline events that should not be needed at the player level.
 * @class
 * @ignore
 */
class DOMExceptionsEvents extends EventsBase {
    constructor () {
        super();
        this.INDEXEDDB_QUOTA_EXCEED_ERROR = 'indexedDBQuotaExceedError';
        this.INDEXEDDB_INVALID_STATE_ERROR = 'indexedDBInvalidStateError';
        this.INDEXEDDB_NOT_READABLE_ERROR = 'indexedDBNotReadableError';
        this.INDEXEDDB_NOT_FOUND_ERROR = 'indexedDBNotFoundError';
        this.INDEXEDDB_NETWORK_ERROR = 'indexedDBNetworkError';
        this.INDEXEDDB_DATA_ERROR = 'indexedDBDataError';
        this.INDEXEDDB_TRANSACTION_INACTIVE_ERROR = 'indexedDBTransactionInactiveError';
        this.INDEXEDDB_NOT_ALLOWED_ERROR = 'indexedDBNotAllowedError';
        this.INDEXEDDB_NOT_SUPPORTED_ERROR = 'indexedDBNotSupportedError';
        this.INDEXEDDB_VERSION_ERROR = 'indexedDBVersionError';
        this.INDEXEDDB_TIMEOUT_ERROR = 'indexedDBTimeoutError';
        this.INDEXEDDB_ABORT_ERROR = 'indexedDBAbortError';
        this.INDEXEDDB_UNKNOWN_ERROR = 'indexedDBUnknownError';
    }
}

let domExceptionsEvents = new DOMExceptionsEvents();
export default domExceptionsEvents;
//based on https://developer.mozilla.org/fr/docs/Web/API/DOMException
