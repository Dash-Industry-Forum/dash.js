function ErrorHandlerMock () {
    this.errorValue = undefined;

    this.manifestError = function (error) {
        this.errorValue = error;
    };

    this.mediaSourceError = function (error) {
        this.errorValue = error;
    };

    this.error = function (errorObj) {
        this.errorValue = errorObj.message;
    };

    this.timedTextError = function (error, msg) {
        this.error = msg;
    };
}

export default ErrorHandlerMock;