function ErrorHandlerMock () {
    this.error = undefined;

    this.manifestError = function (error) {
        this.error = error;
    };

    this.mediaSourceError = function (error) {
        this.error = error;
    };

    this.mssError = function (errorObj) {
        this.error = errorObj.message;
    };

    this.timedTextError = function (error, msg) {
        this.error = msg;
    };
}

export default ErrorHandlerMock;