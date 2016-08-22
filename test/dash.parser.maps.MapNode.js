import MapNode from '../src/dash/parser/maps/MapNode';
import CommonProperty from '../src/dash/parser/maps/CommonProperty';

const expect = require('chai').expect;

describe('MapNode', function () {

    it('should return a MapNode with expected defaults', () => {
        const mapNode = new MapNode();

        expect(mapNode).to.be.instanceof(MapNode); // jshint ignore:line
        expect(mapNode.name).to.equal(''); // jshint ignore:line
        expect(mapNode.properties).to.be.instanceOf(Array); // jshint ignore:line
        expect(mapNode.properties).to.be.empty; // jshint ignore:line
        expect(mapNode.children).to.be.instanceOf(Array); // jshint ignore:line
        expect(mapNode.children).to.be.empty; // jshint ignore:line
        expect(mapNode.isRoot).to.equal(false); // jshint ignore:line
        expect(mapNode.isArray).to.equal(true); // jshint ignore:line
    });

    it('should throw an exception if attempting to use setters', () => {
        const mapNode = new MapNode();

        ['name', 'properties', 'children', 'isRoot', 'isArray'].forEach(p => {
            const f = () => mapNode[p] = p;
            expect(f).to.throw(Error);
        });
    });

    it('should have CommonProperty\'s', () => {
        const name = '';
        const properties = ['test'];

        const mapNode = new MapNode(name, properties);

        expect(mapNode.properties).to.be.instanceOf(Array); // jshint ignore:line
        expect(mapNode.properties).not.to.be.empty; // jshint ignore:line
        expect(mapNode.properties[0]).to.be.instanceOf(CommonProperty); // jshint ignore:line
    });
});
