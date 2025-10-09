import DescriptorType from '../../../../src/dash/vo/DescriptorType.js';

import { expect } from 'chai';

describe('DescriptorType', () => {

    describe('Initialization', () => {
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

        it('should initialise with correct base values and type conversion', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 1,
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

    describe('inArray', () => {
        it('should return false array is empty', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 10
            });
            const testArray = [];

            let ret = dt.inArray(testArray);
            expect(ret).to.be.false;
        });

        it('should find a descriptor if only the schemeIdUri is provided', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 10
            });
            const testArray = [
                { schemeIdUri: 'notSupportedTestScheme' },
                { schemeIdUri: 'testScheme' },
                { schemeIdUri: 'notSupported' }
            ];

            let ret = dt.inArray(testArray);
            expect(ret).to.be.true;
        });

        it('should not erroneously match a descriptor if different schemeIdUri are provided', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 10
            });
            const testArray = [
                { schemeIdUri: 'notSupportedTestScheme' },
                { schemeIdUri: 'notSupported' }
            ];

            let ret = dt.inArray(testArray);
            expect(ret).to.be.false;
        });

        it('should find a descriptor if schemeIdUri and value is provided', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 2
            });
            const testArray = [
                { schemeIdUri: 'notSupportedTestScheme', value: '1' },
                { schemeIdUri: 'testScheme', value: '2' },
                { schemeIdUri: 'notSupported', value: '3' }
            ];

            let ret = dt.inArray(testArray);
            expect(ret).to.be.true;
        });

        it('should not find a descriptor if schemeIdUri is provided and value not matches', () => {
            const dt = new DescriptorType();
            dt.init({
                schemeIdUri: 'testScheme',
                value: 3
            });
            const testArray = [
                { schemeIdUri: 'notSupportedTestScheme', value: '1' },
                { schemeIdUri: 'testScheme', value: '1' },
                { schemeIdUri: 'notSupported', value: '1' }
            ];

            let ret = dt.inArray(testArray);
            expect(ret).to.be.false;
        });
    });
});
