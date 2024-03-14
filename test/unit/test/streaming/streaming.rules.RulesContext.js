import RulesContext from '../../../../src/streaming/rules/RulesContext.js';
import StreamProcessorMock from '../../mocks/StreamProcessorMock.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import {expect} from 'chai';

const context = {};
const testType = 'video';
const streamInfo = {
    id: 'id'
};

describe('RulesContext', function () {
    it('should not throw an exception when creating RulesContext without config attribute', function () {
        expect(RulesContext(context).create.bind(RulesContext(context).create)).to.not.throw();
    });

    it('should return specific values if RulesContext has been well defined', function () {
        const rulesContext = RulesContext(context).create({
            abrController: new AbrControllerMock(),
            streamProcessor: new StreamProcessorMock(testType, streamInfo),
            currentValue: 0,
            switchHistory: null,
            droppedFramesHistory: null,
        });

        expect(rulesContext.getMediaType()).to.equal('video');
        expect(rulesContext.getStreamInfo().id).to.equal('id');
    });
});
