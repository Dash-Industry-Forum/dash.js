import Debug from '../../../../src/core/Debug.js';
import Settings from '../../../../src/core/Settings.js';
import { expect, vi } from 'vite-plus/test';


let context, debug, settings;

describe('Debug', function () {
    beforeEach(function () {
        for (const method of ['log', 'debug', 'info', 'warn', 'error']) {
            vi.spyOn(console, method).mockImplementation(() => {});
        }
        // Debug binds the console functions when it is created, so every test needs
        // a fresh instance that picks up the spies of that test.
        context = {};
        settings = Settings(context).getInstance();
        debug = Debug(context).getInstance({settings: settings});
    });

    it('Default values', function () {
        var logLevel = settings.get().debug.logLevel;
        expect(logLevel).to.equal(Debug.LOG_LEVEL_WARNING);
    });

    it('should set log level', function () {
        const s = { debug: { logLevel: Debug.LOG_LEVEL_NONE }};
        settings.update(s);
        var logLevel = settings.get().debug.logLevel;
        expect(logLevel).to.equal(Debug.LOG_LEVEL_NONE);
    });

    describe('Log Levels', function () {
        it('should return a logger with the right interface', function () {
            var logger = debug.getLogger();
            expect(logger.debug).to.be.instanceOf(Function);
            expect(logger.info).to.be.instanceOf(Function);
            expect(logger.warn).to.be.instanceOf(Function);
            expect(logger.error).to.be.instanceOf(Function);
            expect(logger.fatal).to.be.instanceOf(Function);
        });

        it('shouldnt write logs when LOG_LEVEL_NONE level is set', function () {
            var logger = debug.getLogger();

            const s = { debug: { logLevel: Debug.LOG_LEVEL_NONE }};
            settings.update(s);
            logger.fatal('Fatal error');
            expect(window.console.error).not.toHaveBeenCalled();
            logger.error('Error');
            expect(window.console.error).not.toHaveBeenCalled();
            logger.warn('Warning');
            expect(window.console.warn).not.toHaveBeenCalled();
            logger.info('Info');
            expect(window.console.info).not.toHaveBeenCalled();
            logger.debug('debug');
            expect(window.console.debug).not.toHaveBeenCalled();
        });

        it('should manage log levels correctly', function () {
            var logger = debug.getLogger();
            // Debug
            let s = { debug: { logLevel: Debug.LOG_LEVEL_DEBUG }};
            settings.update(s);

            logger.debug('debug message');
            expect(window.console.debug).toHaveBeenCalledOnce();

            logger.fatal('Fatal error');
            expect(window.console.error).toHaveBeenCalledOnce();

            // Warning
            s = { debug: { logLevel: Debug.LOG_LEVEL_WARNING }};
            settings.update(s);

            logger.debug('debug');
            // Still only the call made at debug level
            expect(window.console.debug).toHaveBeenCalledOnce();

            logger.warn('Warning');
            expect(window.console.warn).toHaveBeenCalledOnce();

            logger.error('Error');
            // The fatal call above plus this error call
            expect(window.console.error).toHaveBeenCalledTimes(2);
        });
    });
});
