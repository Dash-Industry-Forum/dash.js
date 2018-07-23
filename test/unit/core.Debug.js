import Debug from '../../src/core/Debug';

const chai = require('chai');
const expect = chai.expect;
const spies = require('chai-spies');

chai.use(spies);

const context = {};
let debug;

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
        debug = Debug(context).getInstance();
    });

    afterEach(function () {
    });

    it('Default values', function () {
        var logLevel = debug.getLogLevel();
        expect(logLevel).to.equal(Debug.LOG_LEVEL_WARNING);
    });

    it('should set log level', function () {
        debug.setLogLevel(Debug.LOG_LEVEL_NONE);
        var logLevel = debug.getLogLevel();
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

            debug.setLogLevel(Debug.LOG_LEVEL_NONE);
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
            debug.setLogLevel(Debug.LOG_LEVEL_DEBUG);

            logger.debug('debug message');
            expect(global.window.console.debug).to.have.been.called.once; // jshint ignore:line

            logger.fatal('Fatal error');
            expect(global.window.console.error).to.have.been.called.once; // jshint ignore:line

            // Warning
            debug.setLogLevel(Debug.LOG_LEVEL_WARNING);

            logger.debug('debug');
            expect(global.window.console.debug).not.to.have.been.called; // jshint ignore:line

            logger.warn('Warning');
            expect(global.window.console.warn).to.have.been.called.once; // jshint ignore:line

            logger.error('Error');
            expect(global.window.console.warn).to.have.been.called.once; // jshint ignore:line
        });
    });
});
