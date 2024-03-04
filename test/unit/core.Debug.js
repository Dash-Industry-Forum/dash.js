import Debug from '../../src/core/Debug.js';
import Settings from '../../src/core/Settings.js';
import chai from 'chai';
import spies from 'chai-spies';

const expect = chai.expect;
chai.use(spies);

const context = {};
let debug, settings;

describe('Debug', function () {
    before(function () {
        chai.spy.on(console, ['log', 'debug','info','warn','error'], () => {})
    });

    after(function () {
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
            expect(window.console.error).not.to.have.been.called; // jshint ignore:line
            logger.error('Error');
            expect(window.console.error).not.to.have.been.called; // jshint ignore:line
            logger.warn('Warning');
            expect(window.console.warn).not.to.have.been.called; // jshint ignore:line
            logger.info('Info');
            expect(window.console.info).not.to.have.been.called; // jshint ignore:line
            logger.debug('debug');
            expect(window.console.debug).not.to.have.been.called; // jshint ignore:line
        });

        it('should manage log levels correctly', function () {
            var logger = debug.getLogger();
            // Debug
            let s = { debug: { logLevel: Debug.LOG_LEVEL_DEBUG }};
            settings.update(s);

            logger.debug('debug message');
            expect(window.console.debug).to.have.been.called.once; // jshint ignore:line

            logger.fatal('Fatal error');
            expect(window.console.error).to.have.been.called.once; // jshint ignore:line

            // Warning
            s = { debug: { logLevel: Debug.LOG_LEVEL_WARNING }};
            settings.update(s);

            logger.debug('debug');
            expect(window.console.debug).not.to.have.been.called; // jshint ignore:line

            logger.warn('Warning');
            expect(window.console.warn).to.have.been.called.once; // jshint ignore:line

            logger.error('Error');
            expect(window.console.warn).to.have.been.called.once; // jshint ignore:line
        });
    });
});
