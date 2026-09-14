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

import LearningAbrController from '../../../../src/streaming/rules/abr/lolp/LearningAbrController.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('LearningAbrController', function () {
    const representations = [500000, 1000000, 2000000].map((bandwidth, index) => ({
        id: String(index),
        bandwidth
    }));
    const mediaInfo = { type: 'video' };
    const abrController = { getPossibleVoRepresentationsFilteredBySettings: () => representations };
    let controller;
    let selector;
    let randomStub;

    beforeEach(function () {
        // Keep the initial learning weights reproducible.
        randomStub = sinon.stub(Math, 'random').returns(0.5);
        controller = LearningAbrController({}).create();
        selector = {
            getSegmentDuration: () => 1,
            getMinBuffer: () => 0.3,
            getNextBufferWithBitrate: () => 5,
            findWeightVector: sinon.stub().returns([0.2, 1, 1, 1])
        };
    });

    afterEach(function () {
        randomStub.restore();
    });

    it('uses the dynamic selector as throughput changes', function () {
        const high = controller.getNextQuality(abrController, mediaInfo, 2500000, 1.5, 5, 1, representations[2], selector);
        const lower = controller.getNextQuality(abrController, mediaInfo, 1200000, 1.5, 5, 1, high, selector);

        expect(high).to.equal(representations[2]);
        expect(lower).to.equal(representations[1]);
        sinon.assert.calledTwice(selector.findWeightVector);
        expect(selector.findWeightVector.firstCall.args.slice(1)).to.deep.equal([1.5, 5, 0, 2500000, 1]);
        expect(selector.findWeightVector.secondCall.args.slice(1)).to.deep.equal([1.5, 5, 0, 1200000, 1]);
    });

    it('downshifts before selecting weights when the buffer is low', function () {
        const result = controller.getNextQuality(abrController, mediaInfo, 1200000, 1.5, 0.2, 1, representations[2], selector);

        expect(result).to.equal(representations[1]);
        sinon.assert.notCalled(selector.findWeightVector);
    });

    [null, -1].forEach((unavailableWeights) => {
        it(`uses initial weights when the dynamic selector returns ${unavailableWeights}`, function () {
            selector.findWeightVector.returns(unavailableWeights);

            const result = controller.getNextQuality(abrController, mediaInfo, 2500000, 1.5, 5, 1, representations[1], selector);

            expect(result).to.equal(representations[2]);
            sinon.assert.calledOnce(selector.findWeightVector);
        });
    });
});
