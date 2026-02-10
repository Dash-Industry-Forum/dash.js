class CommonMediaRequest {
    /**
     * @param {Object} params
     * @param {string} params.url
     * @param {string} params.method
     * @param {BodyInit} [params.body]
     * @param {string} [params.responseType]
     * @param {Object<string, string>} [params.headers]
     * @param {RequestCredentials} [params.credentials]
     * @param {RequestMode} [params.mode]
     * @param {number} [params.timeout]
     * @param {Object} [params.customData]
     */
    constructor(params) {
        this.url = params.url;
        this.method = params.method;
        this.body = params.body !== undefined ? params.body : null;
        this.responseType = params.responseType !== undefined ? params.responseType : null;
        this.headers = params.headers !== undefined ? params.headers : {};
        this.credentials = params.credentials !== undefined ? params.credentials : null;
        this.mode = params.mode !== undefined ? params.mode : null;
        this.timeout = params.timeout !== undefined ? params.timeout : 0;
        this.customData = params.customData !== undefined ? params.customData : {};
    }
}

export default CommonMediaRequest;
