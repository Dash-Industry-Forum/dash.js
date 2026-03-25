import MapNode from '../../../../src/dash/parser/maps/MapNode.js';
import {expect} from 'chai';

describe('MapNode', function () {

    it('should return a MapNode with expected defaults', () => {
        const mapNode = new MapNode();

        expect(mapNode).to.be.instanceof(MapNode); // jshint ignore:line
        expect(mapNode.name).to.equal(''); // jshint ignore:line
        expect(mapNode.properties).to.be.instanceOf(Array); // jshint ignore:line
        expect(mapNode.properties).to.be.empty; // jshint ignore:line
        expect(mapNode.children).to.be.instanceOf(Array); // jshint ignore:line
        expect(mapNode.children).to.be.empty; // jshint ignore:line
        expect(mapNode.exceptions).to.be.instanceOf(Object); // jshint ignore:line
        expect(mapNode.exceptions).to.be.empty; // jshint ignore:line
    });

    it('should throw an exception if attempting to use setters', () => {
        const mapNode = new MapNode();

        ['name', 'properties', 'children', 'exceptions'].forEach(p => {
            const f = () => mapNode[p] = p;
            expect(f).to.throw(Error);
        });
    });
});
