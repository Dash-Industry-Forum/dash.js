function ErrorHandlerMock () {
    this.errorValue = undefined;
    this.errorCode = undefined;

    this.error = function (errorObj) {
        this.errorCode = errorObj.code;
        this.errorValue = errorObj.message;
    };

    this.indexedDBError = function (error, msg) {
        this.error = msg;
    };

    this.reset = function () {
        this.errorValue = undefined;
        this.errorCode = undefined;
    };
}

export default ErrorHandlerMock;
