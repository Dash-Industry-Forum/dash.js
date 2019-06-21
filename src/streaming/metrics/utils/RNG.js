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

 /**
  * @ignore
  */
function RNG() {

    // check whether secure random numbers are available. if not, revert to
    // using Math.random
    let crypto = window.crypto || window.msCrypto;

    // could just as easily use any other array type by changing line below
    let ArrayType = Uint32Array;
    let MAX_VALUE = Math.pow(2, ArrayType.BYTES_PER_ELEMENT * 8) - 1;

    // currently there is only one client for this code, and that only uses
    // a single random number per initialisation. may want to increase this
    // number if more consumers in the future
    let NUM_RANDOM_NUMBERS = 10;

    let randomNumbers,
        index,
        instance;

    function initialise() {
        if (crypto) {
            if (!randomNumbers) {
                randomNumbers = new ArrayType(NUM_RANDOM_NUMBERS);
            }
            crypto.getRandomValues(randomNumbers);
            index = 0;
        }
    }

    function rand(min, max) {
        let r;

        if (!min) {
            min = 0;
        }

        if (!max) {
            max = 1;
        }

        if (crypto) {
            if (index === randomNumbers.length) {
                initialise();
            }

            r = randomNumbers[index] / MAX_VALUE;
            index += 1;
        } else {
            r = Math.random();
        }

        return (r * (max - min)) + min;
    }

    instance = {
        random: rand
    };

    initialise();

    return instance;
}

RNG.__dashjs_factory_name = 'RNG';
export default dashjs.FactoryMaker.getSingletonFactory(RNG); /* jshint ignore:line */
