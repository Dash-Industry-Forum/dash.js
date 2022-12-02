import Debug from '../../src/core/Debug';
import Settings from '../../src/core/Settings';

const chai = require('chai');
const expect = chai.expect;
const spies = require('chai-spies');

chai.use(spies);

const context = {};
let debug, settings;

describe('Debug', function () {
    before(function () {
        if (typeof window === 'undefined') {
            global.window = {
                console: {
                    log: chai.spy(),
                    debug: chai.spy(),
                    info: chai.spy(),
                    warn: chai.spy(),
                    error: chai.spy()
                }
            };
        }
    });

    after(function () {
        delete global.window;
    });

    beforeEach(function () {
        settings = Settings(context).getInstance();
        debug = Debug(context).getInstance({settings: settings});
    });

    afterEach(function () {
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
            expect(global.window.console.error).not.to.have.been.called; // jshint ignore:line
            logger.error('Error');
            expect(global.window.console.error).not.to.have.been.called; // jshint ignore:line
            logger.warn('Warning');
            expect(global.window.console.warn).not.to.have.been.called; // jshint ignore:line
            logger.info('Info');
            expect(global.window.console.info).not.to.have.been.called; // jshint ignore:line
            logger.debug('debug');
            expect(global.window.console.debug).not.to.have.been.called; // jshint ignore:line
        });

        it('should manage log levels correctly', function () {
            var logger = debug.getLogger();
            // Debug
            let s = { debug: { logLevel: Debug.LOG_LEVEL_DEBUG }};
            settings.update(s);

            logger.debug('debug message');
            expect(global.window.console.debug).to.have.been.called.once; // jshint ignore:line

            logger.fatal('Fatal error');
            expect(global.window.console.error).to.have.been.called.once; // jshint ignore:line

            // Warning
            s = { debug: { logLevel: Debug.LOG_LEVEL_WARNING }};
            settings.update(s);

            logger.debug('debug');
            expect(global.window.console.debug).not.to.have.been.called; // jshint ignore:line

            logger.warn('Warning');
            expect(global.window.console.warn).to.have.been.called.once; // jshint ignore:line

            logger.error('Error');
            expect(global.window.console.warn).to.have.been.called.once; // jshint ignore:line
        });
    });
});
