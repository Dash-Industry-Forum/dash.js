class HttpLoaderRequest {
    constructor(params) {
        /**
         * Request URL
         */
        this.url = params.url;

        /**
         * HTTP Request method, e.g. GET
         */

        this.method = params.method;
        /**
         * Indicates whether cross-site Access-Control requests should be made
         */
        this.withCredentials = params.withCredentials;

        /**
         * The request object e.g an instance of FragmentRequest
         */
        this.request = params.request;

        /**
         * Callback function
         */
        this.onload = params.onload;

        /**
         * Callback function
         */
        this.onloadend = params.onloadend;

        /**
         * Callback function
         */
        this.onerror = params.onerror;

        /**
         * Callback function
         */
        this.progress = params.progress;

        /**
         * Callback function
         */
        this.ontimeout = params.ontimeout;

        /**
         * Instance of the loader either Fetch or XHR
         */
        this.loader = params.loader;

        /**
         * Timeout in ms
         */
        this.timeout = params.timeout;

        /**
         * Additional headers
         */
        this.headers = params.headers;

        /**
         * Save the response here
         * @type {{}}
         */
        this.response = {}
    }
}

export default HttpLoaderRequest
