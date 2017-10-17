function ErrorHandlerMock () {
    this.error = undefined;

    this.manifestError = function (error) {
        this.error = error;
    };

    this.mediaSourceError = function (error) {
        this.error = error;
    };
}

export default ErrorHandlerMock;