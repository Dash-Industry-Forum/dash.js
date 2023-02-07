import ObjectUtils from '../../src/streaming/utils/ObjectUtils';

const expect = require('chai').expect;

const context = {};
const objectUtils = ObjectUtils(context).getInstance();

describe('ObjectUtils', function () {

    describe('equal', () => {
        it('should return true if object are equals - declared parameters in same order', () => {
            const obj1 = {
                param1: 'param1',
                param2: 'param2'
            };

            const obj2 = {
                param1: 'param1',
                param2: 'param2'
            };

            const result = objectUtils.areEqual(obj1,obj2);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return true if object are equals - declared parameters in different order', () => {
            const obj1 = {
                param1: 'param1',
                param2: 'param2'
            };

            const obj2 = {
                param2: 'param2',
                param1: 'param1'
            };

            const result = objectUtils.areEqual(obj1,obj2);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return false if object are different', () => {
            const obj1 = {
                param1: 'param1',
                param2: 'param2'
            };

            const obj2 = {
                param1: 'param2',
                param2: 'param1'
            };

            const result = objectUtils.areEqual(obj1,obj2);

            expect(result).to.be.false; // jshint ignore:line
        });
    });
});
