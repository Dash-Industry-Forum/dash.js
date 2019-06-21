import FactoryMaker from '../../core/FactoryMaker';

/**
 * Creates an instance of an EBMLParser class which implements a large subset
 * of the functionality required to parse Matroska EBML
 *
 * @param {Object} config object with data member which is the buffer to parse
 * @ignore
 */
function EBMLParser(config) {

    config = config || {};
    let instance;

    let data = new DataView(config.data);
    let pos = 0;

    function getPos() {
        return pos;
    }

    function setPos(value) {
        pos = value;
    }

    /**
     * Consumes an EBML tag from the data stream.
     *
     * @param {Object} tag to parse, A tag is an object with at least a {number} tag and
     * {boolean} required flag.
     * @param {boolean} test whether or not the function should throw if a required
     * tag is not found
     * @return {boolean} whether or not the tag was found
     * @throws will throw an exception if a required tag is not found and test
     * param is false or undefined, or if the stream is malformed.
     * @memberof EBMLParser
     */
    function consumeTag(tag, test) {
        let found = true;
        let bytesConsumed = 0;
        let p1,
            p2;

        if (test === undefined) {
            test = false;
        }

        if (tag.tag > 0xFFFFFF) {
            if (data.getUint32(pos) !== tag.tag) {
                found = false;
            }
            bytesConsumed = 4;
        } else if (tag.tag > 0xFFFF) {
            // 3 bytes
            p1 = data.getUint16(pos);
            p2 = data.getUint8(pos + 2);

            // shift p1 over a byte and add p2
            if (p1 * 256 + p2 !== tag.tag) {
                found = false;
            }
            bytesConsumed = 3;
        } else if (tag.tag > 0xFF) {
            if (data.getUint16(pos) !== tag.tag) {
                found = false;
            }
            bytesConsumed = 2;
        } else {
            if (data.getUint8(pos) !== tag.tag) {
                found = false;
            }
            bytesConsumed = 1;
        }

        if (!found && tag.required && !test) {
            throw new Error('required tag not found');
        }

        if (found) {
            pos += bytesConsumed;
        }

        return found;
    }

    /**
     * Consumes an EBML tag from the data stream.   If the tag is found then this
     * function will also remove the size field which follows the tag from the
     * data stream.
     *
     * @param {Object} tag to parse, A tag is an object with at least a {number} tag and
     * {boolean} required flag.
     * @param {boolean} test whether or not the function should throw if a required
     * tag is not found
     * @return {boolean} whether or not the tag was found
     * @throws will throw an exception if a required tag is not found and test
     * param is false or undefined, or if the stream is malformedata.
     * @memberof EBMLParser
     */
    function consumeTagAndSize(tag, test) {
        let found = consumeTag(tag, test);

        if (found) {
            getMatroskaCodedNum();
        }

        return found;
    }

    /**
     * Consumes an EBML tag from the data stream.   If the tag is found then this
     * function will also remove the size field which follows the tag from the
     * data stream.  It will use the value of the size field to parse a binary
     * field, using a parser defined in the tag itself
     *
     * @param {Object} tag to parse, A tag is an object with at least a {number} tag,
     * {boolean} required flag, and a parse function which takes a size parameter
     * @return {boolean} whether or not the tag was found
     * @throws will throw an exception if a required tag is not found,
     * or if the stream is malformed
     * @memberof EBMLParser
     */
    function parseTag(tag) {
        let size;

        consumeTag(tag);
        size = getMatroskaCodedNum();
        return instance[tag.parse](size);
    }

    /**
     * Consumes an EBML tag from the data stream.   If the tag is found then this
     * function will also remove the size field which follows the tag from the
     * data stream.  It will use the value of the size field to skip over the
     * entire section of EBML encapsulated by the tag.
     *
     * @param {Object} tag to parse, A tag is an object with at least a {number} tag, and
     * {boolean} required flag
     * @param {boolean} test a flag to indicate if an exception should be thrown
     * if a required tag is not found
     * @return {boolean} whether or not the tag was found
     * @throws will throw an exception if a required tag is not found and test is
     * false or undefined or if the stream is malformed
     * @memberof EBMLParser
     */
    function skipOverElement(tag, test) {
        let found = consumeTag(tag, test);
        let headerSize;

        if (found) {
            headerSize = getMatroskaCodedNum();
            pos += headerSize;
        }

        return found;
    }

    /**
     * Returns and consumes a number encoded according to the Matroska EBML
     * specification from the bitstream.
     *
     * @param {boolean} retainMSB whether or not to retain the Most Significant Bit (the
     * first 1). this is usually true when reading Tag IDs.
     * @return {number} the decoded number
     * @throws will throw an exception if the bit stream is malformed or there is
     * not enough data
     * @memberof EBMLParser
     */
    function getMatroskaCodedNum(retainMSB) {
        let bytesUsed = 1;
        let mask = 0x80;
        let maxBytes = 8;
        let extraBytes = -1;
        let num = 0;
        let ch = data.getUint8(pos);
        let i = 0;

        for (i = 0; i < maxBytes; i += 1) {
            if ((ch & mask) === mask) {
                num = (retainMSB === undefined) ? ch & ~mask : ch;
                extraBytes = i;
                break;
            }
            mask >>= 1;
        }

        for (i = 0; i < extraBytes; i += 1, bytesUsed += 1) {
            num = (num << 8) | (0xff & data.getUint8(pos + bytesUsed));
        }

        pos += bytesUsed;

        return num;
    }

    /**
     * Returns and consumes a float from the bitstream.
     *
     * @param {number} size 4 or 8 byte floats are supported
     * @return {number} the decoded number
     * @throws will throw an exception if the bit stream is malformed or there is
     * not enough data
     * @memberof EBMLParser
     */
    function getMatroskaFloat(size) {
        let outFloat;

        switch (size) {
        case 4:
            outFloat = data.getFloat32(pos);
            pos += 4;
            break;
        case 8:
            outFloat = data.getFloat64(pos);
            pos += 8;
            break;
        }
        return outFloat;
    }

    /**
     * Consumes and returns an unsigned int from the bitstream.
     *
     * @param {number} size 1 to 8 bytes
     * @return {number} the decoded number
     * @throws will throw an exception if the bit stream is malformed or there is
     * not enough data
     * @memberof EBMLParser
     */
    function getMatroskaUint(size) {
        let val = 0;

        for (let i = 0; i < size; i += 1) {
            val <<= 8;
            val |= data.getUint8(pos + i) & 0xff;
        }

        pos += size;
        return val;
    }

    /**
     * Tests whether there is more data in the bitstream for parsing
     *
     * @return {boolean} whether there is more data to parse
     * @memberof EBMLParser
     */
    function moreData() {
        return pos < data.byteLength;
    }

    instance = {
        getPos: getPos,
        setPos: setPos,
        consumeTag: consumeTag,
        consumeTagAndSize: consumeTagAndSize,
        parseTag: parseTag,
        skipOverElement: skipOverElement,
        getMatroskaCodedNum: getMatroskaCodedNum,
        getMatroskaFloat: getMatroskaFloat,
        getMatroskaUint: getMatroskaUint,
        moreData: moreData
    };

    return instance;
}

EBMLParser.__dashjs_factory_name = 'EBMLParser';
export default FactoryMaker.getClassFactory(EBMLParser);