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

import FactoryMaker from '../../core/FactoryMaker';

const NO_CHANGE = -1;
const PRIORITY = {
    DEFAULT: 0.5,
    STRONG: 1,
    WEAK: 0
};

function SwitchRequest(q, r, p) {
    //TODO refactor all the calls to this to use config to be like everything else.
    let instance,
        quality,
        priority,
        reason;

    // check priority value
    function getPriority(p) {
        let ret = PRIORITY.DEFAULT;

        // check that p is one of declared priority value
        if (p === PRIORITY.DEFAULT || p === PRIORITY.STRONG || p === PRIORITY.WEAK) {
            ret = p;
        }
        return ret;
    }

    // init attributes
    quality = (q === undefined) ? NO_CHANGE : q;
    priority = getPriority(p);
    reason = (r === undefined) ? null : r;

    instance = {
        quality: quality,
        reason: reason,
        priority: priority
    };

    return instance;
}

SwitchRequest.__dashjs_factory_name = 'SwitchRequest';
const factory = FactoryMaker.getClassFactory(SwitchRequest);
factory.NO_CHANGE = NO_CHANGE;
factory.PRIORITY = PRIORITY;
FactoryMaker.updateClassFactory(SwitchRequest.__dashjs_factory_name, factory);

export default factory;
