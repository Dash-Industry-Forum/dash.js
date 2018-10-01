function ErrorHandlerMock () {
    this.errorValue = undefined;
    this.errorCode = undefined;

    this.manifestError = function (error) {
        this.errorValue = error;
    };

    this.mediaSourceError = function (error) {
        this.errorValue = error;
    };

    this.mediaKeySessionError = function (error) {
        this.errorValue = error;
    };

    this.error = function (errorObj) {
        this.errorCode = errorObj.code;
        this.errorValue = errorObj.message;
    };

    this.timedTextError = function (error, msg) {
        this.errorValue = msg;
    };
}

export default ErrorHandlerMock;