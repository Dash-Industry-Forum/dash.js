import PatchOperation from '../../src/dash/vo/PatchOperation';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('PatchOperation', function () {
    describe('getMpdTarget', function () {
        it('should consider remove operation sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('remove', xpath);

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, true));
        });

        it('should consider replace operation sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('replace', xpath);

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, true));
        });

        it('should consider add operation with position after as sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('add', xpath);
            operation.position = 'after';

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, true));
        });

        it('should consider add operation with position before as sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('add', xpath);
            operation.position = 'before';

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, true));
        });

        it('should not consider add operation with position prepend as sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('add', xpath);
            operation.position = 'prepend';

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, false));
        });

        it('should not consider add operation without position as sibling operation', function () {
            let xpath = { getMpdTarget: sinon.fake() };
            let root = {};
            let operation = new PatchOperation('add', xpath);

            operation.getMpdTarget(root);

            expect(xpath.getMpdTarget.calledWith(root, false));
        });
    });
});
