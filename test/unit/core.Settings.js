import Settings from '../../src/core/Settings';
import Utils from '../../src/core/Utils';

const chai = require('chai');
const expect = chai.expect;

const context = {};

describe('Settings', function(){

    it('should have a default settings object at first load', () => {
        const settings = Settings(context).getInstance();

        const def = settings.get();

        expect(def.streaming.abandonLoadTimeout).to.equal(10000);
        expect(def.streaming.setScheduleWhilePaused).to.be.true;
        expect(Number.isNaN(def.streaming.liveDelay)).to.be.true;
        expect(def.streaming.abr.limitBitrateByPortal).to.be.false;
    });

    it('should apply a partial settings object that matches the default', () => {
        const settings = Settings(context).getInstance();
        const s = {
            streaming: {
                abandonLoadTimeout: 20000,
                liveDelay: 30,
                abr: {
                    limitBitrateByPortal: true,
                    maxBitrate: { audio: 300, video: 2000 }
                }
            }
        };

        settings.update(s);

        const res = settings.get();

        expect(res.streaming.abandonLoadTimeout).to.equal(20000);
        expect(res.streaming.liveDelay).to.equal(30);
        expect(res.streaming.abr.limitBitrateByPortal).to.be.true;
        expect(res.streaming.abr.maxBitrate.audio).to.equal(300);
        expect(res.streaming.abr.maxBitrate.video).to.equal(2000);

    });

    /*it('should not apply settings that fall outside default object', () => {
        const settings = Settings(context).getInstance();
    });*/
});
