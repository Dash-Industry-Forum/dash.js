import {expect} from 'chai';
import ContentProtection from '../../../../src/dash/vo/ContentProtection.js';

describe('Content Protection', () => {

    it('should be constructed with null values', () => {
        const contentProtection = new ContentProtection();
        expect(contentProtection).to.deep.equal({
            schemeIdUri: null,
            value: null,
            id: null,
            ref: null,
            refId: null,
            robustness: null,
            keyId: null,
            cencDefaultKid: null,
            pssh: null,
            pro: null,
            laUrl: null,
        });
    });

    it('should initialise with correct base values', () => {
        const contentProtection = new ContentProtection();
        contentProtection.init({
            schemeIdUri: 'testScheme',
            value: '1',
        });
        expect(contentProtection).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: '1',
            id: null,
            ref: null,
            refId: null,
            robustness: null,
            keyId: null,
            cencDefaultKid: null,
            pssh: null,
            pro: null,
            laUrl: null
        });
    });

    it('should initialise with correct complete values', () => {
        const contentProtection = new ContentProtection();
        contentProtection.init({
            schemeIdUri: 'testScheme',
            value: '1',
            ref: 'ref',
            refId: 'refId',
            robustness: 'robustness',
            keyId: null,
            'cenc:default_KID': 'keyId',
            pssh: 'pssh',
            pro: 'pro',
            Laurl: 'laUrl'
        });
        expect(contentProtection).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: '1',
            id: null,
            ref: 'ref',
            refId: 'refId',
            robustness: 'robustness',
            keyId: null,
            cencDefaultKid: 'keyId',
            pssh: 'pssh',
            pro: 'pro',
            laUrl: 'laUrl'
        });
    });

    it('should handle lowercase laurl', () => {
        const contentProtection = new ContentProtection();
        contentProtection.init({
            schemeIdUri: 'testScheme',
            value: '1',
            ref: 'ref',
            refId: 'refId',
            robustness: 'robustness',
            'cenc:default_KID': 'keyId',
            pssh: 'pssh',
            pro: 'pro',
            laurl: 'laUrl'
        });
        expect(contentProtection).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: '1',
            id: null,
            ref: 'ref',
            refId: 'refId',
            robustness: 'robustness',
            keyId: null,
            cencDefaultKid: 'keyId',
            pssh: 'pssh',
            pro: 'pro',
            laUrl: 'laUrl'
        });
    });

    it('merge attributes from reference', () => {
        const contentProtection = new ContentProtection();
        contentProtection.init({
            schemeIdUri: 'testScheme',
            ref: 'ref',
            refId: 'refId',
            pssh: 'pssh',
            pro: 'pro',
            laurl: 'laUrl'
        });
        contentProtection.mergeAttributesFromReference({
            schemeIdUri: 'scheme-new',
            value: 'value-new',
            id: 'id-new',
            robustness: 'robustness-new',
            cencDefaultKid: 'keyId-new',
            pssh: 'pssh-new',
            pro: 'pro-new',
            laUrl: 'laUrl-new',
            ref: 'ref-new'
        })
        console.log(contentProtection)
        expect(contentProtection).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: 'value-new',
            id: 'id-new',
            robustness: 'robustness-new',
            cencDefaultKid: 'keyId-new',
            keyId: null,
            pssh: 'pssh',
            pro: 'pro',
            laUrl: 'laUrl',
            ref: 'ref',
            refId: 'refId',
        });
    });

});
