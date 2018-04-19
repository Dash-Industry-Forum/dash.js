import TextBufferController from '../../src/streaming/text/TextBufferController';

const chai = require('chai');
const expect = chai.expect;

const context = {};

describe('TextBufferController', function () {

    let textBufferController;

    it('should create a buffer of type "BufferController" if type is "fragmentedText"', function () {


        textBufferController = TextBufferController(context).create({
            type: 'fragmentedText'
        });

        expect(textBufferController.getBufferControllerType()).to.equal('BufferController');
    });

    it('should create a buffer of type "NotFragmentedTextBufferController" if type is not "fragmentedText"', function () {

        textBufferController = TextBufferController(context).create({
            type: 'other'
        });

        expect(textBufferController.getBufferControllerType()).to.equal('NotFragmentedTextBufferController');
    });
});
