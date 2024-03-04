import DescriptorType from '../../../../src/dash/vo/DescriptorType.js';

import {expect} from 'chai';

describe('DescriptorType', () => {

    it('should be constructed with null values', () => {
        const dt = new DescriptorType();
        expect(dt).to.deep.equal({
            schemeIdUri: null,
            value: null,
            id: null
        });
    });

    it('should initialise with correct base values', () => {
        const dt = new DescriptorType();
        dt.init({
            schemeIdUri: 'testScheme',
            value: '1',
        });
        expect(dt).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: '1',
            id: null
        });
    });

    it('should initialise with known dvb extensions if present', () => {
        const dt = new DescriptorType();
        dt.init({
            schemeIdUri: 'testScheme',
            value: '1',
            'dvb:url': 'testUrl'
        });
        expect(dt).to.deep.equal({
            schemeIdUri: 'testScheme',
            value: '1',
            id: null,
            dvbUrl: 'testUrl'
        });
    });

});
