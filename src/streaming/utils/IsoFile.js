/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

import IsoBox from '../vo/IsoBox';
import FactoryMaker from '../../core/FactoryMaker';

function IsoFile() {

    let instance,
        parsedIsoFile,
        commonProps,
        sidxProps,
        sidxRefProps,
        emsgProps,
        mdhdProps,
        mfhdProps,
        tfhdProps,
        tfdtProps,
        trunProps,
        trunSampleProps;

    /**
    * @param {string} type
    * @returns {IsoBox|null}
    * @memberof IsoFile#
    */
    function getBox(type) {
        if (!type || !parsedIsoFile || !parsedIsoFile.boxes || (parsedIsoFile.boxes.length === 0)) return null;

        return convertToDashIsoBox(parsedIsoFile.fetch(type));
    }

    /**
    * @param {string} type
    * @returns {Array} array of {@link IsoBox}
    * @memberof IsoFile#
    */
    function getBoxes(type) {
        var boxData = parsedIsoFile.fetchAll(type);
        var boxes = [];
        var box;

        for (var i = 0, ln = boxData.length; i < ln; i++) {
            box = convertToDashIsoBox(boxData[i]);

            if (box) {
                boxes.push(box);
            }
        }

        return boxes;
    }

    /**
    * @param {string} value
    * @memberof IsoFile#
    */
    function setData(value) {
        parsedIsoFile = value;
    }

    /**
    * @returns {IsoBox|null}
    * @memberof IsoFile#
    */
    function getLastBox() {
        if (!parsedIsoFile || !parsedIsoFile.boxes || !parsedIsoFile.boxes.length) return null;

        var type = parsedIsoFile.boxes[parsedIsoFile.boxes.length - 1].type;
        var boxes = getBoxes(type);

        return boxes[boxes.length - 1];
    }

    /**
    * @returns {number}
    * @memberof IsoFile#
    */
    function getOffset() {
        return parsedIsoFile._cursor.offset;
    }

    function setup() {
        commonProps = {
            offset: '_offset',
            size: 'size',
            type: 'type'
        };

        sidxProps = {
            references: 'references',
            timescale: 'timescale',
            earliest_presentation_time: 'earliest_presentation_time',
            first_offset: 'first_offset'
        };

        sidxRefProps = {
            reference_type: 'reference_type',
            referenced_size: 'referenced_size',
            subsegment_duration: 'subsegment_duration'
        };

        emsgProps = {
            id: 'id',
            value: 'value',
            timescale: 'timescale',
            scheme_id_uri: 'scheme_id_uri',
            presentation_time_delta: 'presentation_time_delta',
            event_duration: 'event_duration',
            message_data: 'message_data'
        };

        mdhdProps = {
            timescale: 'timescale'
        };

        mfhdProps = {
            sequence_number: 'sequence_number'
        };

        tfhdProps = {
            base_data_offset: 'base_data_offset',
            sample_description_index: 'sample_description_index',
            default_sample_duration: 'default_sample_duration',
            default_sample_size: 'default_sample_size',
            default_sample_flags: 'default_sample_flags',
            flags: 'flags'
        };

        tfdtProps = {
            version: 'version',
            baseMediaDecodeTime: 'baseMediaDecodeTime',
            flags: 'flags'
        };

        trunProps = {
            sample_count: 'sample_count',
            first_sample_flags: 'first_sample_flags',
            data_offset: 'data_offset',
            flags: 'flags',
            samples: 'samples'
        };

        trunSampleProps = {
            sample_size: 'sample_size',
            sample_duration: 'sample_duration',
            sample_composition_time_offset: 'sample_composition_time_offset'
        };
    }

    function copyProps(from, to, props) {
        for (var prop in props) {
            to[prop] = from[props[prop]];
        }
    }

    function convertToDashIsoBox(boxData) {
        if (!boxData) return null;

        var box = new IsoBox();
        var i,
            ln;

        copyProps(boxData, box, commonProps);

        if (boxData.hasOwnProperty('_incomplete')) {
            box.isComplete = !boxData._incomplete;
        }

        switch (box.type) {
            case 'sidx':
                copyProps(boxData, box, sidxProps);
                if (box.references) {
                    for (i = 0, ln = box.references.length; i < ln; i++) {
                        copyProps(boxData.references[i], box.references[i], sidxRefProps);
                    }
                }
                break;
            case 'emsg':
                copyProps(boxData, box, emsgProps);
                break;
            case 'mdhd':
                copyProps(boxData, box, mdhdProps);
                break;
            case 'mfhd':
                copyProps(boxData, box, mfhdProps);
                break;
            case 'tfhd':
                copyProps(boxData, box, tfhdProps);
                break;
            case 'tfdt':
                copyProps(boxData, box, tfdtProps);
                break;
            case 'trun':
                copyProps(boxData, box, trunProps);
                if (box.samples) {
                    for (i = 0, ln = box.samples.length; i < ln; i++) {
                        copyProps(boxData.samples[i], box.samples[i], trunSampleProps);
                    }
                }
                break;
        }

        return box;
    }

    instance = {
        getBox: getBox,
        getBoxes: getBoxes,
        setData: setData,
        getLastBox: getLastBox,
        getOffset: getOffset
    };

    setup();

    return instance;
}
IsoFile.__dashjs_factory_name = 'IsoFile';
export default FactoryMaker.getClassFactory(IsoFile);
