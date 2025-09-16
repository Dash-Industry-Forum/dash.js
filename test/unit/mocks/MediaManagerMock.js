import sinon from 'sinon';

class MediaManagerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.isSwitching = false;
        this.altPlayer = null;
        this.prebufferedPlayers = new Map();
        this.videoModel = null;
        this.playbackController = null;
        this.logger = null;
        this.hideAlternativePlayerControls = false;
        this.alternativeContext = null;

        this.setConfig = sinon.spy();

        this.switchBackToMainContent = sinon.spy((seekTime) => { // eslint-disable-line no-unused-vars
            this.isSwitching = true;
            if (this.altPlayer) {
                this.altPlayer = null;
            }
            this.isSwitching = false;
        });
    }

    initialize() {
        // Mock initialization
    }

    prebufferAlternativeContent(playerId, alternativeMpdUrl) { // eslint-disable-line no-unused-vars
        if (this.prebufferedPlayers.has(playerId)) {
            return;
        }

        this.prebufferedPlayers.set(playerId, {
            player: {},
            playerId: playerId
        });
    }

    cleanupPrebufferedContent(playerId) {
        const prebufferedPlayer = this.prebufferedPlayers.get(playerId);
        if (prebufferedPlayer) {
            this.prebufferedPlayers.delete(playerId);
        }
    }

    switchToAlternativeContent(playerId, alternativeMpdUrl, time = 0) { // eslint-disable-line no-unused-vars
        this.isSwitching = true;

        this.eventHandlers = new Map();

        this.altPlayer = {
            attachView: sinon.spy(),
            seek: sinon.spy(),
            play: sinon.spy(),
            pause: sinon.spy(),
            reset: sinon.spy(),
            duration: sinon.spy(() => 60),
            isDynamic: sinon.spy(() => false),
            on: sinon.spy((eventName, handler, context) => {
                this.eventHandlers.set(eventName, { handler, context });
            }),
            off: sinon.spy(),
            triggerTimeUpdate: (time) => {
                const eventData = this.eventHandlers.get('playbackTimeUpdated');
                if (eventData) {
                    eventData.handler.call(eventData.context, { time });
                }
            }
        };


        this.isSwitching = false;
    }


    getAlternativePlayer() {
        return this.altPlayer;
    }

    setAlternativePlayer(player) {
        this.altPlayer = player;
    }

    reset() {
        this.isSwitching = false;

        if (this.altPlayer) {
            if (this.altPlayer.off && typeof this.altPlayer.off === 'function') {
                this.altPlayer.off();
            }
            this.altPlayer = null;
        }

        this.prebufferedPlayers.clear();
        if (this.eventHandlers) {
            this.eventHandlers.clear();
        }

        if (this.switchBackToMainContent) {
            this.switchBackToMainContent.resetHistory();
        }
        if (this.setConfig) {
            this.setConfig.resetHistory();
        }

        this.setup();
    }
}

export default MediaManagerMock;