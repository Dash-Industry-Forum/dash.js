import PatchManifestModel from '../../src/dash/models/PatchManifestModel';
import DashConstants from '../../src/dash/constants/DashConstants';
import PatchOperation from '../../src/dash/vo/PatchOperation';
import SimpleXPath from '../../src/dash/vo/SimpleXPath';

import PatchHelper from './helpers/PatchHelper';

const expect = require('chai').expect;

const context = {};
const patchManifestModel = PatchManifestModel(context).getInstance();

describe('PatchManifestModel', function () {
    describe('getIsPatch', function () {
        it('should identify patches by presence of original MPD id', function () {
            let patch = {
                [DashConstants.ORIGINAL_MPD_ID]: 'foobar'
            };
            expect(patchManifestModel.getIsPatch(patch)).to.be.true; // jshint ignore:line
        });

        it('should consider the lack of original MPD id as non-patch', function () {
            expect(patchManifestModel.getIsPatch({})).to.be.false; // jshint ignore:line
        });

        it('should consider lack of patch argument as non-patch', function () {
            expect(patchManifestModel.getIsPatch()).to.be.false; // jshint ignore:line
        });
    });

    describe('getPublishTime', function () {
        it('should provide null for missing argument', function () {
            expect(patchManifestModel.getPublishTime()).to.be.null; // jshint ignore:line
        });

        it('should provide null for missing publish time in patch', function () {
            expect(patchManifestModel.getPublishTime({})).to.be.null; // jshint ignore:line
        });

        it('should provide Date object for parsed publish time', function () {
            let patch = {
                [DashConstants.PUBLISH_TIME]: '2020-11-11T05:13:19.514676331Z'
            };
            expect(patchManifestModel.getPublishTime(patch)).to.be.instanceOf(Date);
        });
    });

    describe('getOriginalPublishTime', function () {
        it('should provide null for missing argument', function () {
            expect(patchManifestModel.getOriginalPublishTime()).to.be.null; // jshint ignore:line
        });

        it('should provide null for missing original publish time in patch', function () {
            expect(patchManifestModel.getOriginalPublishTime({})).to.be.null; // jshint ignore:line
        });

        it('should provide Date object for parsed original publish time', function () {
            let patch = {
                [DashConstants.ORIGINAL_PUBLISH_TIME]: '2020-11-11T05:13:19.514676331Z'
            };
            expect(patchManifestModel.getOriginalPublishTime(patch)).to.be.instanceOf(Date);
        });
    });

    describe('getMpdId', function () {
        it('should provide null for missing argument', function () {
            expect(patchManifestModel.getMpdId()).to.be.null; // jshint ignore:line
        });

        it('should provide null for missing attribute', function () {
            expect(patchManifestModel.getMpdId({})).to.be.null; // jshint ignore:line
        });

        it('should provide mpd id when present', function () {
            let patch = {
                [DashConstants.ORIGINAL_MPD_ID]: 'foobar'
            };
            expect(patchManifestModel.getMpdId(patch)).to.equal('foobar');
        });
    });

    describe('getPatchOperations', function () {

        const patchHelper = new PatchHelper();

        it('should provide empty operation set for missing argument', function () {
            expect(patchManifestModel.getPatchOperations()).to.be.empty; // jshint ignore:line
        });

        describe('add operations', function () {
            it('should properly parse add operation targeting element', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period',
                    position: 'after',
                    children: [{ 'Period': {} }]
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('add');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsElement()).to.be.true; // jshint ignore:line
                expect(operations[0].position).to.equal('after');
                expect(operations[0].value).to.have.all.keys(['Period']);
            });

            it('should properly parse add operation targeting attribute', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period',
                    type: '@id',
                    text: 'foo-1'
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('add');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsAttribute()).to.be.true; // jshint ignore:line
                expect(operations[0].value).to.equal('foo-1');
            });

            it('should properly ignore add operation attempting namespace addition', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period',
                    type: 'namespace::thing',
                    text: 'foo-1'
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(0);
            });
        });

        describe('replace operations', function () {
            it('should properly parse replace operation targeting element', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'replace',
                    selector: '/MPD/Period',
                    children: [{ 'Period': {} }]
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('replace');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsElement()).to.be.true; // jshint ignore:line
                expect(operations[0].value).to.have.all.keys(['Period']);
            });

            it('should properly parse replace operation targeting attribute', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'replace',
                    selector: '/MPD/Period/@id',
                    text: 'foo-2'
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('replace');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsAttribute()).to.be.true; // jshint ignore:line
                expect(operations[0].value).to.equal('foo-2');
            });
        });

        describe('remove operations', function () {
            it('should properly parse remove operation targeting element', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period[3]'
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('remove');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsElement()).to.be.true; // jshint ignore:line
            });

            it('should properly parse remove operation targeting attribute', function () {
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period/@id'
                }]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(1);
                expect(operations[0]).to.be.instanceOf(PatchOperation);
                expect(operations[0].action).to.equal('remove');
                expect(operations[0].xpath).to.be.instanceOf(SimpleXPath);
                expect(operations[0].xpath.findsAttribute()).to.be.true; // jshint ignore:line
            });
        });

        describe('operation edge cases', function () {
            it('should properly parse operation sequence', function () {
                let patch = patchHelper.generatePatch('foobar', [
                    {
                        action: 'remove',
                        selector: '/MPD/Period[2]'
                    },
                    {
                        action: 'replace',
                        selector: '/MPD/@publishTime',
                        text: 'some-new-time'
                    },
                    {
                        action: 'add',
                        selector: '/MPD/Period',
                        position: 'after',
                        children: [{ 'Period': {} }]
                    }
                ]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(3);
                expect(operations[0].action).to.equal('remove');
                expect(operations[1].action).to.equal('replace');
                expect(operations[2].action).to.equal('add');
            });

            it('should properly ignore invalid operations', function () {
                let patch = patchHelper.generatePatch('foobar', [
                    {
                        action: 'remove',
                        selector: '/MPD/Period[2]'
                    },
                    {
                        action: 'unknown'
                    },
                    {
                        action: 'add',
                        selector: '/MPD/Period',
                        position: 'after',
                        children: [{ 'Period': {} }]
                    },
                    {
                        action: 'other-unknown'
                    }
                ]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(2);
                expect(operations[0].action).to.equal('remove');
                expect(operations[1].action).to.equal('add');
            });

            it('should properly ignore operations with unsupported xpaths', function () {
                let patch = patchHelper.generatePatch('foobar', [
                    {
                        action: 'remove',
                        selector: 'MPD/Period' // non-absolute paths not supported
                    }
                ]);
                let operations = patchManifestModel.getPatchOperations(patch);
                expect(operations.length).to.equal(0);
            });
        });
    });
});
