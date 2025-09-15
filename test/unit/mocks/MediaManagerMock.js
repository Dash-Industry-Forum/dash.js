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
        
        // Create spy for setConfig method only
        this.setConfig = sinon.spy();
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
        
        // Mock alternative player
        this.altPlayer = {
            attachView: sinon.spy(),
            seek: sinon.spy(),
            play: sinon.spy(),
            pause: sinon.spy(),
            reset: sinon.spy(),
            duration: sinon.spy(() => 60), // Mock 60 second duration
            isDynamic: sinon.spy(() => false),
            on: sinon.spy(),
            off: sinon.spy()
        };
        
        this.isSwitching = false;
    }

    switchBackToMainContent(seekTime) { // eslint-disable-line no-unused-vars
        this.isSwitching = true;
        
        if (this.altPlayer) {
            this.altPlayer = null;
        }
        
        this.isSwitching = false;
    }

    getAlternativePlayer() {
        return this.altPlayer;
    }

    reset() {
        this.isSwitching = false;
        this.altPlayer = null;
        this.prebufferedPlayers.clear();
    }

    // Utility method to check if switching is in progress
    isSwitchingInProgress() {
        return this.isSwitching;
    }

    // Utility method to get prebuffered players count
    getPrebufferedPlayersCount() {
        return this.prebufferedPlayers.size;
    }

    // Utility method to check if player is prebuffered
    isPlayerPrebuffered(playerId) {
        return this.prebufferedPlayers.has(playerId);
    }

}

export default MediaManagerMock;