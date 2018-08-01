function DebugMock () {
    let instance;
    let log = {};

    function getLogger(instance) {
        return {
            fatal: fatal.bind(instance),
            error: error.bind(instance),
            warn: warn.bind(instance),
            info: info.bind(instance),
            debug: debug.bind(instance)
        };
    }

    function fatal(param) {
        instance.log.fatal = param;
    }

    function error(param) {
        instance.log.error = param;
    }

    function warn(param) {
        instance.log.warn = param;
    }

    function info(param) {
        instance.log.info = param;
    }

    function debug(param) {
        instance.log.debug = param;
    }

    instance = {
        getLogger: getLogger,
        log: log
    };

    return instance;
}

export default DebugMock;