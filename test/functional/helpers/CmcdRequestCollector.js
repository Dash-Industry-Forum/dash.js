const CMCD_HEADER_NAMES = [
    'cmcd-object',
    'cmcd-request',
    'cmcd-session',
    'cmcd-status',
];

function classifyUrl(url, method) {
    if (method === 'POST') return 'event';
    if (/\.mpd/i.test(url)) return 'manifest';
    if (/\.(m4s|m4v|m4a|mp4)/i.test(url)) return 'segment';
    return 'unknown';
}

function detectReportingMode(url, headers) {
    const hasCmcdHeaders = CMCD_HEADER_NAMES.some((name) => headers[name]);
    if (hasCmcdHeaders) return 'header';
    if (url.includes('CMCD=')) return 'query';
    return null;
}

/**
 * Collects CMCD request data from outgoing XHR requests by monkey-patching
 * XMLHttpRequest prototype methods. Stores full httpRequest objects compatible
 * with CML's validateCmcdRequest().
 *
 * For event target URLs, intercepts POST requests and simulates a 200
 * response to prevent actual network calls.
 */
class CmcdRequestCollector {

    constructor() {
        this.requests = [];
        this._resolvers = [];
        this._eventTargetUrls = [];
        this._origOpen = null;
        this._origSetRequestHeader = null;
        this._origSend = null;
    }

    /**
     * Install XHR patches to start collecting CMCD data.
     * @param {object} [options]
     * @param {string[]} [options.eventTargetUrls] - URLs to intercept as event POSTs
     */
    attach(options = {}) {
        this._eventTargetUrls = options.eventTargetUrls || [];

        const self = this;

        this._origOpen = XMLHttpRequest.prototype.open;
        this._origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        this._origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._cmcd_method = method;
            this._cmcd_url = typeof url === 'string' ? url : String(url);
            this._cmcd_headers = {};
            return self._origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
            if (this._cmcd_headers) {
                this._cmcd_headers[name.toLowerCase()] = value;
            }
            return self._origSetRequestHeader.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            const url = this._cmcd_url || '';
            const method = (this._cmcd_method || 'GET').toUpperCase();
            const headers = this._cmcd_headers || {};

            // Event target POST interception
            const isEventTarget = self._eventTargetUrls.some(
                (target) => url.startsWith(target)
            );

            if (isEventTarget && method === 'POST') {
                self.requests.push({
                    httpRequest: { url, method, headers, body },
                    type: 'event',
                    reportingMode: 'event',
                    timestamp: Date.now(),
                });
                self._notifyResolvers('event');

                // Simulate 200 response matching XHRLoader expectations
                const xhr = this;
                setTimeout(() => {
                    try {
                        Object.defineProperty(xhr, 'status', { value: 200, configurable: true });
                        Object.defineProperty(xhr, 'statusText', { value: 'OK', configurable: true });
                        Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
                        Object.defineProperty(xhr, 'responseURL', { value: url, configurable: true });
                        Object.defineProperty(xhr, 'response', { value: '', configurable: true });
                        Object.defineProperty(xhr, 'responseText', { value: '', configurable: true });
                        xhr.getAllResponseHeaders = () => '';

                        if (typeof xhr.onload === 'function') {
                            xhr.onload.call(xhr);
                        }
                        if (typeof xhr.onloadend === 'function') {
                            xhr.onloadend.call(xhr);
                        }
                    } catch (e) {
                        console.error('Failed to simulate XHR response:', e);
                    }
                }, 0);
                return;
            }

            // Passive collection for media requests
            const type = classifyUrl(url, method);
            if (type === 'manifest' || type === 'segment') {
                const reportingMode = detectReportingMode(url, headers);
                if (reportingMode) {
                    self.requests.push({
                        httpRequest: { url, method, headers },
                        type,
                        reportingMode,
                        timestamp: Date.now(),
                    });
                    self._notifyResolvers(type);
                }
            }

            return self._origSend.apply(this, arguments);
        };
    }

    /**
     * Remove XHR patches and stop collecting.
     */
    detach() {
        if (this._origOpen) {
            XMLHttpRequest.prototype.open = this._origOpen;
        }
        if (this._origSetRequestHeader) {
            XMLHttpRequest.prototype.setRequestHeader = this._origSetRequestHeader;
        }
        if (this._origSend) {
            XMLHttpRequest.prototype.send = this._origSend;
        }
        this._origOpen = null;
        this._origSetRequestHeader = null;
        this._origSend = null;
    }

    /**
     * Get collected requests, optionally filtered by type.
     * @param {'manifest'|'segment'|'event'|'unknown'} [type]
     * @returns {Array}
     */
    getRequests(type) {
        if (!type) return this.requests;
        return this.requests.filter((r) => r.type === type);
    }

    /**
     * Wait until at least `count` requests of the given type have been collected.
     * @param {'manifest'|'segment'|'event'|'unknown'} type
     * @param {number} count
     * @param {number} [timeout=15000]
     * @returns {Promise<Array>}
     */
    waitForRequests(type, count, timeout = 15000) {
        const current = this.getRequests(type);
        if (current.length >= count) {
            return Promise.resolve(current);
        }

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this._resolvers = this._resolvers.filter((r) => r !== entry);
                resolve(this.getRequests(type));
            }, timeout);

            const entry = {
                type,
                count,
                resolve: (result) => {
                    clearTimeout(timer);
                    resolve(result);
                },
            };
            this._resolvers.push(entry);
        });
    }

    clear() {
        this.requests = [];
    }

    _notifyResolvers(type) {
        this._resolvers = this._resolvers.filter((r) => {
            if (r.type !== type) return true;
            const requests = this.getRequests(r.type);
            if (requests.length >= r.count) {
                r.resolve(requests);
                return false;
            }
            return true;
        });
    }
}

export default CmcdRequestCollector;
