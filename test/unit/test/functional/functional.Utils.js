import {expect} from 'chai';
import Utils from '../../../functional/src/Utils.js';

describe('Functional Utils', () => {
    const testcase = 'playback/play';
    let originalTestvectors;

    before(() => {
        originalTestvectors = window.__karma__.config.testvectors;
    });

    afterEach(() => {
        window.__karma__.config.testvectors = originalTestvectors;
    });

    function getSelectedTestvectors(testvector) {
        window.__karma__.config.testvectors = [testvector];
        return Utils.getTestvectorsForTestcase(testcase);
    }

    it('should select a testvector without testfile filters', () => {
        const testvector = {name: 'unfiltered'};

        expect(getSelectedTestvectors(testvector)).to.deep.equal([testvector]);
    });

    it('should select exact, category and all inclusions', () => {
        expect(getSelectedTestvectors({includedTestfiles: [testcase]})).to.have.lengthOf(1);
        expect(getSelectedTestvectors({includedTestfiles: ['playback/*']})).to.have.lengthOf(1);
        expect(getSelectedTestvectors({includedTestfiles: ['all']})).to.have.lengthOf(1);
    });

    it('should reject an unrelated inclusion', () => {
        expect(getSelectedTestvectors({includedTestfiles: ['text/*']})).to.be.empty;
    });

    it('should treat a missing or empty inclusion list as all tests before applying exclusions', () => {
        expect(getSelectedTestvectors({excludedTestfiles: ['playback/seek']})).to.have.lengthOf(1);
        expect(getSelectedTestvectors({includedTestfiles: [], excludedTestfiles: ['playback/seek']})).to.have.lengthOf(1);
        expect(getSelectedTestvectors({excludedTestfiles: [testcase]})).to.be.empty;
    });

    it('should give an exact exclusion priority over an inclusion', () => {
        const testvector = {
            includedTestfiles: ['all', testcase, 'playback/*'],
            excludedTestfiles: [testcase]
        };

        expect(getSelectedTestvectors(testvector)).to.be.empty;
    });
});
