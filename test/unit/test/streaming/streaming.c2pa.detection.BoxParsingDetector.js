import BoxParsingDetector from '../../../../src/streaming/c2pa/detection/BoxParsingDetector.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
import {expect} from 'chai';

const context = {};

const VSI_EMSG_SCHEME_URI = 'urn:c2pa:verifiable-segment-info';
const C2PA_MANIFEST_STORE_UUID = [
    0xd8, 0xfe, 0xc3, 0xd6, 0x1a, 0x96, 0x4f, 0x32,
    0xa0, 0xf6, 0xf3, 0xec, 0xf9, 0x6c, 0x10, 0xea
];
const JUMBF_UUID = [
    0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c,
    0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81
];

function stringBytes(value) {
    return Array.from(value).map((character) => character.charCodeAt(0));
}

function box(type, payload) {
    const size = 8 + payload.length;
    const header = [
        (size >>> 24) & 0xff, (size >>> 16) & 0xff, (size >>> 8) & 0xff, size & 0xff,
        type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)
    ];
    return header.concat(payload);
}

function uuidBox(uuid) {
    return box('uuid', uuid.slice());
}

function emsgV0Box(schemeIdUri) {
    const payload = [0, 0, 0, 0] // version 0 + flags
        .concat(stringBytes(schemeIdUri), [0]) // scheme_id_uri (null-terminated)
        .concat([0]) // value (empty, null-terminated)
        .concat([0, 0, 0, 1]) // timescale
        .concat([0, 0, 0, 0]) // presentation_time_delta
        .concat([0, 0, 0, 0]) // event_duration
        .concat([0, 0, 0, 1]); // id
    return box('emsg', payload);
}

function segmentInputFrom(byteArray) {
    return { bytes: new Uint8Array(byteArray) };
}

describe('BoxParsingDetector', function () {

    let detector;

    beforeEach(() => {
        detector = BoxParsingDetector(context).create({
            boxParser: BoxParser(context).getInstance()
        });
    });

    it('should classify a segment with a VSI emsg box as §19.4', () => {
        const result = detector.detect(segmentInputFrom(emsgV0Box(VSI_EMSG_SCHEME_URI)));

        expect(result.hasC2pa).to.equal(true);
        expect(result.method).to.equal('19.4');
    });

    it('should classify a segment with a C2PA manifest-store uuid box as §19.3', () => {
        const result = detector.detect(segmentInputFrom(uuidBox(C2PA_MANIFEST_STORE_UUID)));

        expect(result.hasC2pa).to.equal(true);
        expect(result.method).to.equal('19.3');
    });

    it('should classify a segment with a JUMBF uuid box as §19.3', () => {
        const result = detector.detect(segmentInputFrom(uuidBox(JUMBF_UUID)));

        expect(result.hasC2pa).to.equal(true);
        expect(result.method).to.equal('19.3');
    });

    it('should classify a segment without any C2PA box as non-C2PA', () => {
        const result = detector.detect(segmentInputFrom(box('free', [1, 2, 3, 4])));

        expect(result.hasC2pa).to.equal(false);
        expect(result.method).to.be.null;
    });

    it('should ignore an emsg box whose scheme is not the VSI scheme', () => {
        const result = detector.detect(segmentInputFrom(emsgV0Box('urn:mpeg:dash:event:2012')));

        expect(result.hasC2pa).to.equal(false);
        expect(result.method).to.be.null;
    });

    it('should ignore a uuid box whose usertype is not a C2PA UUID', () => {
        const foreignUuid = new Array(16).fill(0x11);
        const result = detector.detect(segmentInputFrom(uuidBox(foreignUuid)));

        expect(result.hasC2pa).to.equal(false);
        expect(result.method).to.be.null;
    });

    it('should return non-C2PA when no boxParser is available', () => {
        const detectorWithoutParser = BoxParsingDetector(context).create({});
        const result = detectorWithoutParser.detect(segmentInputFrom(uuidBox(JUMBF_UUID)));

        expect(result.hasC2pa).to.equal(false);
        expect(result.method).to.be.null;
    });

    it('should return non-C2PA for missing input', () => {
        expect(detector.detect(null).hasC2pa).to.equal(false);
        expect(detector.detect({}).hasC2pa).to.equal(false);
    });
});
