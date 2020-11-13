import TextBufferController from '../../src/streaming/text/TextBufferController';

const chai = require('chai');
const expect = chai.expect;

const context = {};

const streamInfo = {
    id: 'streamId'
};

describe('TextBufferController', function () {

    let textBufferController;

    it('should create a buffer of type "BufferController" if type is "fragmentedText"', function () {


        textBufferController = TextBufferController(context).create({
            streamInfo: streamInfo,
            type: 'fragmentedText'
        });

        expect(textBufferController.getBufferControllerType()).to.equal('BufferController');
    });

    it('should create a buffer of type "NotFragmentedTextBufferController" if type is not "fragmentedText"', function () {

        textBufferController = TextBufferController(context).create({
            streamInfo: streamInfo,
            type: 'other'
        });

        expect(textBufferController.getBufferControllerType()).to.equal('NotFragmentedTextBufferController');
    });
});
